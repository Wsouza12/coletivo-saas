import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const notificacoes = await prisma.notificacao.findMany({
    where: { destinatario: "ADMIN" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ data: notificacoes });
}
