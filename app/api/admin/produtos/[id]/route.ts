import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProdutoSchema } from "@/lib/validations";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const produto = await prisma.produto.findUnique({
    where: { id },
    include: {
      imagens: { orderBy: { ordem: "asc" } },
      variacoes: { orderBy: { ordem: "asc" } },
    },
  });
  if (!produto) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Produto não encontrado" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: produto }, { status: 200 });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateProdutoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const { imagens, variacoes: variacoesInput, ...produtoData } = parsed.data;
  const variacoes = variacoesInput ?? [];
  // Só toca nas variações se o body explicitamente mandou a chave — evita que um PUT
  // parcial (que não menciona variações) apague tudo por causa do .default([]) do schema.
  const variacoesEnviadas = Object.prototype.hasOwnProperty.call(body, "variacoes");

  const produto = await prisma.produto
    .update({
      where: { id },
      data: produtoData,
      include: { imagens: true, variacoes: true },
    })
    .catch(() => null);

  if (!produto) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Produto não encontrado" } },
      { status: 404 }
    );
  }
  void imagens; // imagens são gerenciadas pelas rotas dedicadas de upload/remoção

  if (variacoesEnviadas) {
    const existentes = await prisma.produtoVariacao.findMany({ where: { produtoId: id } });
    const combosEnviados = new Set(variacoes.map((v) => `${v.tamanho}::${v.cor}`));
    const aRemover = existentes.filter((e) => !combosEnviados.has(`${e.tamanho}::${e.cor}`));
    if (aRemover.length > 0) {
      await prisma.produtoVariacao.deleteMany({ where: { id: { in: aRemover.map((a) => a.id) } } });
    }
    for (const v of variacoes) {
      await prisma.produtoVariacao.upsert({
        where: { produtoId_tamanho_cor: { produtoId: id, tamanho: v.tamanho, cor: v.cor ?? "" } },
        create: { ...v, produtoId: id },
        update: v,
      });
    }

    const temVariacoes = produtoData.temVariacoes ?? produto.temVariacoes;
    if (temVariacoes) {
      const estoque = variacoes.reduce((soma, v) => soma + v.estoque, 0);
      await prisma.produto.update({ where: { id }, data: { estoque } });
    }
  }

  const produtoAtualizado = await prisma.produto.findUnique({
    where: { id },
    include: { imagens: true, variacoes: { orderBy: { ordem: "asc" } } },
  });

  return NextResponse.json({ data: produtoAtualizado }, { status: 200 });
}

// Exclusão real (não só desativar): só permitida se o produto nunca teve nenhum
// anúncio publicado nem item de pedido — caso contrário excluir quebraria histórico
// de vendas/fulfillment. Nesse caso, orienta a desativar (toggle "ativo") em vez de
// excluir, que já esconde o produto do catálogo dos lojistas sem perder histórico.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;

  const [totalAnuncios, totalItensPedido] = await Promise.all([
    prisma.anuncio.count({ where: { produtoId: id } }),
    prisma.itemPedido.count({ where: { produtoId: id } }),
  ]);

  if (totalAnuncios > 0 || totalItensPedido > 0) {
    return NextResponse.json(
      {
        error: {
          code: "PRODUTO_COM_HISTORICO",
          message:
            "Este produto já tem anúncios publicados e/ou pedidos registrados — excluir quebraria esse histórico. Use o botão de ativar/desativar pra esconder do catálogo dos lojistas em vez de excluir.",
        },
      },
      { status: 409 }
    );
  }

  const produto = await prisma.produto.delete({ where: { id } }).catch(() => null);
  if (!produto) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Produto não encontrado" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: produto }, { status: 200 });
}
