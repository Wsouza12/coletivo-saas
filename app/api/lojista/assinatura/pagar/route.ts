import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAssinaturaPaymentLink } from "@/lib/mercadopago";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const lojista = await prisma.lojista.findUniqueOrThrow({
    where: { id: session.user.lojistaId },
    include: { user: true },
  });

  const link = await createAssinaturaPaymentLink(lojista);
  if (!link) {
    return NextResponse.json(
      { error: { code: "MP_INDISPONIVEL", message: "Pagamento indisponível no momento" } },
      { status: 502 }
    );
  }

  return NextResponse.json({ data: { link } }, { status: 200 });
}
