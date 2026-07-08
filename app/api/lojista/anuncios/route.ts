import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const plataforma = searchParams.get("plataforma");

  const anuncios = await prisma.anuncio.findMany({
    where: {
      lojistaId: session.user.lojistaId,
      ...(plataforma ? { plataforma: plataforma as "MERCADOLIVRE" | "SHOPEE" } : {}),
    },
    include: { produto: { include: { imagens: { where: { principal: true }, take: 1 } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: anuncios }, { status: 200 });
}
