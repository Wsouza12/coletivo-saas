import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { avancarEtapaRodada } from "@/lib/atacado";

const patchSchema = z.object({
  status: z.enum(["ABERTA", "FECHADA", "SEPARANDO", "EMBALANDO", "PRONTA_ENVIO", "CANCELADA", "ENVIADA"]).optional(),
  loopAtivo: z.boolean().optional(),
  loopIntervaloMinutos: z.number().int().min(1).optional(),
  metaUnidades: z.number().int().min(1).optional(),
  minimoUnidadesPorReserva: z.number().int().min(1).optional(),
  taxaServicoPercentual: z.number().min(0).max(100).optional(),
  unidadesReservadasLoja: z.number().int().min(0).optional(),
  envioCodigo: z.string().nullable().optional(),
  envioLink: z.string().nullable().optional(),
  produtoCategoria: z.string().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const rodada = await prisma.rodadaAtacado.findUnique({
    where: { id },
    include: {
      produtoAtacado: true,
      reservas: { include: { assinatura: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!rodada) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  return NextResponse.json({ data: rodada }, { status: 200 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  const { 
    status, 
    loopAtivo, 
    loopIntervaloMinutos, 
    metaUnidades, 
    minimoUnidadesPorReserva, 
    taxaServicoPercentual, 
    unidadesReservadasLoja,
    envioCodigo,
    envioLink,
    produtoCategoria
  } = parsed.data;

  // Se tem mudança de status, passa pelo avançarEtapaRodada (que notifica)
  if (status) {
    await avancarEtapaRodada(id, status, { envioCodigo, envioLink });
  }

  // Monta o objeto de atualização com todos os campos opcionais
  const updateData: Record<string, unknown> = {};
  if (loopAtivo !== undefined) updateData.loopAtivo = loopAtivo;
  if (loopIntervaloMinutos !== undefined) updateData.loopIntervaloMinutos = loopIntervaloMinutos;
  if (metaUnidades !== undefined) updateData.metaUnidades = metaUnidades;
  if (minimoUnidadesPorReserva !== undefined) updateData.minimoUnidadesPorReserva = minimoUnidadesPorReserva;
  if (taxaServicoPercentual !== undefined) updateData.taxaServicoPercentual = taxaServicoPercentual;
  if (unidadesReservadasLoja !== undefined) updateData.unidadesReservadasLoja = unidadesReservadasLoja;
  
  if (!status) {
    if (envioCodigo !== undefined) updateData.envioCodigo = envioCodigo;
    if (envioLink !== undefined) updateData.envioLink = envioLink;
  }

  // Recalcula o preço final se campos relevantes mudaram
  if (metaUnidades !== undefined || taxaServicoPercentual !== undefined || unidadesReservadasLoja !== undefined) {
    const rodadaAtual = await prisma.rodadaAtacado.findUniqueOrThrow({
      where: { id },
      include: { produtoAtacado: true },
    });
    const meta = Number(metaUnidades ?? rodadaAtual.metaUnidades);
    const taxa = Number(taxaServicoPercentual ?? rodadaAtual.taxaServicoPercentual);
    const reservaLoja = Number(unidadesReservadasLoja ?? rodadaAtual.unidadesReservadasLoja);
    const custoUnitario = Number(rodadaAtual.produtoAtacado.custoUnitario);
    const metaColetivo = meta - reservaLoja;
    const custoEfetivo = reservaLoja > 0 && metaColetivo > 0
      ? (custoUnitario * meta) / metaColetivo
      : custoUnitario;
    updateData.precoFinalUnitario = custoEfetivo * (1 + taxa / 100);
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.rodadaAtacado.update({ where: { id }, data: updateData });
  }

  if (produtoCategoria !== undefined) {
    const r = await prisma.rodadaAtacado.findUnique({ where: { id } });
    if (r) {
      await prisma.produtoAtacado.update({
        where: { id: r.produtoAtacadoId },
        data: { categoria: produtoCategoria },
      });
    }
  }

  const rodada = await prisma.rodadaAtacado.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ data: rodada }, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;

  // Verifica se a rodada existe
  const rodada = await prisma.rodadaAtacado.findUnique({ where: { id } });
  if (!rodada) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  // Exclui as reservas associadas antes de excluir a rodada
  await prisma.reservaAtacado.deleteMany({ where: { rodadaId: id } });
  await prisma.rodadaAtacado.delete({ where: { id } });

  return NextResponse.json({ success: true }, { status: 200 });
}
