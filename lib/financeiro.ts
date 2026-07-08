import { prisma } from "@/lib/prisma";
import { createFaturaPaymentLink, buscarPagamentoMP } from "@/lib/mercadopago";
import { sendFaturaEnviada, sendFaturaPaga } from "@/lib/email";
import { formatBRL, formatDate } from "@/lib/format";

async function gerarNumeroFatura(ano: number): Promise<string> {
  const total = await prisma.fatura.count({
    where: { numero: { startsWith: `FAT-${ano}-` } },
  });
  return `FAT-${ano}-${String(total + 1).padStart(4, "0")}`;
}

export async function gerarFaturasDoPeriodo(periodoInicio: Date, periodoFim: Date) {
  const pedidosNaoFaturados = await prisma.pedido.findMany({
    where: {
      faturaId: null,
      status: { in: ["ENVIADO", "ENTREGUE"] },
      createdAt: { gte: periodoInicio, lte: periodoFim },
    },
  });

  const porLojista = new Map<string, typeof pedidosNaoFaturados>();
  for (const pedido of pedidosNaoFaturados) {
    const lista = porLojista.get(pedido.lojistaId) ?? [];
    lista.push(pedido);
    porLojista.set(pedido.lojistaId, lista);
  }

  const ano = new Date().getFullYear();
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 7);

  const faturas = [];
  for (const [lojistaId, pedidos] of porLojista) {
    const valorTotal = pedidos.reduce((sum, p) => sum + Number(p.valorCusto), 0);
    const numero = await gerarNumeroFatura(ano);

    const fatura = await prisma.$transaction(async (tx) => {
      const nova = await tx.fatura.create({
        data: {
          lojistaId,
          numero,
          periodoInicio,
          periodoFim,
          totalPedidos: pedidos.length,
          valorTotal,
          vencimento,
        },
      });

      await tx.pedido.updateMany({
        where: { id: { in: pedidos.map((p) => p.id) } },
        data: { faturaId: nova.id },
      });

      return nova;
    });

    faturas.push(fatura);
  }

  return faturas;
}

// Gera o link de pagamento MP (best-effort), salva na fatura, marca ENVIADA
// e dispara o email com o link. Usado pelo botão manual do admin e pelo cron quinzenal.
//
// Antes de cobrar via MP, abate o saldo de crédito do lojista (de devoluções
// reembolsadas) — se o crédito cobre o valor total, a fatura é paga sem nenhuma
// cobrança real; se cobre só parte, o link do MP é gerado apenas pela diferença.
export async function enviarFatura(faturaId: string) {
  const fatura = await prisma.fatura.findUniqueOrThrow({
    where: { id: faturaId },
    include: { lojista: { include: { user: true } } },
  });

  const valorTotal = Number(fatura.valorTotal);
  const saldoDisponivel = Number(fatura.lojista.saldoCredito);
  const creditoAplicado = Math.min(valorTotal, saldoDisponivel);
  const valorRestante = valorTotal - creditoAplicado;

  if (creditoAplicado > 0) {
    await prisma.lojista.update({
      where: { id: fatura.lojistaId },
      data: { saldoCredito: { decrement: creditoAplicado } },
    });
  }

  if (valorRestante <= 0) {
    const paga = await prisma.fatura.update({
      where: { id: faturaId },
      data: { status: "PAGA", pago: true, pagoEm: new Date(), creditoAplicado },
      include: { lojista: { include: { user: true } } },
    });
    await sendFaturaPaga({
      email: paga.lojista.user.email,
      numero: paga.numero,
      valorTotal: formatBRL(paga.valorTotal.toString()),
    });
    return paga;
  }

  const linkPagamento = await createFaturaPaymentLink(fatura, valorRestante);

  const atualizada = await prisma.fatura.update({
    where: { id: faturaId },
    data: { status: "ENVIADA", mpPaymentLink: linkPagamento, creditoAplicado },
    include: { lojista: { include: { user: true } } },
  });

  await sendFaturaEnviada({
    email: atualizada.lojista.user.email,
    numero: atualizada.numero,
    valorTotal: formatBRL(valorRestante.toString()),
    vencimento: formatDate(atualizada.vencimento),
    linkPagamento: linkPagamento ?? undefined,
  });

  return atualizada;
}

// Chamado pelo webhook do Mercado Pago quando um pagamento de assinatura
// (teste/30 dias) é aprovado — estende acessoExpiraEm a partir de hoje ou do
// vencimento atual, o que for mais tarde (não perde dias já pagos).
export async function confirmarPagamentoAssinatura(lojistaId: string): Promise<void> {
  const lojista = await prisma.lojista.findUnique({ where: { id: lojistaId } });
  if (!lojista) return;

  const base = lojista.acessoExpiraEm && lojista.acessoExpiraEm > new Date()
    ? lojista.acessoExpiraEm
    : new Date();
  const novaExpiracao = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.lojista.update({
    where: { id: lojistaId },
    data: { acessoExpiraEm: novaExpiracao },
  });
}

// Chamado pelo webhook do Mercado Pago quando um pagamento é aprovado.
export async function confirmarPagamentoFatura(paymentId: string): Promise<void> {
  const payment = await buscarPagamentoMP(paymentId);
  if (!payment || payment.status !== "approved") return;

  const faturaId = payment.external_reference;
  if (!faturaId) return;

  const fatura = await prisma.fatura
    .update({
      where: { id: faturaId },
      data: { status: "PAGA", pago: true, pagoEm: new Date(), mpPaymentId: String(payment.id) },
      include: { lojista: { include: { user: true } } },
    })
    .catch(() => null);
  if (!fatura) return;

  await sendFaturaPaga({
    email: fatura.lojista.user.email,
    numero: fatura.numero,
    valorTotal: formatBRL(fatura.valorTotal.toString()),
  });
}

// Quinzena vigente: dias 1-15 ou 16-fim do mês, a partir da data de hoje.
function periodoQuinzenalAtual(): { periodoInicio: Date; periodoFim: Date } {
  const hoje = new Date();
  const dia = hoje.getDate();

  if (dia <= 15) {
    return {
      periodoInicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1),
      periodoFim: new Date(hoje.getFullYear(), hoje.getMonth(), 15, 23, 59, 59),
    };
  }

  const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  return {
    periodoInicio: new Date(hoje.getFullYear(), hoje.getMonth(), 16),
    periodoFim: new Date(hoje.getFullYear(), hoje.getMonth(), ultimoDia, 23, 59, 59),
  };
}

// Geração automática quinzenal (dias 1 e 16) — gera as faturas da quinzena
// vigente e já envia (link MP + email) cada uma. Usado pelo cron e pelo botão manual.
export async function executarGeracaoQuinzenal() {
  const { periodoInicio, periodoFim } = periodoQuinzenalAtual();
  const faturas = await gerarFaturasDoPeriodo(periodoInicio, periodoFim);

  const enviadas = [];
  for (const fatura of faturas) {
    enviadas.push(await enviarFatura(fatura.id));
  }

  return enviadas;
}

export async function getFinanceiroResumo() {
  const [aReceber, recebidoEsteMes, inadimplentes] = await Promise.all([
    prisma.fatura.aggregate({
      where: { status: { in: ["PENDENTE", "ENVIADA"] } },
      _sum: { valorTotal: true },
    }),
    prisma.fatura.aggregate({
      where: {
        status: "PAGA",
        pagoEm: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { valorTotal: true },
    }),
    prisma.fatura.count({ where: { status: "VENCIDA" } }),
  ]);

  return {
    aReceber: Number(aReceber._sum.valorTotal ?? 0),
    recebidoEsteMes: Number(recebidoEsteMes._sum.valorTotal ?? 0),
    inadimplentes,
  };
}
