import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProdutoSchema } from "@/lib/validations";
import { criarNotificacaoBroadcastLojistas } from "@/lib/notificacoes-internas";

const PAGE_SIZE = 25;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const categoria = searchParams.get("categoria");
  const ativo = searchParams.get("ativo");
  const cursor = searchParams.get("cursor");

  const where = {
    ...(q
      ? {
          OR: [
            { nome: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(categoria ? { categoria } : {}),
    ...(ativo ? { ativo: ativo === "true" } : {}),
  };

  const items = await prisma.produto.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { imagens: { where: { principal: true }, take: 1 } },
  });

  const hasMore = items.length > PAGE_SIZE;
  const page = hasMore ? items.slice(0, PAGE_SIZE) : items;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({ data: { items: page, nextCursor } }, { status: 200 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createProdutoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const existing = await prisma.produto.findUnique({ where: { sku: parsed.data.sku } });
  if (existing) {
    return NextResponse.json(
      { error: { code: "SKU_IN_USE", message: "Já existe um produto com este SKU" } },
      { status: 409 }
    );
  }

  const { imagens, variacoes, ...produtoData } = parsed.data;

  // Quando o produto tem variações, o estoque é a soma delas — o campo "estoque"
  // solto do formulário é ignorado pra esse caso (evita os dois ficarem dessincronizados).
  const estoque =
    produtoData.temVariacoes && variacoes.length > 0
      ? variacoes.reduce((soma, v) => soma + v.estoque, 0)
      : produtoData.estoque;

  const produto = await prisma.produto.create({
    data: {
      ...produtoData,
      estoque,
      imagens: { create: imagens },
      variacoes: produtoData.temVariacoes ? { create: variacoes } : undefined,
    },
    include: { imagens: true, variacoes: true },
  });

  if (produto.ativo) {
    await criarNotificacaoBroadcastLojistas({
      tipo: "PRODUTO_NOVO",
      titulo: "Novo produto no catálogo",
      mensagem: `"${produto.nome}" (SKU ${produto.sku}) acabou de entrar no catálogo — confira e publique se fizer sentido pra sua loja.`,
      link: `/catalogo/${produto.id}`,
    });
  }

  return NextResponse.json({ data: produto }, { status: 201 });
}
