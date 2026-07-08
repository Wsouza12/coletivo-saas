import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { abrirCaixaWhatsapp } from "@/lib/atacado";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const grupoIdManual = typeof body?.grupoId === "string" ? body.grupoId : undefined;
  try {
    await abrirCaixaWhatsapp(id, grupoIdManual);
  } catch (err) {
    return NextResponse.json(
      { error: { code: "ABRIR_CAIXA_FALHOU", message: err instanceof Error ? err.message : "Erro ao abrir caixa" } },
      { status: 422 }
    );
  }

  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
