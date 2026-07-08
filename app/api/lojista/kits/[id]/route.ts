import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateKitSchema } from "@/lib/validations";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.lojistaId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const { id } = await params;
  const existente = await prisma.kit.findUnique({ where: { id } });
  if (!existente || existente.lojistaId !== session.user.lojistaId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Kit não encontrado" } }, { status: 404 });
  }

  const parsed = updateKitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const { itens, nome, descricao, precoVenda, ativo } = parsed.data;

  const kit = await prisma.$transaction(async (tx) => {
    if (itens) {
      await tx.kitItem.deleteMany({ where: { kitId: id } });
      await tx.kitItem.createMany({ data: itens.map((i) => ({ ...i, kitId: id })) });
    }
    return tx.kit.update({
      where: { id },
      data: {
        ...(nome !== undefined ? { nome } : {}),
        ...(descricao !== undefined ? { descricao } : {}),
        ...(precoVenda !== undefined ? { precoVenda } : {}),
        ...(ativo !== undefined ? { ativo } : {}),
      },
      include: { itens: { include: { produto: { select: { nome: true, sku: true, precoAtacado: true } } } } },
    });
  });

  return NextResponse.json({ data: kit });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.lojistaId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const { id } = await params;
  const existente = await prisma.kit.findUnique({ where: { id } });
  if (!existente || existente.lojistaId !== session.user.lojistaId) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Kit não encontrado" } }, { status: 404 });
  }

  const totalAnuncios = await prisma.anuncio.count({ where: { kitId: id } });
  if (totalAnuncios > 0) {
    return NextResponse.json(
      {
        error: {
          code: "KIT_COM_ANUNCIO",
          message: "Este kit já tem anúncio publicado — remova/pause o anúncio antes de excluir o kit",
        },
      },
      { status: 409 }
    );
  }

  await prisma.kit.delete({ where: { id } });
  return NextResponse.json({ data: { ok: true } });
}
