import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePedidoStatusSchema } from "@/lib/validations";
import { sendPedidoStatusAtualizado } from "@/lib/email";
import { notificarEtapaPedido } from "@/lib/notificacoes";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const parsed = updatePedidoStatusSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const { status, rastreio, transportadora, notaFiscal, motivoCancelamento } = parsed.data;
  const now = new Date();

  const timestampField =
    status === "EMBALANDO"
      ? { embalagemEm: now }
      : status === "ENVIADO"
        ? { enviadoEm: now }
        : status === "ENTREGUE"
          ? { entregueEm: now }
          : status === "CANCELADO"
            ? { canceladoEm: now }
            : {};

  const pedido = await prisma.$transaction(async (tx) => {
    const atual = await tx.pedido.findUniqueOrThrow({
      where: { id },
      include: { lojista: { include: { user: true } }, itens: { include: { produto: true }, take: 1 } },
    });

    const atualizado = await tx.pedido.update({
      where: { id },
      data: {
        status,
        rastreio,
        transportadora,
        notaFiscal,
        motivoCancelamento,
        ...timestampField,
      },
    });

    return {
      ...atualizado,
      lojistaEmail: atual.lojista.user.email,
      produtoNome: atual.itens[0]?.produto.nome ?? "Produto",
    };
  });

  await sendPedidoStatusAtualizado({
    email: pedido.lojistaEmail,
    pedidoId: pedido.id,
    status: pedido.status,
    rastreio: pedido.rastreio,
  });

  // Notifica o cliente final (WhatsApp + email) — só texto com link de rastreio, sem fotos.
  await notificarEtapaPedido({
    telefone: pedido.compradorTelefone,
    email: pedido.compradorEmail,
    etapa: pedido.status,
    pedido: {
      numero: pedido.plataformaOrderId,
      produto: pedido.produtoNome,
      rastreio: pedido.rastreio,
      rastreioToken: pedido.rastreioToken,
    },
  });

  // TODO Fase 4: ao marcar ENVIADO, enfileirar job BullMQ para sincronizar
  // status do pedido na API do Mercado Livre / Shopee.

  return NextResponse.json({ data: pedido }, { status: 200 });
}
