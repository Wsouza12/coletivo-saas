export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rodada = await prisma.rodadaAtacado.findUnique({
    where: { id },
    include: { produtoAtacado: { select: { nome: true, imagemUrl: true, unidadesPorCaixa: true } } },
  });
  
  if (!rodada) {
    return new Response("not found", { status: 404 });
  }

  const progresso = Math.min(100, Math.round((rodada.unidadesReservadas / rodada.metaUnidades) * 100));

  const { searchParams: reqSearchParams } = new URL(req.url);
  const statusParam = reqSearchParams.get("status") || rodada.status;

  const searchParams = new URLSearchParams({
    nome: rodada.produtoAtacado.nome,
    preco: Number(rodada.custoUnitario).toFixed(2),
    taxa: Number(rodada.taxaServicoPercentual).toString(),
    progresso: progresso.toString(),
    reservadas: rodada.unidadesReservadas.toString(),
    meta: rodada.metaUnidades.toString(),
    minimo: rodada.minimoUnidadesPorReserva.toString(),
    unidadesCaixa: rodada.produtoAtacado.unidadesPorCaixa.toString(),
    status: statusParam,
  });

  if (rodada.produtoAtacado.imagemUrl) {
    searchParams.set("img", rodada.produtoAtacado.imagemUrl);
  }

  // Redirect to the edge function that renders the image
  const url = new URL(`/api/atacado/render-banner?${searchParams.toString()}`, req.url);
  return NextResponse.redirect(url);
}
