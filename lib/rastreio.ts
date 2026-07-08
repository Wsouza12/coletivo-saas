import { prisma } from "@/lib/prisma";

export const ETAPAS_ORDEM = [
  "NOVO",
  "CONFIRMADO",
  "SEPARANDO",
  "EMBALANDO",
  "AGUARDANDO_COLETA",
  "ENVIADO",
  "ENTREGUE",
] as const;

export const ETAPA_LABEL: Record<string, string> = {
  NOVO: "Pedido recebido",
  CONFIRMADO: "Pagamento confirmado",
  SEPARANDO: "Em separação",
  EMBALANDO: "Em embalagem",
  AGUARDANDO_COLETA: "Aguardando coleta",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
};

const TIMESTAMP_POR_STATUS: Record<string, "createdAt" | "embalagemEm" | "enviadoEm" | "entregueEm"> = {
  NOVO: "createdAt",
  EMBALANDO: "embalagemEm",
  ENVIADO: "enviadoEm",
  ENTREGUE: "entregueEm",
};

export type EtapaPedidoTimeline = { etapa: string; concluida: boolean; dataHora: Date | null };

// Monta a timeline de etapas (concluída ou não, com data) a partir do status atual e dos
// timestamps já salvos no Pedido — reaproveitado pela página de detalhe, pela lista de
// pedidos do lojista e pelo rastreio público, pra não duplicar essa lógica em 3 lugares.
export function montarEtapasPedido(pedido: {
  status: string;
  createdAt: Date;
  embalagemEm: Date | null;
  enviadoEm: Date | null;
  entregueEm: Date | null;
}): { cancelado: boolean; etapas: EtapaPedidoTimeline[] } {
  const cancelado = pedido.status === "CANCELADO" || pedido.status === "DEVOLVIDO";
  const indiceAtual = ETAPAS_ORDEM.indexOf(pedido.status as (typeof ETAPAS_ORDEM)[number]);

  const etapas = ETAPAS_ORDEM.map((etapa, i) => {
    const campo = TIMESTAMP_POR_STATUS[etapa];
    const dataHora = campo ? (pedido[campo as keyof typeof pedido] as Date | null) : null;
    return {
      etapa,
      concluida: !cancelado && i <= indiceAtual,
      dataHora,
    };
  });

  return { cancelado, etapas };
}

export type RastreioPublico = {
  numero: string;
  produto: string;
  status: string;
  rastreio: string | null;
  transportadora: string | null;
  updatedAt: string;
  etapas: { etapa: string; concluida: boolean; dataHora: string | null }[];
  cancelado: boolean;
  motivoCancelamento: string | null;
};

// Apenas dados seguros para exibição pública — sem dados do comprador, sem valores internos.
export async function buscarRastreioPublico(token: string): Promise<RastreioPublico | null> {
  const pedido = await prisma.pedido.findUnique({
    where: { rastreioToken: token },
    include: { itens: { include: { produto: true }, take: 1 } },
  });
  if (!pedido) return null;

  const { cancelado, etapas } = montarEtapasPedido(pedido);

  return {
    numero: pedido.plataformaOrderId,
    produto: pedido.itens[0]?.produto.nome ?? "Produto",
    status: pedido.status,
    rastreio: pedido.rastreio,
    transportadora: pedido.transportadora,
    updatedAt: pedido.updatedAt.toISOString(),
    etapas: etapas.map((e) => ({ ...e, dataHora: e.dataHora ? e.dataHora.toISOString() : null })),
    cancelado,
    motivoCancelamento: pedido.motivoCancelamento,
  };
}
