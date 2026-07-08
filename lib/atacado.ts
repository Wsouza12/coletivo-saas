import { prisma } from "@/lib/prisma";
import { calcularFreteMelhorEnvio } from "@/lib/melhor-envio";
import { createAssinaturaAtacadoPix, createReservaAtacadoPix } from "@/lib/mercadopago";
import { getConfiguracaoFinanceira } from "@/lib/configuracao-financeira";
import { enviarMensagemGrupo, enviarImagemGrupo, enviarImagemIndividual, enviarMensagemIndividual } from "./evolution";
import { GET as getBanner } from "@/app/api/atacado/banner/[id]/route";
import type { AssinaturaAtacadoStatus, Prisma, RodadaAtacado, ProdutoAtacado, RodadaAtacadoStatus } from "@prisma/client";

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || "";
  if (url && !url.includes("localhost") && !url.includes("127.0.0.1")) {
    return url.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

// Preço final = custo + taxa de serviço embutida (sem frete, que é calculado
// separadamente por CEP no checkout e somado depois).
// taxaServicoPercentual vem sempre explícita (da rodada ou do default da
// config) — sem fallback fixo aqui, pra não desalinhar do que é configurável
// em Configurações → Financeiro.
export function calcularPrecoFinalRodada(custoUnitario: number, taxaServicoPercentual: number): number {
  return Math.round(custoUnitario * (1 + taxaServicoPercentual / 100) * 100) / 100;
}

// Quando o admin reserva R unidades da caixa (total M) pra própria loja, o custo
// dessas unidades é diluído nas (M − R) unidades do coletivo: custo efetivo por
// unidade vendida = custo × M / (M − R). O preço final aplica a taxa em cima
// disso. Retorna também a meta do coletivo (M − R). Sem reserva (R=0) é igual ao
// cálculo normal.
export function calcularRodadaComReservaLoja(params: {
  custoUnitario: number;
  taxaServicoPercentual: number;
  metaTotal: number;
  unidadesReservadasLoja: number;
}): { metaColetivo: number; precoFinalUnitario: number } {
  const { custoUnitario, taxaServicoPercentual, metaTotal, unidadesReservadasLoja } = params;
  const metaColetivo = metaTotal - unidadesReservadasLoja;
  if (unidadesReservadasLoja <= 0 || metaColetivo <= 0) {
    return {
      metaColetivo: metaTotal,
      precoFinalUnitario: calcularPrecoFinalRodada(custoUnitario, taxaServicoPercentual),
    };
  }
  const custoDiluido = (custoUnitario * metaTotal) / metaColetivo;
  return {
    metaColetivo,
    precoFinalUnitario: calcularPrecoFinalRodada(custoDiluido, taxaServicoPercentual),
  };
}

// Sem login: identifica o comprador pelo CPF/CNPJ. Sem assinatura nenhuma,
// nunca houve cadastro — null. Vencida ou cancelada, status reflete isso.
export async function verificarAssinatura(
  compradorDoc: string
): Promise<{ ativa: boolean; assinaturaId: string | null; status: AssinaturaAtacadoStatus | null }> {
  const assinatura = await prisma.assinaturaAtacado.findUnique({ where: { compradorDoc } });
  if (!assinatura) return { ativa: false, assinaturaId: null, status: null };

  const ativa = assinatura.status === "ATIVA" && assinatura.vencimento > new Date();
  return { ativa, assinaturaId: assinatura.id, status: assinatura.status };
}

// Cria (ou reaproveita, se ainda não paga) a assinatura e gera uma cobrança
// Pix direta (QR Code, sem redirecionar pro checkout hospedado do MP).
// Idempotente por compradorDoc — não duplica cobrança se o comprador tentar
// de novo antes de pagar a primeira (gera um novo QR a cada chamada, mas
// sempre pro mesmo registro de assinatura).
export async function iniciarAssinatura(dados: {
  compradorNome: string;
  compradorDoc: string;
  compradorEmail: string;
  compradorTelefone: string;
}): Promise<{ assinaturaId: string; paymentId: string | null; qrCode: string | null; qrCodeBase64: string | null; valor: number }> {
  const existente = await prisma.assinaturaAtacado.findUnique({
    where: { compradorDoc: dados.compradorDoc },
  });

  const assinatura = existente
    ? await prisma.assinaturaAtacado.update({
        where: { id: existente.id },
        data: {
          compradorNome: dados.compradorNome,
          compradorEmail: dados.compradorEmail,
          compradorTelefone: dados.compradorTelefone,
          // Sem isso, uma assinatura pendente criada antes de uma mudança no
          // valor padrão (Configurações → Financeiro) ficaria cobrando o
          // valor antigo pra sempre, mesmo gerando um Pix novo.
          ...(existente.status !== "ATIVA"
            ? { valor: (await getConfiguracaoFinanceira()).valorAssinaturaAtacado }
            : {}),
        },
      })
    : await prisma.assinaturaAtacado.create({
        data: {
          ...dados,
          valor: (await getConfiguracaoFinanceira()).valorAssinaturaAtacado,
          vencimento: new Date(), // vencida até confirmar o primeiro pagamento
        },
      });

  const pix = await createAssinaturaAtacadoPix(assinatura);
  if (pix) {
    await prisma.assinaturaAtacado.update({
      where: { id: assinatura.id },
      data: { mpPaymentId: pix.paymentId, mpQrCode: pix.qrCode, mpQrCodeBase64: pix.qrCodeBase64 },
    });
  }

  return {
    assinaturaId: assinatura.id,
    paymentId: pix?.paymentId ?? null,
    qrCode: pix?.qrCode ?? null,
    qrCodeBase64: pix?.qrCodeBase64 ?? null,
    valor: Number(assinatura.valor),
  };
}

// Chamado pelo webhook do MP quando o pagamento da assinatura é aprovado —
// estende 30 dias a partir do maior entre "agora" e o vencimento atual (mesma
// lógica já usada pra assinatura de lojista em lib/financeiro.ts).
export async function confirmarPagamentoAssinaturaAtacado(assinaturaId: string): Promise<void> {
  const assinatura = await prisma.assinaturaAtacado.findUnique({ where: { id: assinaturaId } });
  if (!assinatura) return;

  const base = assinatura.vencimento > new Date() ? assinatura.vencimento : new Date();
  const novoVencimento = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.assinaturaAtacado.update({
    where: { id: assinaturaId },
    data: { status: "ATIVA", vencimento: novoVencimento },
  });
}

export type OpcaoFreteCheckout = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  prazoDias: number;
  recomendado: boolean;
};

const RETIRADA_ID = "retirada";

// Traduz o nome técnico do serviço da transportadora pra uma descrição curta
// que faz sentido pro cliente final (que não sabe o que é ".Package" etc).
function descreverServicoFrete(servico: string): string {
  const s = servico.toLowerCase();
  if (s.includes("centralizado")) return "Envio econômico via ponto de coleta";
  if (s.includes("package") || s.includes("econômico") || s.includes("economico")) return "Envio econômico";
  if (s.includes("express") || s.includes("expresso")) return "Envio expresso";
  if (s.includes("rodoviário") || s.includes("rodoviario")) return "Envio rodoviário";
  if (s.includes("standard") || s.includes("padrão") || s.includes("padrao")) return "Envio padrão";
  return "Envio pela transportadora";
}

// Lista as opções de frete pra exibir no checkout: retirada local (grátis,
// combinada por fora) + as 3 mais baratas reais da Melhor Envio pro CEP
// informado. O cliente escolhe uma; o preço de cada uma é recalculado de novo
// (não confiamos no que o client manda) na hora de criar a reserva de verdade.
export async function listarOpcoesFrete(params: {
  produtoAtacadoId: string;
  cepDestino: string;
  quantidade: number;
}): Promise<OpcaoFreteCheckout[]> {
  const [produto, config] = await Promise.all([
    prisma.produtoAtacado.findUniqueOrThrow({ where: { id: params.produtoAtacadoId } }),
    prisma.configuracaoFinanceira.findUnique({ where: { id: "default" } }),
  ]);

  if (!config?.cepOrigem) {
    throw new Error("CEP de origem não configurado em Configurações Financeiras");
  }

  const opcoesTransportadora = await calcularFreteMelhorEnvio({
    cepOrigem: config.cepOrigem,
    cepDestino: params.cepDestino,
    pesoKg: Number(produto.pesoKg) * params.quantidade,
    comprimentoCm: produto.comprimentoCm,
    larguraCm: produto.larguraCm,
    alturaCm: produto.alturaCm,
  });

  const retirada: OpcaoFreteCheckout = {
    id: RETIRADA_ID,
    nome: "Retirada combinada por WhatsApp",
    descricao: "Você combina o local e horário direto comigo",
    preco: 0,
    prazoDias: 0,
    recomendado: true,
  };

  const margemSegurancaFrete = 1 + Number(config?.margemSegurancaFrete ?? 12) / 100;

  return [
    retirada,
    ...opcoesTransportadora.slice(0, 3).map((o) => ({
      id: String(o.servicoId),
      nome: o.transportadora,
      descricao: descreverServicoFrete(o.servico),
      preco: Math.round(o.preco * margemSegurancaFrete * 100) / 100,
      prazoDias: o.prazoDias,
      recomendado: false,
    })),
  ];
}

// Resolve de novo (server-side, sem confiar no preço que o client mandou) a
// opção de frete escolhida — usada só internamente por criarReserva.
async function resolverOpcaoFrete(params: {
  produtoAtacadoId: string;
  cepDestino: string;
  quantidade: number;
  opcaoFreteId: string;
}): Promise<{ preco: number; nome: string }> {
  if (params.opcaoFreteId === RETIRADA_ID) {
    return { preco: 0, nome: "Retirada combinada por WhatsApp" };
  }

  const opcoes = await listarOpcoesFrete(params);
  const escolhida = opcoes.find((o) => o.id === params.opcaoFreteId);
  if (!escolhida) {
    throw new Error("Opção de frete inválida ou indisponível pra esse CEP");
  }
  // Guarda nome + descrição juntos no registro interno (uso do admin no
  // fulfillment) — a UI do cliente mostra os dois campos separados.
  return { preco: escolhida.preco, nome: `${escolhida.nome} — ${escolhida.descricao}` };
}

// Cria a reserva (bloqueada por assinatura ativa, checada antes de chamar isto
// na rota) e gera a cobrança Pix direta com o detalhamento produto+taxa+frete.
export async function calcularProgressoFornecedor(fornecedorId: string): Promise<{
  valorAcumulado: number;
  pedidoMinimoValor: number | null;
  percentual: number;
}> {
  const fornecedor = await prisma.fornecedorAtacado.findUniqueOrThrow({
    where: { id: fornecedorId },
    select: { pedidoMinimoValor: true, usarModeloMinimo: true },
  });
  if (!fornecedor.usarModeloMinimo || !fornecedor.pedidoMinimoValor) {
    return { valorAcumulado: 0, pedidoMinimoValor: null, percentual: 0 };
  }

  // Soma o valorTotal de todas as reservas PAGAS de rodadas ABERTAS deste fornecedor
  const resultado = await prisma.reservaAtacado.aggregate({
    where: {
      status: "PAGO",
      rodada: { status: "ABERTA", produtoAtacado: { fornecedorId } },
    },
    _sum: { valorTotal: true },
  });
  const valorAcumulado = Number(resultado._sum.valorTotal ?? 0);
  const meta = Number(fornecedor.pedidoMinimoValor);
  return {
    valorAcumulado,
    pedidoMinimoValor: meta,
    percentual: Math.min(100, Math.round((valorAcumulado / meta) * 100)),
  };
}

export async function criarReserva(dados: {
  rodadaId: string;
  assinaturaId?: string;
  quantidade?: number;
  variacoes?: { variacaoId: string; quantidade: number; corId?: string }[];
  compradorNome: string;
  compradorDoc: string;
  compradorEmail: string;
  compradorTelefone: string;
  cep: string;
  enderecoEntrega: Prisma.InputJsonValue;
  opcaoFreteId: string;
  origem?: string;
}): Promise<{
  reservaId: string;
  paymentId: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  valorTotal: number;
}> {
  const rodada = await prisma.rodadaAtacado.findUniqueOrThrow({
    where: { id: dados.rodadaId },
    include: { produtoAtacado: true },
  });

  if (rodada.status !== "ABERTA") {
    throw new Error("Essa rodada não está mais aberta para reservas");
  }

  // Quantidade efetiva: soma das variações ou quantidade direta
  const quantidade =
    dados.variacoes && dados.variacoes.length > 0
      ? dados.variacoes.reduce((acc, v) => acc + v.quantidade, 0)
      : (dados.quantidade ?? 1);

  const unidadesRestantes = rodada.metaUnidades - rodada.unidadesReservadas;
  if (quantidade > unidadesRestantes) {
    throw new Error(`Só restam ${unidadesRestantes} unidade(s) nessa caixa`);
  }
  // O mínimo não pode travar a venda das últimas unidades — se restar menos que o
  // mínimo configurado, o mínimo real passa a ser o que sobrou na caixa.
  const minimoReal = Math.min(rodada.minimoUnidadesPorReserva, unidadesRestantes);
  if (quantidade < minimoReal) {
    throw new Error(`Reserva mínima nessa caixa é de ${minimoReal} unidade(s)`);
  }

  const opcaoFrete = await resolverOpcaoFrete({
    produtoAtacadoId: rodada.produtoAtacadoId,
    cepDestino: dados.cep,
    quantidade,
    opcaoFreteId: dados.opcaoFreteId,
  });

  const valorProduto = Number(rodada.custoUnitario) * quantidade;
  const valorTaxaServico =
    (Number(rodada.custoUnitario) * (Number(rodada.taxaServicoPercentual) / 100)) * quantidade;
  const valorTotal = valorProduto + valorTaxaServico + opcaoFrete.preco;

  const reserva = await prisma.reservaAtacado.create({
    data: {
      rodadaId: dados.rodadaId,
      assinaturaId: dados.assinaturaId,
      quantidade,
      variacoes: dados.variacoes ? dados.variacoes : undefined,
      compradorNome: dados.compradorNome,
      compradorDoc: dados.compradorDoc,
      compradorEmail: dados.compradorEmail,
      compradorTelefone: dados.compradorTelefone,
      cep: dados.cep,
      enderecoEntrega: dados.enderecoEntrega,
      valorProduto,
      valorTaxaServico,
      valorFrete: opcaoFrete.preco,
      metodoFrete: opcaoFrete.nome,
      valorTotal,
      origem: dados.origem ?? null,
    },
  });

  const pix = await createReservaAtacadoPix(reserva, rodada.produtoAtacado.nome);
  if (pix) {
    await prisma.reservaAtacado.update({
      where: { id: reserva.id },
      data: { mpPaymentId: pix.paymentId, mpQrCode: pix.qrCode, mpQrCodeBase64: pix.qrCodeBase64 },
    });

    try {
      const ddiTelefone = dados.compradorTelefone.replace(/\D/g, "");
      const numeroWpp = ddiTelefone.startsWith("55") ? ddiTelefone : `55${ddiTelefone}`;
      const textoPix = [
        `🛒 *Reserva Iniciada!*`,
        `Produto: ${rodada.produtoAtacado.nome}`,
        `Quantidade: ${dados.quantidade}un`,
        ``,
        `⚠️ *Sua reserva só será garantida no sistema após o pagamento.*`,
        `Copie a chave PIX abaixo para pagar:`,
        ``,
        pix.qrCode
      ].join("\n");
      await enviarMensagemIndividual(numeroWpp, textoPix);
    } catch (e) {
      console.error("Falha ao enviar PIX pro WhatsApp do cliente:", e);
    }
  }

  return {
    reservaId: reserva.id,
    paymentId: pix?.paymentId ?? null,
    qrCode: pix?.qrCode ?? null,
    qrCodeBase64: pix?.qrCodeBase64 ?? null,
    valorTotal,
  };
}

// Chamado pelo webhook do MP quando o pagamento de uma reserva é aprovado.
// Se a rodada bateu a meta, fecha automaticamente — não aceita reserva nova
// depois disso.
export async function confirmarPagamentoReserva(reservaId: string): Promise<void> {
  const reserva = await prisma.reservaAtacado.findUnique({
    where: { id: reservaId },
    include: { rodada: true },
  });
  if (!reserva) return;

  await prisma.reservaAtacado.update({ where: { id: reservaId }, data: { status: "PAGO" } });

  let codigoRastreio: string | undefined = undefined;
  const rodadaAtualizada = await prisma.rodadaAtacado.update({
    where: { id: reserva.rodadaId },
    data: { unidadesReservadas: { increment: reserva.quantidade } },
  });

  const fechou = rodadaAtualizada.unidadesReservadas >= rodadaAtualizada.metaUnidades;
  if (fechou) {
    codigoRastreio = await gerarCodigoRastreioUnico();
    await prisma.rodadaAtacado.update({ 
      where: { id: reserva.rodadaId }, 
      data: { status: "FECHADA", codigoRastreio } 
    });
  }

  // Best-effort: se a caixa já foi aberta no grupo, avisa o progresso (ou o
  // fechamento) — nunca trava a confirmação do pagamento se o WhatsApp falhar.
  if (reserva.rodada.grupoIdUsado) {
    try {
      if (fechou) {
        await notificarFechamentoCaixa(reserva.rodadaId);
      } else {
        await notificarProgressoCaixa(reserva.rodadaId);
      }
    } catch (err) {
      console.error("Falha ao avisar grupo de WhatsApp sobre reserva:", err);
    }
  }

  // 1:1 pro comprador — confirma a reserva dele especificamente, com o banner
  // do produto e quantas unidades ele garantiu. Best-effort: nunca trava a
  // confirmação do pagamento se o WhatsApp falhar.
  try {
    let bannerUrl = `${getAppUrl()}/api/atacado/banner/${reserva.rodadaId}`;
    if (bannerUrl.includes("localhost") || bannerUrl.includes("127.0.0.1")) {
      const prod = await prisma.produtoAtacado.findUnique({
        where: { id: reserva.rodada.produtoAtacadoId },
        select: { imagemUrl: true }
      });
      if (prod?.imagemUrl) bannerUrl = prod.imagemUrl;
    }
    const texto = [
      "✅ *Pagamento confirmado!*",
      "",
      `Você reservou *${reserva.quantidade} unidade(s)*.`,
      `Caixa: ${reserva.rodada.unidadesReservadas}/${reserva.rodada.metaUnidades}un (${Math.round(
        (reserva.rodada.unidadesReservadas / reserva.rodada.metaUnidades) * 100
      )}%).`,
      "",
      fechou
        ? "A caixa fechou! Agora é só aguardar a separação e o envio — você recebe uma mensagem a cada etapa."
        : "Assim que a caixa fechar, você recebe uma mensagem a cada etapa (separação, embalagem, envio).",
    ].join("\n");
    await enviarImagemIndividual(reserva.compradorTelefone, bannerUrl, texto);
  } catch (err) {
    console.error(`Falha ao notificar comprador ${reserva.compradorTelefone} sobre pagamento:`, err);
  }
}

// Reserva manual do admin (prova social) — sem Pix. Só nome + quantidade.
// Cria a reserva já PAGA, soma no progresso, fecha a caixa se bater a meta e
// posta o progresso no grupo (com o nome, não @menção). Não envia 1:1.
export async function criarReservaManual(dados: {
  rodadaId: string;
  compradorNome: string;
  quantidade: number;
}): Promise<{ reservaId: string; fechou: boolean }> {
  const rodada = await prisma.rodadaAtacado.findUniqueOrThrow({ where: { id: dados.rodadaId } });
  if (rodada.status !== "ABERTA") throw new Error("Essa rodada não está mais aberta para reservas");

  const quantidade = Math.floor(dados.quantidade);
  if (!quantidade || quantidade < 1) throw new Error("Quantidade inválida");

  const unidadesRestantes = rodada.metaUnidades - rodada.unidadesReservadas;
  if (quantidade > unidadesRestantes) throw new Error(`Só restam ${unidadesRestantes} unidade(s) nessa caixa`);

  // Campos obrigatórios preenchidos com placeholders internos (telefone vazio =
  // reserva manual, exibida pelo nome no grupo).
  const reserva = await prisma.reservaAtacado.create({
    data: {
      rodadaId: dados.rodadaId,
      quantidade,
      compradorNome: dados.compradorNome.trim(),
      compradorDoc: "",
      compradorEmail: "",
      compradorTelefone: "",
      cep: "-",
      enderecoEntrega: {},
      valorProduto: 0,
      valorTaxaServico: 0,
      valorFrete: 0,
      valorTotal: 0,
      metodoFrete: "Reserva manual (admin)",
      status: "PAGO",
    },
  });

  const rodadaAtualizada = await prisma.rodadaAtacado.update({
    where: { id: dados.rodadaId },
    data: { unidadesReservadas: { increment: quantidade } },
  });

  const fechou = rodadaAtualizada.unidadesReservadas >= rodadaAtualizada.metaUnidades;
  if (fechou) {
    const codigoRastreio = await gerarCodigoRastreioUnico();
    await prisma.rodadaAtacado.update({
      where: { id: dados.rodadaId },
      data: { status: "FECHADA", codigoRastreio },
    });
  }

  // Posta no grupo como se alguém tivesse comprado (best-effort)
  if (rodadaAtualizada.grupoIdUsado) {
    try {
      if (fechou) await notificarFechamentoCaixa(dados.rodadaId);
      else await notificarProgressoCaixa(dados.rodadaId);
    } catch (err) {
      console.error("Falha ao avisar grupo sobre reserva manual:", err);
    }
  }

  return { reservaId: reserva.id, fechou };
}

// Lista as reservas manuais (admin, sem telefone) de uma rodada — pra editar/remover.
export async function listarReservasManuais(rodadaId: string) {
  return prisma.reservaAtacado.findMany({
    where: { rodadaId, compradorTelefone: "", status: "PAGO" },
    select: { id: true, compradorNome: true, quantidade: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

// Reavalia abertura/fechamento após mexer no progresso. Só age quando a caixa
// está ABERTA ou FECHADA — nunca reabre uma caixa já em separação/envio.
async function reavaliarFechamentoRodada(rodadaId: string) {
  const r = await prisma.rodadaAtacado.findUniqueOrThrow({ where: { id: rodadaId } });
  if (r.status !== "ABERTA" && r.status !== "FECHADA") return r;
  const deveFechar = r.unidadesReservadas >= r.metaUnidades;
  if (deveFechar && r.status === "ABERTA") {
    const codigoRastreio = await gerarCodigoRastreioUnico();
    return prisma.rodadaAtacado.update({ where: { id: rodadaId }, data: { status: "FECHADA", codigoRastreio } });
  }
  if (!deveFechar && r.status === "FECHADA") {
    return prisma.rodadaAtacado.update({ where: { id: rodadaId }, data: { status: "ABERTA", codigoRastreio: null } });
  }
  return r;
}

async function notificarGrupoRodada(rodadaId: string, fechada: boolean) {
  const r = await prisma.rodadaAtacado.findUnique({ where: { id: rodadaId }, select: { grupoIdUsado: true } });
  if (!r?.grupoIdUsado) return;
  try {
    if (fechada) await notificarFechamentoCaixa(rodadaId);
    else await notificarProgressoCaixa(rodadaId);
  } catch (err) {
    console.error("Falha ao avisar grupo (reserva manual):", err);
  }
}

// Edita uma reserva manual (nome e/ou quantidade). Ajusta o progresso e reavalia
// o fechamento. Bloqueia se a caixa já saiu pra separação/envio.
export async function editarReservaManual(
  reservaId: string,
  dados: { compradorNome?: string; quantidade?: number }
): Promise<{ fechou: boolean }> {
  const reserva = await prisma.reservaAtacado.findUnique({ where: { id: reservaId }, include: { rodada: true } });
  if (!reserva || reserva.compradorTelefone !== "" || reserva.status !== "PAGO") {
    throw new Error("Reserva manual não encontrada");
  }
  if (reserva.rodada.status !== "ABERTA" && reserva.rodada.status !== "FECHADA") {
    throw new Error("A caixa já está em separação/envio — não dá pra editar");
  }

  const novaQtd = dados.quantidade != null ? Math.floor(dados.quantidade) : reserva.quantidade;
  if (novaQtd < 1) throw new Error("Quantidade inválida");
  const outros = reserva.rodada.unidadesReservadas - reserva.quantidade;
  if (outros + novaQtd > reserva.rodada.metaUnidades) {
    throw new Error(`Passa da meta — máximo ${reserva.rodada.metaUnidades - outros} un nessa reserva`);
  }
  const delta = novaQtd - reserva.quantidade;

  await prisma.reservaAtacado.update({
    where: { id: reservaId },
    data: {
      compradorNome: dados.compradorNome?.trim() || reserva.compradorNome,
      quantidade: novaQtd,
    },
  });
  if (delta !== 0) {
    await prisma.rodadaAtacado.update({ where: { id: reserva.rodadaId }, data: { unidadesReservadas: { increment: delta } } });
  }
  const rod = await reavaliarFechamentoRodada(reserva.rodadaId);
  await notificarGrupoRodada(reserva.rodadaId, rod.status === "FECHADA");
  return { fechou: rod.status === "FECHADA" };
}

// Remove (cancela) uma reserva manual: devolve as unidades ao progresso e reavalia.
export async function removerReservaManual(reservaId: string): Promise<{ reabriu: boolean }> {
  const reserva = await prisma.reservaAtacado.findUnique({ where: { id: reservaId }, include: { rodada: true } });
  if (!reserva || reserva.compradorTelefone !== "" || reserva.status !== "PAGO") {
    throw new Error("Reserva manual não encontrada");
  }
  if (reserva.rodada.status !== "ABERTA" && reserva.rodada.status !== "FECHADA") {
    throw new Error("A caixa já está em separação/envio — não dá pra remover");
  }

  await prisma.reservaAtacado.update({ where: { id: reservaId }, data: { status: "CANCELADO" } });
  await prisma.rodadaAtacado.update({
    where: { id: reserva.rodadaId },
    data: { unidadesReservadas: { decrement: reserva.quantidade } },
  });
  const antes = reserva.rodada.status;
  const rod = await reavaliarFechamentoRodada(reserva.rodadaId);
  await notificarGrupoRodada(reserva.rodadaId, rod.status === "FECHADA");
  return { reabriu: antes === "FECHADA" && rod.status === "ABERTA" };
}

const ETAPA_RODADA_MENSAGEM: Partial<Record<RodadaAtacadoStatus, { emoji: string; titulo: string }>> = {
  FECHADA: { emoji: "✅", titulo: "Sua caixa foi fechada com sucesso!" },
  SEPARANDO: { emoji: "📦", titulo: "Sua caixa está sendo separada" },
  EMBALANDO: { emoji: "📦", titulo: "Sua caixa está sendo embalada" },
  PRONTA_ENVIO: { emoji: "🚚", titulo: "Sua caixa está pronta para envio" },
  ENVIADA: { emoji: "🚀", titulo: "Sua caixa foi enviada" },
  CANCELADA: { emoji: "❌", titulo: "A compra coletiva foi cancelada" },
};

// Avança a etapa de fulfillment da rodada (caixa fechada) e notifica, 1:1, cada
// comprador com reserva paga — mesma lógica de "uma mensagem por etapa" já
// usada nos pedidos normais (EtapaPedido/PedidoStatus), só que em lote por
// caixa em vez de individual por pedido.
export async function gerarCodigoRastreioUnico(): Promise<string> {
  while (true) {
    const num = Math.floor(100000 + Math.random() * 900000);
    const codigo = `CX-${num}`;
    const existe = await prisma.rodadaAtacado.findUnique({
      where: { codigoRastreio: codigo }
    });
    if (!existe) return codigo;
  }
}

export async function avancarEtapaRodada(
  rodadaId: string, 
  novaEtapa: RodadaAtacadoStatus,
  envioData?: { envioCodigo?: string | null; envioLink?: string | null }
): Promise<void> {
  const checkRodada = await prisma.rodadaAtacado.findUniqueOrThrow({ where: { id: rodadaId } });

  const updateData: any = { status: novaEtapa };
  if ((novaEtapa === "FECHADA" || novaEtapa === "CANCELADA") && !checkRodada.codigoRastreio) {
    updateData.codigoRastreio = await gerarCodigoRastreioUnico();
  }
  if (envioData?.envioCodigo !== undefined) {
    updateData.envioCodigo = envioData.envioCodigo;
  }
  if (envioData?.envioLink !== undefined) {
    updateData.envioLink = envioData.envioLink;
  }

  const rodada = await prisma.rodadaAtacado.update({
    where: { id: rodadaId },
    data: updateData,
    include: { produtoAtacado: true },
  });

  // Notifica o fechamento no grupo caso tenha sido fechada manualmente agora
  if (novaEtapa === "FECHADA" && checkRodada.status === "ABERTA" && rodada.grupoIdUsado) {
    try {
      await notificarFechamentoCaixa(rodadaId);
    } catch (err) {
      console.error("Falha ao notificar fechamento manual no grupo:", err);
    }
  }

  const msg = ETAPA_RODADA_MENSAGEM[novaEtapa];
  if (!msg) return;

  const reservasPagas = await prisma.reservaAtacado.findMany({
    where: { rodadaId, status: "PAGO" },
    select: { compradorTelefone: true, quantidade: true },
  });
  if (reservasPagas.length === 0) return;

  let bannerUrl = `${getAppUrl()}/api/atacado/banner/${rodadaId}`;
  if (novaEtapa === "FECHADA" || novaEtapa === "CANCELADA") {
    bannerUrl = `${getAppUrl()}/api/atacado/banner/${rodadaId}?status=${novaEtapa}&t=${Date.now()}`;
  }
  if ((bannerUrl.includes("localhost") || bannerUrl.includes("127.0.0.1")) && rodada.produtoAtacado.imagemUrl) {
    bannerUrl = rodada.produtoAtacado.imagemUrl;
  }

  const linkRastreio = `${getAppUrl()}/r/rastreio/${rodada.codigoRastreio || ""}`;

  await Promise.all(
    reservasPagas.map(async (r) => {
      try {
        const labelLink = novaEtapa === "CANCELADA" ? "Veja os detalhes 👇" : "Acompanhe o envio 👇";
        const textoLinhas = [
          `${msg.emoji} *${msg.titulo}*`,
          "",
          `📦 ${rodada.produtoAtacado.nome}`,
          `Sua reserva: ${r.quantidade} un`,
        ];

        if (rodada.envioCodigo) {
          textoLinhas.push(`🚚 Rastreio Transportadora: *${rodada.envioCodigo}*`);
          if (rodada.envioLink) {
            textoLinhas.push(`🔗 Link para rastrear: ${rodada.envioLink}`);
          }
        }

        textoLinhas.push("");
        textoLinhas.push(labelLink);
        textoLinhas.push(linkRastreio);

        await enviarImagemIndividual(r.compradorTelefone, bannerUrl, textoLinhas.join("\n"));
      } catch (err) {
        console.error(`Falha ao notificar comprador ${r.compradorTelefone} sobre etapa ${novaEtapa}:`, err);
      }
    })
  );
}

// Dados (preço, und/caixa, taxa, meta) já aparecem no banner gerado — a legenda
// só precisa do link de reserva e da variação (cor/tamanho/voltagem) pra ficar
// claro qual caixa específica está sendo aberta.
async function montarMensagemCaixa(
  rodada: RodadaAtacado & { produtoAtacado: ProdutoAtacado },
  statusOverride?: string
): Promise<{ text: string; mentions: string[] }> {
  const status = statusOverride || rodada.status;
  const linkCurto = `${getAppUrl()}/r/${rodada.slug}`;

  // Buscar todas as reservas pagas desta rodada
  const reservas = await prisma.reservaAtacado.findMany({
    where: { rodadaId: rodada.id, status: "PAGO" },
    orderBy: { createdAt: "asc" },
  });

  // Só menciona quem tem telefone real; reservas manuais (admin) não têm telefone
  // e aparecem pelo nome, sem @menção quebrada.
  const mentions = reservas
    .map((r) => r.compradorTelefone.replace(/\D/g, ""))
    .filter((t) => t.length > 0)
    .map((t) => `${t}@s.whatsapp.net`);

  if (status === "ABERTA") {
    if (reservas.length === 0) {
      // Print 1: Abertura da Caixa
      const linhas = ["📦 *CAIXA ABERTA* 📦"];
      if (rodada.variacaoId) {
        const v = await prisma.produtoAtacadoCor.findUnique({ where: { id: rodada.variacaoId } });
        if (v) {
          const rotulo = v.tipo === "COR" ? "Cor" : v.tipo === "TAMANHO" ? "Tamanho" : "Voltagem";
          linhas.push(`✨ *${rotulo}: ${v.nome}*`);
        }
      }
      linhas.push(`🛒 Mínimo: *${rodada.minimoUnidadesPorReserva} un*`);
      linhas.push("Garanta a sua 👇");
      linhas.push(linkCurto);

      return { text: linhas.join("\n"), mentions: [] };
    } else {
      // Print 2: Loop com participantes (Compacto)
      const restantes = rodada.metaUnidades - rodada.unidadesReservadas;
      const linhas = [
        "🔥 *COMPRA COLETIVA* 🔥",
        "",
        `Faltam de *${rodada.metaUnidades} un* temos so *${restantes} un* pra fechar!`,
      ];

      reservas.forEach((r, idx) => {
        const tel = r.compradorTelefone.replace(/\D/g, "");
        const quem = tel ? `@${tel}` : `*${r.compradorNome.split(" ")[0]}*`;
        linhas.push(`${idx + 1}. ${quem}  *${r.quantidade}un`);
      });

      linhas.push("");
      linhas.push("Garanta a sua 👇");
      linhas.push(linkCurto);

      return { text: linhas.join("\n"), mentions };
    }
  } else {
    // Print 3: Caixa Fechada (Compacto)
    const linkRastreio = `${getAppUrl()}/r/rastreio/${rodada.codigoRastreio || ""}`;
    const linhas = [
      "✅ *CAIXA FECHADA!* ✅",
    ];

    reservas.forEach((r, idx) => {
      const tel = r.compradorTelefone.replace(/\D/g, "");
      const nomePrimeiro = r.compradorNome.split(" ")[0];
      const quem = tel ? `@${tel} (${nomePrimeiro})` : `*${nomePrimeiro}*`;
      linhas.push(`${idx + 1}. ${quem} — ${r.quantidade}un`);
    });

    linhas.push("Rastreio 👇");
    linhas.push(linkRastreio);

    return { text: linhas.join("\n"), mentions };
  }
}

// Envia mensagem de progresso com o banner atualizado
export async function notificarProgressoCaixa(rodadaId: string): Promise<void> {
  const rodada = await prisma.rodadaAtacado.findUniqueOrThrow({
    where: { id: rodadaId },
    include: { produtoAtacado: true },
  });
  if (!rodada.grupoIdUsado) return;

  const { text, mentions } = await montarMensagemCaixa(rodada);
  let bannerUrl = `${getAppUrl()}/api/atacado/banner/${rodadaId}?t=${Date.now()}`;
  if (bannerUrl.includes("localhost") || bannerUrl.includes("127.0.0.1")) {
    bannerUrl = rodada.produtoAtacado.imagemUrl || "";
  }

  if (bannerUrl) {
    await enviarImagemGrupo(rodada.grupoIdUsado, bannerUrl, text, mentions);
  } else {
    await enviarMensagemGrupo(rodada.grupoIdUsado, text, undefined, mentions);
  }
}

// Envia mensagem de fechamento com o banner carimbado de FECHADO
export async function notificarFechamentoCaixa(rodadaId: string): Promise<void> {
  const rodada = await prisma.rodadaAtacado.findUniqueOrThrow({
    where: { id: rodadaId },
    include: { produtoAtacado: true },
  });
  if (!rodada.grupoIdUsado) return;

  const { text, mentions } = await montarMensagemCaixa(rodada);
  let bannerUrl = `${getAppUrl()}/api/atacado/banner/${rodadaId}?status=FECHADA&t=${Date.now()}`;
  if (bannerUrl.includes("localhost") || bannerUrl.includes("127.0.0.1")) {
    bannerUrl = rodada.produtoAtacado.imagemUrl || "";
  }

  if (bannerUrl) {
    await enviarImagemGrupo(rodada.grupoIdUsado, bannerUrl, text, mentions);
  } else {
    await enviarMensagemGrupo(rodada.grupoIdUsado, text, undefined, mentions);
  }
}

// Resolve o grupo de WhatsApp de uma categoria de produto:
// 1) vínculo específico da categoria (se o admin criou um dedicado)
// 2) senão, cai no grupo padrão "Produtos Disponíveis" (PRODUTOS_DISPONIVEIS)
// Assim toda categoria nova funciona sozinha, sem precisar vincular na mão.
export async function resolverGrupoCategoria(categoria: string): Promise<string | null> {
  const especifico = await prisma.grupoWhatsappCategoria.findUnique({ where: { categoria } });
  if (especifico?.grupoId) return especifico.grupoId;
  const padrao = await prisma.grupoWhatsappCategoria.findFirst({ where: { categoria: "PRODUTOS_DISPONIVEIS" } });
  return padrao?.grupoId ?? null;
}

// "Abrir caixa" — posta a mensagem inicial num grupo de WhatsApp.
export async function abrirCaixaWhatsapp(rodadaId: string, grupoIdManual?: string): Promise<void> {
  const rodada = await prisma.rodadaAtacado.findUniqueOrThrow({
    where: { id: rodadaId },
    include: { produtoAtacado: true },
  });
  if (rodada.grupoMensagemEnviada) {
    throw new Error("Essa caixa já foi aberta no WhatsApp");
  }

  let grupoId = grupoIdManual?.trim() || "";
  if (!grupoId) {
    const resolvido = await resolverGrupoCategoria(rodada.produtoAtacado.categoria);
    if (!resolvido) {
      throw new Error(`Nenhum grupo vinculado à categoria "${rodada.produtoAtacado.categoria}" nem ao grupo padrão "Produtos Disponíveis". Vincule ao menos o "Produtos Disponíveis" no painel WhatsApp.`);
    }
    grupoId = resolvido;
  }

  const { text, mentions } = await montarMensagemCaixa(rodada);

  let bannerUrl = `${getAppUrl()}/api/atacado/banner/${rodadaId}`;
  if ((bannerUrl.includes("localhost") || bannerUrl.includes("127.0.0.1")) && rodada.produtoAtacado.imagemUrl) {
    bannerUrl = rodada.produtoAtacado.imagemUrl;
  }

  if (bannerUrl) {
    await enviarImagemGrupo(grupoId, bannerUrl, text, mentions);
  } else {
    await enviarMensagemGrupo(grupoId, text, undefined, mentions);
  }

  await prisma.rodadaAtacado.update({
    where: { id: rodadaId },
    data: {
      grupoMensagemEnviada: true,
      grupoIdUsado: grupoId,
      ultimoLoopEnviadoEm: new Date(),
    },
  });
}

// Reposta a caixa no grupo (Loop) usando o mesmo grupoId original
export async function repostarCaixaWhatsapp(rodadaId: string): Promise<void> {
  const rodada = await prisma.rodadaAtacado.findUniqueOrThrow({
    where: { id: rodadaId },
    include: { produtoAtacado: true },
  });

  if (rodada.status !== "ABERTA") {
    throw new Error("Rodada não está mais aberta");
  }

  if (!rodada.grupoMensagemEnviada || !rodada.grupoIdUsado) {
    throw new Error("Rodada ainda não foi aberta no grupo");
  }

  const { text, mentions } = await montarMensagemCaixa(rodada);

  let bannerUrl = `${getAppUrl()}/api/atacado/banner/${rodadaId}`;
  if ((bannerUrl.includes("localhost") || bannerUrl.includes("127.0.0.1")) && rodada.produtoAtacado.imagemUrl) {
    bannerUrl = rodada.produtoAtacado.imagemUrl;
  }

  if (bannerUrl) {
    await enviarImagemGrupo(rodada.grupoIdUsado, bannerUrl, text, mentions);
  } else {
    await enviarMensagemGrupo(rodada.grupoIdUsado, text, undefined, mentions);
  }

  await prisma.rodadaAtacado.update({
    where: { id: rodadaId },
    data: { ultimoLoopEnviadoEm: new Date() },
  });
}
