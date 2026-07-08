import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const solicitacoes = await prisma.solicitacaoAberturaCaixa.findMany({
    include: {
      produtoAtacado: {
        select: { id: true, nome: true, imagemUrl: true, codigo: true, unidadesPorCaixa: true, custoUnitario: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: solicitacoes });
}
