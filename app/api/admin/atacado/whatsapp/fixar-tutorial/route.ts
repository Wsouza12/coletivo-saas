import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const TUTORIAL = `📌 *Bem-vindo(a) à JN Compras Coletivas!*

Aqui está um guia rápido dos nossos grupos 👇

📦 *Grupo Pedidos*
→ Envie o nome ou código do produto para solicitar a abertura de uma caixa. Só isso! Sem conversas paralelas.

📋 *Grupo Catálogo*
→ Fechado. Só o admin posta aqui: catálogos de fornecedores, novos produtos e promoções.

💡 *Grupo Ideias & Sugestões*
→ Aberto para todos! Compartilhe ideias, sugestões de produtos, feedback — qualquer assunto.

🛒 *Grupo Produtos Disponíveis*
→ Aqui postamos as caixas abertas todos os dias. Veja os produtos disponíveis e faça sua reserva!

❓ *Dúvidas?* É só chamar aqui no grupo. 😊`;

function getEvolutionConfig() {
  const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
  const instance = process.env.EVOLUTION_INSTANCE;
  const apiKey = process.env.EVOLUTION_API_KEY;
  if (!baseUrl || !instance || !apiKey) return null;
  return { baseUrl, instance, apiKey };
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { grupoJid } = await req.json();
  if (!grupoJid) return NextResponse.json({ error: { code: "VALIDATION", message: "grupoJid obrigatório" } }, { status: 422 });

  const config = getEvolutionConfig();
  if (!config) return NextResponse.json({ error: { code: "EVOLUTION_NAO_CONFIGURADA" } }, { status: 422 });

  // 1. Envia a mensagem
  const sendRes = await fetch(`${config.baseUrl}/message/sendText/${config.instance}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ number: grupoJid, text: TUTORIAL, options: { linkPreview: false } }),
  });
  const sendJson = await sendRes.json();
  if (!sendRes.ok) {
    return NextResponse.json({ error: { code: "ENVIO_FALHOU", message: sendJson?.message ?? "Erro ao enviar" } }, { status: 422 });
  }

  const messageId = sendJson?.key?.id;
  if (!messageId) {
    return NextResponse.json({ data: { enviado: true, fixado: false, motivo: "ID da mensagem não retornado" } });
  }

  // 2. Fixa a mensagem (30 dias)
  await new Promise(r => setTimeout(r, 1500));
  const pinRes = await fetch(`${config.baseUrl}/message/pin/${config.instance}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      number: grupoJid,
      messageId,
      duration: 2592000, // 30 dias em segundos
    }),
  });

  const fixado = pinRes.ok;
  return NextResponse.json({ data: { enviado: true, fixado, messageId } });
}
