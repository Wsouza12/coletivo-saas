import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Público — o checkout faz polling nisto pra saber quando o Pix foi pago.
// Devolve o token só quando estiver PAGO (pra liberar o acesso).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const compra = await prisma.compraListaFornecedores.findUnique({
    where: { id },
    select: { status: true, token: true },
  });
  if (!compra) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  return NextResponse.json({
    data: { status: compra.status, token: compra.status === "PAGO" ? compra.token : null },
  });
}
