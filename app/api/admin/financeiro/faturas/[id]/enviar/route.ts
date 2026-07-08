import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enviarFatura } from "@/lib/financeiro";

// Gera o link de pagamento Mercado Pago, salva na fatura, marca status
// ENVIADA e envia o email FaturaEmitida ao lojista.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const fatura = await enviarFatura(id).catch(() => null);
  if (!fatura) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Fatura não encontrada" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: fatura }, { status: 200 });
}
