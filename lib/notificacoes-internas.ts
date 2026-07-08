import { prisma } from "@/lib/prisma";
import type { NotificacaoDestino } from "@prisma/client";

// Central de notificações in-app (sino no topbar) — diferente de
// lib/notificacoes.ts, que é WhatsApp/email pro cliente final.
export async function criarNotificacao(input: {
  destinatario: NotificacaoDestino;
  lojistaId?: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
}) {
  // Melhor-esforço — nunca deve derrubar o fluxo (webhook de pedido, sync)
  // que a disparou.
  try {
    await prisma.notificacao.create({
      data: {
        destinatario: input.destinatario,
        lojistaId: input.lojistaId,
        tipo: input.tipo,
        titulo: input.titulo,
        mensagem: input.mensagem,
        link: input.link,
      },
    });
  } catch (err) {
    console.error("Falha ao criar notificação interna:", err);
  }
}

// Cria uma notificação igual pra TODOS os lojistas ativos (ex: SKU novo no catálogo,
// estoque de algum produto zerou) — diferente de criarNotificacao, que é sempre pra
// um lojista específico (dono do evento). Uma linha por lojista, já que o model
// Notificacao não tem conceito de "todos" — só lojistaId individual.
export async function criarNotificacaoBroadcastLojistas(input: {
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string;
}) {
  try {
    const lojistas = await prisma.lojista.findMany({
      where: { user: { status: "ACTIVE" } },
      select: { id: true },
    });
    await prisma.notificacao.createMany({
      data: lojistas.map((l) => ({
        destinatario: "LOJISTA" as const,
        lojistaId: l.id,
        tipo: input.tipo,
        titulo: input.titulo,
        mensagem: input.mensagem,
        link: input.link,
      })),
    });
  } catch (err) {
    console.error("Falha ao criar notificação broadcast pros lojistas:", err);
  }
}
