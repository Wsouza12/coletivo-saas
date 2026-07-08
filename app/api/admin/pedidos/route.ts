import { NextResponse } from "next/server";
import type { PedidoStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

const STATUS_GROUPS: Record<string, PedidoStatus[]> = {
  novos: ["NOVO", "CONFIRMADO"],
  processamento: ["SEPARANDO", "EMBALANDO", "AGUARDANDO_COLETA"],
  enviados: ["ENVIADO"],
  finalizados: ["ENTREGUE", "CANCELADO", "DEVOLVIDO"],
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") ?? "novos";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Number(searchParams.get("pageSize") ?? String(PAGE_SIZE));

  const statusIn = STATUS_GROUPS[tab] ?? STATUS_GROUPS.novos;

  const [items, total] = await Promise.all([
    prisma.pedido.findMany({
      where: { status: { in: statusIn } },
      include: {
        lojista: { select: { storeName: true } },
        itens: { include: { produto: { select: { nome: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pedido.count({ where: { status: { in: statusIn } } }),
  ]);

  return NextResponse.json({ data: { items, total, page, pageSize } }, { status: 200 });
}
