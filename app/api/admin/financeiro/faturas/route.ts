import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 25;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const pageSize = Number(searchParams.get("pageSize") ?? String(PAGE_SIZE));

  const where = status ? { status: status as "PENDENTE" | "ENVIADA" | "PAGA" | "VENCIDA" | "CANCELADA" } : {};

  const [items, total] = await Promise.all([
    prisma.fatura.findMany({
      where,
      include: { lojista: { select: { storeName: true } } },
      orderBy: { vencimento: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fatura.count({ where }),
  ]);

  return NextResponse.json({ data: { items, total, page, pageSize } }, { status: 200 });
}
