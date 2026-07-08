import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Marcação manual de pagamento (ex: recebido fora do Mercado Pago). O envio
// da fatura com link de pagamento é feito via POST /faturas/[id]/enviar.
const schema = z.object({
  status: z.literal("PAGA"),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const fatura = await prisma.fatura
    .update({
      where: { id },
      data: { status: "PAGA", pago: true, pagoEm: new Date() },
    })
    .catch(() => null);

  if (!fatura) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Fatura não encontrada" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: fatura }, { status: 200 });
}
