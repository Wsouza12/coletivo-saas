import { prisma } from "@/lib/prisma";

export async function getLojistaDashboard(lojistaId: string) {
  const now = new Date();
  const inicioHoje = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    pedidosHoje,
    anunciosAtivos,
    pedidosDoMes,
    ultimosPedidos,
    pedidosNaoFaturados,
    proximaFatura,
    integracoes,
    anunciosComProduto,
  ] = await Promise.all([
    prisma.pedido.count({ where: { lojistaId, createdAt: { gte: inicioHoje } } }),
    prisma.anuncio.count({ where: { lojistaId, status: "PUBLICADO" } }),
    prisma.pedido.findMany({
      where: { lojistaId, status: { in: ["ENVIADO", "ENTREGUE"] }, createdAt: { gte: inicioMes } },
      select: { valorVenda: true, valorCusto: true },
    }),
    prisma.pedido.findMany({
      where: { lojistaId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { itens: { include: { produto: { select: { nome: true } } } } },
    }),
    prisma.pedido.findMany({
      where: { lojistaId, faturaId: null, status: { in: ["ENVIADO", "ENTREGUE"] } },
      select: { valorCusto: true },
    }),
    prisma.fatura.findFirst({
      where: { lojistaId, status: { in: ["PENDENTE", "ENVIADA"] } },
      orderBy: { vencimento: "asc" },
    }),
    prisma.integracao.findMany({ where: { lojistaId, ativa: true } }),
    prisma.anuncio.findMany({
      where: { lojistaId, status: "PUBLICADO" },
      include: { produto: { select: { nome: true, estoque: true, estoqueMinimo: true } } },
    }),
  ]);

  const receitaMes = pedidosDoMes.reduce((sum, p) => sum + Number(p.valorVenda), 0);
  const margemMes = pedidosDoMes.reduce(
    (sum, p) => sum + (Number(p.valorVenda) - Number(p.valorCusto)),
    0
  );
  const valorNaoFaturado = pedidosNaoFaturados.reduce((sum, p) => sum + Number(p.valorCusto), 0);

  const integracoesExpiradas = integracoes.filter((i) => i.tokenExpiry < now);
  const produtosEstoqueBaixo = anunciosComProduto
    .filter((a) => a.produto && a.produto.estoque <= a.produto.estoqueMinimo)
    .map((a) => a.produto!.nome);

  return {
    kpis: { pedidosHoje, anunciosAtivos, receitaMes, margemMes },
    ultimosPedidos,
    proximaFatura: {
      valorEstimado: valorNaoFaturado,
      vencimento: proximaFatura?.vencimento ?? null,
      numero: proximaFatura?.numero ?? null,
    },
    alertas: {
      integracoesExpiradas: integracoesExpiradas.map((i) => i.plataforma),
      produtosEstoqueBaixo: [...new Set(produtosEstoqueBaixo)],
    },
  };
}
