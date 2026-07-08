import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Polling público do status de pagamento — usado pelo modal de QR Code pra
// saber quando o webhook do MP confirmou e redirecionar o comprador.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reserva = await prisma.reservaAtacado.findUnique({ where: { id }, select: { status: true } });
  if (!reserva) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  return NextResponse.json({ data: { status: reserva.status } }, { status: 200 });
}
