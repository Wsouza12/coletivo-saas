import { NextResponse } from "next/server";
import type { DevolucaoStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDevolucaoSchema } from "@/lib/validations";

const STATUS_GROUPS: Record<string, DevolucaoStatus[]> = {
  pendentes: ["SOLICITADA"],
  andamento: ["EM_ANDAMENTO"],
  concluidas: ["REEMBOLSADA", "NEGADA"],
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const tab = new URL(req.url).searchParams.get("tab") ?? "todas";
  const statusIn = STATUS_GROUPS[tab] ?? [];

  const items = await prisma.devolucao.findMany({
    where: {
      lojistaId: session.user.lojistaId,
      ...(statusIn.length > 0 ? { status: { in: statusIn } } : {}),
    },
    include: { pedido: { select: { id: true, plataformaOrderId: true, compradorNome: true, valorVenda: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: items }, { status: 200 });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const parsed = createDevolucaoSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const pedido = await prisma.pedido.findUnique({ where: { id: parsed.data.pedidoId } });
  if (!pedido || pedido.lojistaId !== session.user.lojistaId) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pedido não encontrado" } },
      { status: 404 }
    );
  }

  const existente = await prisma.devolucao.findUnique({ where: { pedidoId: pedido.id } });
  if (existente) {
    return NextResponse.json(
      { error: { code: "JA_EXISTE", message: "Já existe uma devolução solicitada para este pedido" } },
      { status: 409 }
    );
  }

  const devolucao = await prisma.devolucao.create({
    data: {
      pedidoId: pedido.id,
      lojistaId: session.user.lojistaId,
      motivo: parsed.data.motivo,
    },
  });

  return NextResponse.json({ data: devolucao }, { status: 201 });
}
