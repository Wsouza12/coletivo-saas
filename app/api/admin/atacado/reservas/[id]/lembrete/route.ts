import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enviarMensagemIndividual } from "@/lib/evolution";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;

  const reserva = await prisma.reservaAtacado.findUnique({
    where: { id },
    include: {
      rodada: {
        include: { produtoAtacado: true },
      },
    },
  });

  if (!reserva) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  if (reserva.status !== "AGUARDANDO_PAGAMENTO") {
    return NextResponse.json(
      { error: { code: "INVALID_STATE", message: "Esta reserva não está mais aguardando pagamento." } },
      { status: 400 }
    );
  }

  if (!reserva.mpQrCode) {
    return NextResponse.json(
      { error: { code: "NO_PIX", message: "Esta reserva não tem uma chave PIX gerada." } },
      { status: 400 }
    );
  }

  const ddiTelefone = reserva.compradorTelefone.replace(/\D/g, "");
  const numeroWpp = ddiTelefone.startsWith("55") ? ddiTelefone : `55${ddiTelefone}`;

  const textoPix = [
    `🔔 *Lembrete de Pagamento*`,
    `Produto: ${reserva.rodada.produtoAtacado.nome}`,
    `Quantidade: ${reserva.quantidade}un`,
    ``,
    `Sua reserva na rodada de compra coletiva continua aguardando pagamento.`,
    `Copie a chave PIX Copia e Cola abaixo para garantir sua cota:`,
    ``,
    reserva.mpQrCode
  ].join("\n");

  try {
    await enviarMensagemIndividual(numeroWpp, textoPix);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Falha ao enviar PIX de lembrete pro WhatsApp:", error);
    return NextResponse.json(
      { error: { code: "EVOLUTION_ERROR", message: "Falha ao enviar mensagem pelo WhatsApp." } },
      { status: 500 }
    );
  }
}
