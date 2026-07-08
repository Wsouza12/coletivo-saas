import { prisma } from "@/lib/prisma";
import type { PedidoStatus } from "@prisma/client";

const FULFILLMENT_PENDENTE: PedidoStatus[] = ["NOVO", "CONFIRMADO", "SEPARANDO", "EMBALANDO"];
const FULFILLMENT_FINALIZADO: PedidoStatus[] = ["ENVIADO", "ENTREGUE", "CANCELADO", "DEVOLVIDO"];

export async function getDashboardMetrics() {
  const now = new Date();
  const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const seteDiasAtras = new Date(inicioHoje);
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);

  const [
    pedidosHoje,
    pedidosAguardando,
    pedidosDoMes,
    lojistasAtivos,
    pedidosFulfillment,
    pedidosUltimos7Dias,
    lojistasPendentes,
  ] = await Promise.all([
    prisma.pedido.count({ where: { createdAt: { gte: inicioHoje } } }),
    prisma.pedido.count({ where: { status: { in: FULFILLMENT_PENDENTE } } }),
    prisma.pedido.findMany({
      where: { status: { in: ["ENVIADO", "ENTREGUE"] }, createdAt: { gte: inicioMes } },
      select: {
        valorCusto: true,
        itens: { select: { quantidade: true, produto: { select: { custoReal: true } } } },
      },
    }),
    prisma.lojista.count({ where: { user: { status: "ACTIVE" } } }),
    prisma.pedido.findMany({
      where: { status: { notIn: FULFILLMENT_FINALIZADO } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        lojista: { select: { storeName: true } },
        itens: { include: { produto: { select: { nome: true } } } },
      },
    }),
    prisma.pedido.findMany({
      where: { createdAt: { gte: seteDiasAtras } },
      select: { createdAt: true },
    }),
    prisma.user.findMany({
      where: { role: "LOJISTA", status: "PENDING" },
      include: { lojista: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const receitaMes = pedidosDoMes.reduce((sum, p) => sum + Number(p.valorCusto), 0);

  // Líquido = bruto (o que os lojistas pagam) menos o custo real (o que você paga
  // ao fornecedor) — só calculado pros itens que têm custoReal preenchido.
  const custoRealMes = pedidosDoMes.reduce(
    (sum, p) =>
      sum + p.itens.reduce((s, item) => s + item.quantidade * Number(item.produto.custoReal ?? 0), 0),
    0
  );
  const faturamentoBrutoMes = receitaMes;
  const faturamentoLiquidoMes = receitaMes - custoRealMes;

  const diasMap = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(seteDiasAtras);
    d.setDate(d.getDate() + i);
    diasMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const pedido of pedidosUltimos7Dias) {
    const key = pedido.createdAt.toISOString().slice(0, 10);
    if (diasMap.has(key)) diasMap.set(key, (diasMap.get(key) ?? 0) + 1);
  }
  const graficoPedidos = Array.from(diasMap.entries()).map(([data, total]) => ({
    data,
    label: new Date(data + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }),
    total,
  }));

  return {
    kpis: {
      pedidosHoje,
      pedidosAguardando,
      receitaMes,
      lojistasAtivos,
      faturamentoBrutoMes,
      faturamentoLiquidoMes,
    },
    pedidosFulfillment,
    graficoPedidos,
    lojistasPendentes,
  };
}
