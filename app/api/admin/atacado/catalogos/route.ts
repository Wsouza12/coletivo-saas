import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const catalogos = await prisma.catalogoFornecedor.findMany({
    include: {
      fornecedor: { select: { nome: true } },
      _count: { select: { itens: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: catalogos }, { status: 200 });
}
