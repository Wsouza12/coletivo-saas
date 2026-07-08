import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const integracoes = await prisma.integracao.findMany({
    where: { lojistaId: session.user.lojistaId },
    select: {
      id: true,
      plataforma: true,
      accountId: true,
      accountName: true,
      ativa: true,
      tokenExpiry: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: integracoes }, { status: 200 });
}
