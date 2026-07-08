import { prisma } from "@/lib/prisma";
import { enviarMensagemGrupo, enviarImagemGrupo, enviarVideoGrupo } from "@/lib/evolution";
import { codigoOrigemGrupo, marcarLinksOrigem } from "@/lib/origem";

// Um bloco = 1 mensagem no WhatsApp. Uma postagem tem 1+ blocos, enviados em ordem.
export type BlocoPostagem = {
  tipo: "TEXTO" | "IMAGEM" | "VIDEO";
  url?: string;      // obrigatório para IMAGEM/VIDEO
  legenda?: string;  // texto (TEXTO) ou caption (IMAGEM/VIDEO)
};

function pausa(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Envia uma postagem já agendada para todos os grupos de destino, em ordem de bloco.
// Espaça os envios pra reduzir risco de bloqueio do WhatsApp.
export async function dispararPostagem(id: string): Promise<{ ok: boolean; erro?: string }> {
  const post = await prisma.postagemAgendada.findUnique({ where: { id } });
  if (!post) return { ok: false, erro: "Postagem não encontrada" };
  if (post.status === "ENVIADA") return { ok: true };

  const blocos = (post.blocos as unknown as BlocoPostagem[]) ?? [];
  const grupos = post.gruposJids ?? [];
  if (blocos.length === 0 || grupos.length === 0) {
    await prisma.postagemAgendada.update({
      where: { id },
      data: { status: "ERRO", erro: "Sem blocos ou sem grupos" },
    });
    return { ok: false, erro: "Sem blocos ou sem grupos" };
  }

  await prisma.postagemAgendada.update({ where: { id }, data: { status: "ENVIANDO" } });

  try {
    for (const grupo of grupos) {
      // Marca os links da legenda com o código deste grupo (rastreamento de origem)
      const codigoOrigem = await codigoOrigemGrupo(grupo);
      for (const bloco of blocos) {
        const legenda = marcarLinksOrigem(bloco.legenda ?? "", codigoOrigem);
        if (bloco.tipo === "TEXTO") {
          if (legenda.trim()) await enviarMensagemGrupo(grupo, legenda);
        } else if (bloco.tipo === "IMAGEM" && bloco.url) {
          await enviarImagemGrupo(grupo, bloco.url, legenda);
        } else if (bloco.tipo === "VIDEO" && bloco.url) {
          await enviarVideoGrupo(grupo, bloco.url, legenda);
        }
        await pausa(2500); // espaçamento entre mensagens
      }
      await pausa(1500); // espaçamento entre grupos
    }

    await prisma.postagemAgendada.update({
      where: { id },
      data: { status: "ENVIADA", enviadoEm: new Date(), erro: null },
    });
    return { ok: true };
  } catch (e: any) {
    const erro = e?.message ?? String(e);
    await prisma.postagemAgendada.update({ where: { id }, data: { status: "ERRO", erro } });
    return { ok: false, erro };
  }
}

// Processa todas as postagens vencidas (agendadoPara <= agora, status PENDENTE).
// Chamada pelo cron. Processa uma por vez pra não estourar o timeout / rate limit.
export async function processarPostagensVencidas(): Promise<{ processadas: number; erros: string[] }> {
  const agora = new Date();
  const vencidas = await prisma.postagemAgendada.findMany({
    where: { status: "PENDENTE", agendadoPara: { lte: agora } },
    orderBy: { agendadoPara: "asc" },
    take: 3, // no máximo 3 por execução do cron pra caber no tempo
    select: { id: true },
  });

  const erros: string[] = [];
  let processadas = 0;
  for (const { id } of vencidas) {
    const r = await dispararPostagem(id);
    if (r.ok) processadas++;
    else erros.push(`${id}: ${r.erro}`);
  }
  return { processadas, erros };
}
