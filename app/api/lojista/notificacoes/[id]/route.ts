import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.lojistaId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const { id } = await params;
  const notificacao = await prisma.notificacao.findFirst({
    where: { id, destinatario: "LOJISTA", lojistaId: session.user.lojistaId },
  });
  if (!notificacao) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  const atualizada = await prisma.notificacao.update({ where: { id }, data: { lida: true } });
  return NextResponse.json({ data: atualizada });
}
