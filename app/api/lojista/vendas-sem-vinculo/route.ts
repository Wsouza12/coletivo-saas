import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.lojistaId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const vendas = await prisma.vendaNaoVinculada.findMany({
    where: { lojistaId: session.user.lojistaId, resolvido: false },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: vendas });
}
