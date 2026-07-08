import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const fatura = await prisma.fatura.findFirst({
    where: { id, lojistaId: session.user.lojistaId },
    include: {
      pedidos: { include: { itens: { include: { produto: { select: { nome: true } } } } } },
    },
  });

  if (!fatura) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Fatura não encontrada" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: fatura }, { status: 200 });
}
