import { Resend } from "resend";
import type { PedidoStatus } from "@prisma/client";

const FROM = "DropSync <onboarding@resend.dev>";

const MENSAGENS_ETAPA: Record<string, { emoji: string; titulo: string }> = {
  CONFIRMADO: { emoji: "✅", titulo: "Seu pedido foi confirmado" },
  SEPARANDO: { emoji: "📦", titulo: "Seu pedido está sendo separado" },
  EMBALANDO: { emoji: "📦", titulo: "Seu pedido está sendo embalado" },
  AGUARDANDO_COLETA: { emoji: "🚚", titulo: "Seu pedido aguarda coleta da transportadora" },
  ENVIADO: { emoji: "🚀", titulo: "Seu pedido foi enviado" },
  ENTREGUE: { emoji: "🎉", titulo: "Seu pedido foi entregue" },
};

type DadosNotificacao = {
  numero: string;
  produto: string;
  rastreio?: string | null;
  rastreioToken: string;
};

function montarLink(rastreioToken: string): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/rastreio/${rastreioToken}`;
}

function montarTexto(etapa: string, pedido: DadosNotificacao): string | null {
  const msg = MENSAGENS_ETAPA[etapa];
  if (!msg) return null;

  const link = montarLink(pedido.rastreioToken);

  return `${msg.emoji} ${msg.titulo}

Pedido: #${pedido.numero}
Produto: ${pedido.produto}
${pedido.rastreio ? `Rastreio: ${pedido.rastreio}` : ""}

Acompanhe: ${link}`;
}

// WhatsApp — só texto, sem foto. As fotos das etapas ficam restritas ao admin.
export async function notificarCliente(telefone: string | null | undefined, etapa: string, pedido: DadosNotificacao): Promise<void> {
  if (!telefone) return;
  const texto = montarTexto(etapa, pedido);
  if (!texto) return;

  if (!process.env.EVOLUTION_API_URL || !process.env.EVOLUTION_INSTANCE || !process.env.EVOLUTION_API_KEY) {
    console.warn("Evolution API não configurada — notificação WhatsApp não enviada.");
    return;
  }

  try {
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({ number: telefone, text: texto }),
    });
  } catch (err) {
    console.error(`Falha ao enviar WhatsApp para ${telefone}:`, err);
  }
}

// Email — só texto, sem foto.
export async function notificarClienteEmail(email: string | null | undefined, etapa: string, pedido: DadosNotificacao): Promise<void> {
  if (!email) return;
  const msg = MENSAGENS_ETAPA[etapa];
  const texto = montarTexto(etapa, pedido);
  if (!msg || !texto) return;
  if (!process.env.RESEND_API_KEY) return;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `${msg.titulo} — Pedido #${pedido.numero}`,
      text: texto,
    });
  } catch (err) {
    console.error(`Falha ao enviar email para ${email}:`, err);
  }
}

// Dispara as duas notificações (WhatsApp + email) para uma etapa do pedido.
export async function notificarEtapaPedido(params: {
  telefone?: string | null;
  email?: string | null;
  etapa: PedidoStatus;
  pedido: DadosNotificacao;
}): Promise<void> {
  await Promise.all([
    notificarCliente(params.telefone, params.etapa, params.pedido),
    notificarClienteEmail(params.email, params.etapa, params.pedido),
  ]);
}
