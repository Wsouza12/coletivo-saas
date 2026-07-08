import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { repostarCaixaWhatsapp } from "@/lib/atacado";
import { getConfiguracaoFinanceira } from "@/lib/configuracao-financeira";

export const maxDuration = 60; // 60 segundos
export const dynamic = "force-dynamic";

// Verifica se a hora atual (BRT, UTC-3) está dentro do período de descanso.
// Suporta cruzamento de meia-noite: ex. inicio=23 e fim=6 → bloqueia 23:00–05:59.
function estaEmDescanso(horaAtualBRT: number, inicio: number, fim: number): boolean {
  if (inicio === fim) return false; // sem descanso configurado
  if (inicio > fim) {
    // Período cruza meia-noite (ex: 23h → 6h)
    return horaAtualBRT >= inicio || horaAtualBRT < fim;
  }
  // Período dentro do mesmo dia (ex: 2h → 6h)
  return horaAtualBRT >= inicio && horaAtualBRT < fim;
}

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Hora atual em BRT (UTC-3)
    const agora = new Date();
    const horaAtualBRT = (agora.getUTCHours() - 3 + 24) % 24;

    // Verificar horário de descanso — sem envios nesse período
    const config = await getConfiguracaoFinanceira();
    if (estaEmDescanso(horaAtualBRT, config.loopDescansoInicio, config.loopDescansoFim)) {
      return NextResponse.json({
        success: true,
        motivo: "horario_descanso",
        mensagem: `Silêncio ativo (${config.loopDescansoInicio}h–${config.loopDescansoFim}h). Hora atual BRT: ${horaAtualBRT}h.`,
        verificadas: 0,
        repostadas: 0,
      });
    }

    // Busca todas as rodadas abertas que têm o loop ativado e já foram enviadas para um grupo
    const rodadas = await prisma.rodadaAtacado.findMany({
      where: {
        status: "ABERTA",
        loopAtivo: true,
        grupoMensagemEnviada: true,
      },
      include: {
        _count: {
          select: {
            // Conta apenas reservas que já estão pagas para usar na prioridade
            reservas: { where: { status: "PAGO" } }
          }
        }
      }
    });

    // 1. Filtrar as rodadas que já estão na hora de enviar (usando minutos para testes)
    const rodadasParaEnviar = rodadas.filter(rodada => {
      const baseReferencia = rodada.ultimoLoopEnviadoEm || rodada.createdAt;
      const minutosPassados = (agora.getTime() - baseReferencia.getTime()) / (1000 * 60);
      return minutosPassados >= rodada.loopIntervaloMinutos;
    });

    // 2. Ordenar as rodadas conforme a prioridade:
    //    1º Maior % de meta batida (mais rápido de fechar)
    //    2º Maior número de pagantes
    //    3º Caixas mais novas (data de criação)
    rodadasParaEnviar.sort((a, b) => {
      const percA = a.unidadesReservadas / a.metaUnidades;
      const percB = b.unidadesReservadas / b.metaUnidades;
      
      // Se houver diferença na % de conclusão, o maior % vence
      if (Math.abs(percA - percB) > 0.001) {
        return percB - percA; 
      }

      // Desempate 1: Número de pagantes
      const pagantesA = a._count.reservas;
      const pagantesB = b._count.reservas;
      if (pagantesA !== pagantesB) {
        return pagantesB - pagantesA;
      }

      // Desempate 2: Mais recentes primeiro (novas caixas)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    // 3. Inverter a ordem! 
    // Como queremos que as caixas de MAIOR prioridade fiquem no final do chat do WhatsApp 
    // (sendo a última mensagem recebida, logo a mais visível pra quem abrir o grupo), 
    // processamos as de maior prioridade por último.
    rodadasParaEnviar.reverse();

    const rodadasRepostadas: string[] = [];
    const erros: string[] = [];

    // 4. Executar os envios
    for (const rodada of rodadasParaEnviar) {
      try {
        await repostarCaixaWhatsapp(rodada.id);
        rodadasRepostadas.push(rodada.id);
      } catch (err: any) {
        console.error(`Falha ao repostar rodada ${rodada.id}:`, err);
        erros.push(`[${rodada.id}] ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      verificadas: rodadas.length,
      repostadas: rodadasRepostadas.length,
      rodadasRepostadas,
      erros: erros.length > 0 ? erros : undefined,
    });
  } catch (error) {
    console.error("Erro no cron loop atacado:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
