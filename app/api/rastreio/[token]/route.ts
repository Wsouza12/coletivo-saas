import { NextResponse } from "next/server";
import { buscarRastreioPublico } from "@/lib/rastreio";

// Endpoint público — sem autenticação. Não retorna fotos nem dados do comprador.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rastreio = await buscarRastreioPublico(token);

  if (!rastreio) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  return NextResponse.json({ data: rastreio }, { status: 200 });
}
