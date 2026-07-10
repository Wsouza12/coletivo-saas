import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enviarImagemGrupo, enviarMensagemGrupo } from "@/lib/evolution";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.dropyatacado.com.br";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  // Aceita grupoId/grupoNome direto no body, ou busca o vinculado à categoria PRODUTOS_DISPONIVEIS
  let grupoId: string;
  let grupoNome: string;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.grupoId) {
      grupoId = body.grupoId;
      grupoNome = body.grupoNome ?? body.grupoId;
    } else {
      let grupoVinculo = await prisma.grupoWhatsappCategoria.findFirst({
        where: { categoria: "CAIXAS_ABERTAS" },
      });
      if (!grupoVinculo) {
        grupoVinculo = await prisma.grupoWhatsappCategoria.findFirst({
          where: { categoria: "PRODUTOS_DISPONIVEIS" },
        });
      }
      if (!grupoVinculo) {
        return NextResponse.json(
          { error: { code: "GRUPO_NAO_CONFIGURADO", message: "Grupo 'Produtos Disponíveis' não vinculado. Configure no painel WhatsApp ou escolha um grupo." } },
          { status: 422 }
        );
      }
      grupoId = grupoVinculo.grupoId;
      grupoNome = grupoVinculo.grupoNome;
    }
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION" } }, { status: 422 });
  }

  // Busca todas as caixas ABERTAS ainda não anunciadas
  const rodadas = await prisma.rodadaAtacado.findMany({
    where: { status: "ABERTA", grupoMensagemEnviada: false },
    include: {
      produtoAtacado: { select: { nome: true, imagemUrl: true, unidadesPorCaixa: true, categoria: true, codigo: true } },
      variacao: { select: { nome: true, tipo: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (rodadas.length === 0) {
    return NextResponse.json({ data: { enviadas: 0, mensagem: "Nenhuma caixa nova para anunciar." } });
  }

  let enviadas = 0;
  const erros: string[] = [];

  for (const rodada of rodadas) {
    try {
      const produto = rodada.produtoAtacado;
      const nomeCompleto = rodada.variacao
        ? `${produto.nome} — ${rodada.variacao.nome}`
        : produto.nome;
      const linkReserva = `${APP_URL}/atacado/${rodada.slug}`;
      const progresso = Math.min(100, Math.round((rodada.unidadesReservadas / rodada.metaUnidades) * 100));

      const legenda = `🛒 *${nomeCompleto.toUpperCase()}*

📦 Caixa com: *${produto.unidadesPorCaixa} unidades*
💰 Preço por unidade: *R$ ${Number(rodada.precoFinalUnitario).toFixed(2).replace(".", ",")}*
📊 Reservado: ${progresso}% (${rodada.unidadesReservadas}/${rodada.metaUnidades} un.)

👉 Reserve agora:
${linkReserva}`;

      if (produto.imagemUrl) {
        await enviarImagemGrupo(grupoId, produto.imagemUrl, legenda);
      } else {
        await enviarMensagemGrupo(grupoId, legenda);
      }

      await prisma.rodadaAtacado.update({
        where: { id: rodada.id },
        data: { grupoMensagemEnviada: true, grupoIdUsado: grupoId },
      });

      enviadas++;
      // Pausa de 3s entre cada envio para não bater no rate limit
      if (enviadas < rodadas.length) {
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch (err: any) {
      console.error(`Erro ao disparar rodada ${rodada.id}:`, err);
      erros.push(`${rodada.produtoAtacado.nome}: ${err.message}`);
    }
  }

  return NextResponse.json({
    data: {
      enviadas,
      total: rodadas.length,
      erros: erros.length > 0 ? erros : undefined,
    },
  });
}
