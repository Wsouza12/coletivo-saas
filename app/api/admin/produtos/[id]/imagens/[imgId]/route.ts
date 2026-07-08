import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteProdutoImagemPorUrl } from "@/lib/storage";

const patchSchema = z.object({
  ordem: z.number().int().min(0).optional(),
  principal: z.boolean().optional(),
  destacarVitrine: z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; imgId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id, imgId } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const imagem = await prisma.produtoImagem.findFirst({ where: { id: imgId, produtoId: id } });
  if (!imagem) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Imagem não encontrada" } },
      { status: 404 }
    );
  }

  if (parsed.data.principal) {
    await prisma.produtoImagem.updateMany({
      where: { produtoId: id, id: { not: imgId } },
      data: { principal: false },
    });
  }
  if (parsed.data.destacarVitrine) {
    await prisma.produtoImagem.updateMany({
      where: { produtoId: id, id: { not: imgId } },
      data: { destacarVitrine: false },
    });
  }

  const updated = await prisma.produtoImagem.update({
    where: { id: imgId },
    data: parsed.data,
  });

  return NextResponse.json({ data: updated }, { status: 200 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; imgId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id, imgId } = await params;
  const imagem = await prisma.produtoImagem.findFirst({
    where: { id: imgId, produtoId: id },
  });
  if (!imagem) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Imagem não encontrada" } },
      { status: 404 }
    );
  }

  await prisma.produtoImagem.delete({ where: { id: imgId } });
  await deleteProdutoImagemPorUrl(imagem.url).catch((err) =>
    console.error("Falha ao remover imagem do storage:", err)
  );

  if (imagem.principal) {
    const proxima = await prisma.produtoImagem.findFirst({
      where: { produtoId: id },
      orderBy: { ordem: "asc" },
    });
    if (proxima) {
      await prisma.produtoImagem.update({
        where: { id: proxima.id },
        data: { principal: true },
      });
    }
  }
  if (imagem.destacarVitrine) {
    const proximaVitrine = await prisma.produtoImagem.findFirst({
      where: { produtoId: id },
      orderBy: { ordem: "asc" },
    });
    if (proximaVitrine) {
      await prisma.produtoImagem.update({
        where: { id: proximaVitrine.id },
        data: { destacarVitrine: true },
      });
    }
  }

  return NextResponse.json({ data: { id: imgId } }, { status: 200 });
}
