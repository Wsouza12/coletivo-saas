import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pública, sem login — qualquer visitante pode ver produto/preço/progresso da
// meta. O bloqueio de acesso é só na hora de reservar (POST /api/atacado/reservas).
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const rodada = await prisma.rodadaAtacado.findUnique({
    where: { slug },
    include: {
      produtoAtacado: {
        select: { nome: true, descricao: true, imagemUrl: true },
      },
    },
  });

  if (!rodada) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Rodada não encontrada" } }, { status: 404 });
  }

  return NextResponse.json({ data: rodada }, { status: 200 });
}
