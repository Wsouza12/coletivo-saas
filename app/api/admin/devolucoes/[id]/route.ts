import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateDevolucaoSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updateDevolucaoSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const { status, valorReembolso } = parsed.data;

  const atual = await prisma.devolucao.findUnique({ where: { id } });
  if (!atual) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Devolução não encontrada" } },
      { status: 404 }
    );
  }

  // Reembolso não vira dinheiro de volta — entra como crédito de saldo do lojista,
  // abatido automaticamente na próxima fatura. Idempotente: só credita uma vez.
  const vaiCreditar = status === "REEMBOLSADA" && atual.status !== "REEMBOLSADA" && valorReembolso;

  const [devolucao] = await prisma.$transaction([
    prisma.devolucao.update({
      where: { id },
      data: {
        status,
        ...(valorReembolso !== undefined ? { valorReembolso } : {}),
        ...(status === "REEMBOLSADA" ? { reembolsadoEm: new Date() } : {}),
      },
    }),
    ...(vaiCreditar
      ? [
          prisma.lojista.update({
            where: { id: atual.lojistaId },
            data: { saldoCredito: { increment: valorReembolso } },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ data: devolucao }, { status: 200 });
}
