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

  const faturas = await prisma.fatura.findMany({
    where: { lojistaId: session.user.lojistaId },
    orderBy: { vencimento: "desc" },
  });

  return NextResponse.json({ data: faturas }, { status: 200 });
}
