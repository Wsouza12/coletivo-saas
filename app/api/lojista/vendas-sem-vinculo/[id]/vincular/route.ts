import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  produtoId: z.string().min(1),
  precoVenda: z.number().positive(),
  aceiteTermos: z.boolean(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.lojistaId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }
  if (!parsed.data.aceiteTermos) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION",
          message: "É necessário confirmar que você assume a responsabilidade por este vínculo",
        },
      },
      { status: 422 }
    );
  }

  const venda = await prisma.vendaNaoVinculada.findFirst({
    where: { id, lojistaId: session.user.lojistaId, resolvido: false },
  });
  if (!venda) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Venda pendente não encontrada" } },
      { status: 404 }
    );
  }

  const produto = await prisma.produto.findUnique({ where: { id: parsed.data.produtoId } });
  if (!produto) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Produto não encontrado" } },
      { status: 404 }
    );
  }

  // O lojista só pode ter 1 Anuncio por produto+plataforma — se já existe um
  // (ex: republicaram o item no ML), reaponta pro novo plataformaItemId em
  // vez de criar duplicado.
  const anuncioExistente = await prisma.anuncio.findUnique({
    where: {
      lojistaId_produtoId_plataforma: {
        lojistaId: session.user.lojistaId,
        produtoId: produto.id,
        plataforma: venda.plataforma,
      },
    },
  });

  if (anuncioExistente) {
    await prisma.anuncio.update({
      where: { id: anuncioExistente.id },
      data: { plataformaItemId: venda.plataformaItemId, status: "PUBLICADO" },
    });
  } else {
    await prisma.anuncio.create({
      data: {
        lojistaId: session.user.lojistaId,
        produtoId: produto.id,
        plataforma: venda.plataforma,
        plataformaItemId: venda.plataformaItemId,
        titulo: venda.tituloAnuncio ?? produto.nome,
        precoVenda: parsed.data.precoVenda,
        status: "PUBLICADO",
        publicadoEm: new Date(),
      },
    });
  }

  await prisma.vendaNaoVinculada.update({
    where: { id: venda.id },
    data: { resolvido: true, resolvidoEm: new Date() },
  });

  return NextResponse.json({ data: { ok: true } });
}
