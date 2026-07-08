import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analisarProduto } from "@/lib/groq";
import { calcularPrecoVendaComTaxa } from "@/lib/configuracao-financeira";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const plataforma: "MERCADOLIVRE" | "SHOPEE" =
    body?.plataforma === "SHOPEE" ? "SHOPEE" : "MERCADOLIVRE";

  const produto = await prisma.produto.findUnique({ where: { id } });
  if (!produto || !produto.ativo) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const itensVendidos = await prisma.itemPedido.aggregate({
    where: {
      produtoId: id,
      pedido: { createdAt: { gte: seteDiasAtras } },
    },
    _sum: { quantidade: true },
  });

  // A IA dá o julgamento qualitativo (margem razoável pra esse tipo de
  // produto/categoria/concorrência) — mas o preço final é recalculado com a
  // taxa REAL da plataforma, não a estimativa que a IA chutaria no prompt.
  const analiseIA = await analisarProduto({
    nome: produto.nome,
    precoAtacado: produto.precoAtacado.toNumber(),
    categoria: produto.categoria,
    vendas7dias: itensVendidos._sum.quantidade ?? 0,
  });

  const calculo = await calcularPrecoVendaComTaxa({
    custoReal: produto.precoAtacado.toNumber(),
    margemDesejada: analiseIA.margem,
    plataforma,
    categoriaMlId: produto.categoriaMlId,
  });

  return NextResponse.json({
    data: {
      ...analiseIA,
      precoSugerido: calculo.precoSugerido,
      margem: analiseIA.margem,
      taxaPercentual: calculo.taxaPercentual,
      taxaValor: calculo.taxaValor,
      lucroLiquido: calculo.lucroLiquido,
      taxaPlataforma: calculo.taxaPlataforma,
      freteGratisObrigatorio: calculo.freteGratisObrigatorio,
    },
  });
}
