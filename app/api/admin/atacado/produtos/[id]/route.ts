import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProdutoAtacadoSchema } from "@/lib/validations";
import { deleteProdutoImagemPorUrl } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const produto = await prisma.produtoAtacado.findUnique({ 
    where: { id },
    include: { cores: { orderBy: { ordem: 'asc' } } }
  });
  if (!produto) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  return NextResponse.json({ data: produto }, { status: 200 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const parsed = updateProdutoAtacadoSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  const { tamanhosInput, coresInput, coresVariadas, ...dadosProduto } = parsed.data;

  const produto = await prisma.produtoAtacado.update({
    where: { id },
    data: { ...dadosProduto, ...(coresVariadas !== undefined ? { coresVariadas } : {}) },
  });

  // Se veio tamanhosInput, substitui todas as variações de tamanho
  if (tamanhosInput !== undefined) {
    await prisma.produtoAtacadoCor.deleteMany({ where: { produtoAtacadoId: id, tipo: "TAMANHO" } });
    const tamanhos = tamanhosInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (tamanhos.length > 0) {
      await prisma.produtoAtacadoCor.createMany({
        data: tamanhos.map((nome, i) => ({ produtoAtacadoId: id, tipo: "TAMANHO", nome, ordem: i })),
      });
    }
  }

  // Se veio coresInput, substitui todas as variações de cor
  if (coresInput !== undefined) {
    await prisma.produtoAtacadoCor.deleteMany({ where: { produtoAtacadoId: id, tipo: "COR" } });
    if (!coresVariadas && coresInput.trim()) {
      const cores = coresInput.split(",").map((c) => c.trim()).filter(Boolean);
      if (cores.length > 0) {
        await prisma.produtoAtacadoCor.createMany({
          data: cores.map((nome, i) => ({ produtoAtacadoId: id, tipo: "COR", nome, ordem: i })),
        });
      }
    }
  }

  return NextResponse.json({ data: produto }, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;

  const emUso = await prisma.rodadaAtacado.count({ where: { produtoAtacadoId: id } });
  if (emUso > 0) {
    return NextResponse.json(
      { error: { code: "EM_USO", message: "Esse produto já tem rodada criada — não pode ser excluído." } },
      { status: 409 }
    );
  }

  const produto = await prisma.produtoAtacado.findUnique({ where: { id } });
  if (produto?.imagemUrl) {
    await deleteProdutoImagemPorUrl(produto.imagemUrl).catch(() => {});
  }

  // Apaga as entradas do índice de catálogo que apontam pra esse produto.
  // Sem isso, o código continua "ocupado" no catálogo e o re-cadastro falha com
  // DUPLICADO mesmo após o produto ter sido excluído.
  await prisma.catalogoFornecedorItem.deleteMany({ where: { produtoAtacadoId: id } });
  await prisma.produtoAtacado.delete({ where: { id } });
  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
