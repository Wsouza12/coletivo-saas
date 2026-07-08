import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Admin — lista de vendas da Lista de Fornecedores (quem comprou).
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const [compras, pagas] = await Promise.all([
    prisma.compraListaFornecedores.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true, compradorNome: true, compradorDoc: true, compradorTelefone: true,
        compradorEmail: true, tipo: true, incluiComunidade: true, valor: true,
        status: true, pagoEm: true, createdAt: true,
      },
    }),
    prisma.compraListaFornecedores.aggregate({
      where: { status: "PAGO" },
      _count: { _all: true },
      _sum: { valor: true },
    }),
  ]);

  return NextResponse.json({
    data: {
      compras: compras.map((c) => ({ ...c, valor: Number(c.valor) })),
      totalPagas: pagas._count._all,
      faturamento: Number(pagas._sum.valor ?? 0),
    },
  });
}
