import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const lojista = await prisma.lojista.findUnique({
    where: { id },
    include: {
      user: true,
      integracoes: true,
      anuncios: { include: { produto: { select: { nome: true } } }, orderBy: { createdAt: "desc" } },
      pedidos: { orderBy: { createdAt: "desc" }, take: 50 },
      faturas: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lojista) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Lojista não encontrado" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: lojista }, { status: 200 });
}
