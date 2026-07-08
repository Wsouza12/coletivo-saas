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
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      lojista: { select: { id: true, storeName: true } },
      itens: { include: { produto: { select: { nome: true, sku: true } } } },
    },
  });

  if (!pedido) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pedido não encontrado" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: pedido }, { status: 200 });
}
