import { NextResponse } from "next/server";
import type { DevolucaoStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_GROUPS: Record<string, DevolucaoStatus[]> = {
  pendentes: ["SOLICITADA"],
  andamento: ["EM_ANDAMENTO"],
  concluidas: ["REEMBOLSADA", "NEGADA"],
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const tab = new URL(req.url).searchParams.get("tab") ?? "todas";
  const statusIn = STATUS_GROUPS[tab] ?? [];

  const items = await prisma.devolucao.findMany({
    where: statusIn.length > 0 ? { status: { in: statusIn } } : {},
    include: {
      lojista: { select: { storeName: true } },
      pedido: { select: { id: true, plataformaOrderId: true, compradorNome: true, valorVenda: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: items }, { status: 200 });
}
