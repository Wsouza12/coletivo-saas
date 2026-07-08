import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const assinatura = await prisma.assinaturaAtacado.findUnique({
    where: { id },
    include: {
      reservas: {
        include: { rodada: { include: { produtoAtacado: { select: { nome: true } } } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!assinatura) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  return NextResponse.json({ data: assinatura }, { status: 200 });
}
