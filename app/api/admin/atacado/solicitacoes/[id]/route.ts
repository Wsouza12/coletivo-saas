import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { abrirCaixaWhatsapp } from "@/lib/atacado";
import { enviarMensagemGrupo } from "@/lib/evolution";
import { getConfiguracaoFinanceira, calcularPrecoAtacado } from "@/lib/configuracao-financeira";

const patchSchema = z.object({
  status: z.enum(["APROVADA", "REJEITADA"]),
  variacaoId: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  const { status, variacaoId } = parsed.data;

  const solicitacao = await prisma.solicitacaoAberturaCaixa.findUnique({
    where: { id },
    include: { produtoAtacado: true },
  });

  if (!solicitacao) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  if (solicitacao.status !== "PENDENTE") return NextResponse.json({ error: { code: "INVALID_STATUS" } }, { status: 400 });

  if (status === "REJEITADA") {
    const updated = await prisma.solicitacaoAberturaCaixa.update({
      where: { id },
      data: { status: "REJEITADA" },
    });
    return NextResponse.json({ data: updated });
  }

  // Aprovada: cria a caixa
  const config = await getConfiguracaoFinanceira();
  
  // Pegar slug único
  let slugBase = solicitacao.produtoAtacado.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
  let slug = slugBase;
  let attempt = 1;
  while (await prisma.rodadaAtacado.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${attempt}`;
    attempt++;
  }

  const precoFinalUnitario = calcularPrecoAtacado(
    Number(solicitacao.produtoAtacado.custoUnitario),
    0, // margem padrao 0 no atacado, ganho na taxa de servico
    Number(config.taxaServicoPadraoAtacado) // Usa taxa como margem operacional
  );

  const rodada = await prisma.rodadaAtacado.create({
    data: {
      produtoAtacadoId: solicitacao.produtoAtacado.id,
      slug,
      metaUnidades: solicitacao.produtoAtacado.unidadesPorCaixa,
      custoUnitario: solicitacao.produtoAtacado.custoUnitario,
      taxaServicoPercentual: config.taxaServicoPadraoAtacado,
      precoFinalUnitario,
      minimoUnidadesPorReserva: 1, // default
      unidadesReservadasLoja: solicitacao.produtoAtacado.reservaLojaPadrao || 0,
      loopAtivo: false,
      variacaoId: variacaoId || undefined,
    },
  });

  // Atualiza solicitação
  const updated = await prisma.solicitacaoAberturaCaixa.update({
    where: { id },
    data: { status: "APROVADA", rodadaId: rodada.id },
  });

  // Tenta abrir a caixa no grupo da solicitação
  try {
    await abrirCaixaWhatsapp(rodada.id, solicitacao.grupoJid);
    // Notifica o comprador com mention no grupo
    const msgConfirmacao = `🎉 @${solicitacao.compradorNumero.split("@")[0]} a caixa do produto que você solicitou acabou de ser aberta! Bora garantir suas unidades.`;
    await enviarMensagemGrupo(solicitacao.grupoJid, msgConfirmacao, undefined, [solicitacao.compradorJid]);
  } catch (err) {
    console.error("Erro ao abrir caixa no WhatsApp da solicitação:", err);
  }

  return NextResponse.json({ data: updated });
}
