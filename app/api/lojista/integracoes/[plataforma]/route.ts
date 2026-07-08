import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ plataforma: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { plataforma: plataformaParam } = await params;
  const plataforma = plataformaParam.toUpperCase();
  if (plataforma !== "MERCADOLIVRE" && plataforma !== "SHOPEE") {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Plataforma inválida" } },
      { status: 422 }
    );
  }

  const lojistaId = session.user.lojistaId;

  await prisma.$transaction([
    prisma.integracao.updateMany({
      where: { lojistaId, plataforma },
      data: { ativa: false },
    }),
    prisma.anuncio.updateMany({
      where: { lojistaId, plataforma, status: "PUBLICADO" },
      data: { status: "PAUSADO", pausadoPor: "Integração desconectada" },
    }),
  ]);

  return NextResponse.json({ data: { plataforma, ativa: false } }, { status: 200 });
}
