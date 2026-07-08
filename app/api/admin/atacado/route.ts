import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criarRodadaAtacadoSchema } from "@/lib/validations";
import { calcularRodadaComReservaLoja, gerarCodigoRastreioUnico } from "@/lib/atacado";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const rodadas = await prisma.rodadaAtacado.findMany({
    include: { produtoAtacado: { select: { nome: true } }, _count: { select: { reservas: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: rodadas }, { status: 200 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = criarRodadaAtacadoSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  const produto = await prisma.produtoAtacado.findUnique({
    where: { id: parsed.data.produtoAtacadoId },
    include: { cores: { select: { id: true, tipo: true } } },
  });
  if (!produto) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Produto não encontrado" } }, { status: 404 });
  }

  // Produtos com tamanhos selecionáveis (novo modelo de roupas): o cliente
  // escolhe o mix de tamanhos no checkout — não precisa de variação por caixa.
  const temTamanhos = produto.cores.some((c) => c.tipo === "TAMANHO");
  const coresNaoTamanho = produto.cores.filter((c) => c.tipo !== "TAMANHO");

  // Se o produto tem variações de COR/VOLTAGEM (modelo antigo), admin DEVE escolher uma.
  if (coresNaoTamanho.length > 0 && !parsed.data.variacaoId) {
    return NextResponse.json(
      { error: { code: "VARIACAO_OBRIGATORIA", message: "Este produto tem variações — escolha uma pra esta caixa" } },
      { status: 422 }
    );
  }
  // Produtos só com tamanhos: variacaoId deve ficar vazio
  if (temTamanhos && !parsed.data.variacaoId && coresNaoTamanho.length === 0) {
    // OK — segue sem variacaoId
  }
  if (parsed.data.variacaoId && !produto.cores.find((c) => c.id === parsed.data.variacaoId)) {
    return NextResponse.json(
      { error: { code: "VARIACAO_INVALIDA", message: "Variação não pertence a este produto" } },
      { status: 422 }
    );
  }

  const custoUnitario = Number(produto.custoUnitario);
  const reservadasLoja = parsed.data.unidadesReservadasLoja ?? 0;
  if (reservadasLoja >= parsed.data.metaUnidades) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "As unidades reservadas pra loja devem ser menores que a meta total da caixa" } },
      { status: 422 }
    );
  }
  const { metaColetivo, precoFinalUnitario } = calcularRodadaComReservaLoja({
    custoUnitario,
    taxaServicoPercentual: parsed.data.taxaServicoPercentual,
    metaTotal: parsed.data.metaUnidades,
    unidadesReservadasLoja: reservadasLoja,
  });

  // Slug legível e único — nome do produto + sufixo curto, sem depender de input manual.
  const base = produto.nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;

  const codigoRastreio = await gerarCodigoRastreioUnico();

  const rodada = await prisma.rodadaAtacado.create({
    data: {
      produtoAtacadoId: parsed.data.produtoAtacadoId,
      slug,
      // metaUnidades guardada é a meta do COLETIVO (total − reservadas pra loja),
      // pra toda a lógica de fechar/restantes seguir igual.
      metaUnidades: metaColetivo,
      unidadesReservadasLoja: reservadasLoja,
      custoUnitario,
      taxaServicoPercentual: parsed.data.taxaServicoPercentual,
      minimoUnidadesPorReserva: parsed.data.minimoUnidadesPorReserva,
      precoFinalUnitario,
      dataLimite: parsed.data.dataLimite ? new Date(parsed.data.dataLimite) : null,
      variacaoId: parsed.data.variacaoId,
      loopAtivo: parsed.data.loopAtivo,
      loopIntervaloMinutos: parsed.data.loopIntervaloMinutos,
      codigoRastreio,
    },
  });

  return NextResponse.json({ data: rodada }, { status: 201 });
}
