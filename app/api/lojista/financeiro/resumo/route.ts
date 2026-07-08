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

  const lojistaId = session.user.lojistaId;
  const anoAtual = new Date().getFullYear();

  const [faturaAberta, pagoEsteAno, proximaFatura] = await Promise.all([
    prisma.fatura.aggregate({
      where: { lojistaId, status: { in: ["PENDENTE", "ENVIADA"] } },
      _sum: { valorTotal: true },
    }),
    prisma.fatura.aggregate({
      where: { lojistaId, status: "PAGA", pagoEm: { gte: new Date(anoAtual, 0, 1) } },
      _sum: { valorTotal: true },
    }),
    prisma.fatura.findFirst({
      where: { lojistaId, status: { in: ["PENDENTE", "ENVIADA"] } },
      orderBy: { vencimento: "asc" },
    }),
  ]);

  return NextResponse.json(
    {
      data: {
        faturaAberta: Number(faturaAberta._sum.valorTotal ?? 0),
        pagoEsteAno: Number(pagoEsteAno._sum.valorTotal ?? 0),
        proximoVencimento: proximaFatura?.vencimento ?? null,
      },
    },
    { status: 200 }
  );
}
