import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const FROM = "DropSync <onboarding@resend.dev>";

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Envio best-effort: falha de email nunca deve quebrar a operação de negócio.
// Cada tentativa é registrada em EmailLog (sent/failed/skipped), usado pelo
// painel de status do sistema (5.6).
async function send(to: string, subject: string, text: string, template: string) {
  const resend = getClient();
  if (!resend) {
    await prisma.emailLog.create({ data: { to, subject, template, status: "skipped" } }).catch(() => {});
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, text });
    await prisma.emailLog.create({ data: { to, subject, template, status: "sent" } }).catch(() => {});
  } catch (err) {
    console.error(`Falha ao enviar email "${subject}" para ${to}:`, err);
    await prisma.emailLog
      .create({ data: { to, subject, template, status: "failed", error: String(err) } })
      .catch(() => {});
  }
}

export async function sendNovoCadastroAdmin(params: {
  adminEmail: string;
  nomeLojista: string;
  email: string;
  storeName: string;
}) {
  await send(
    params.adminEmail,
    "Novo cadastro de lojista — DropSync",
    `${params.nomeLojista} (${params.email}) cadastrou a loja "${params.storeName}" e aguarda aprovação.`,
    "NovoLojista"
  );
}

export async function sendLojistaAprovado(params: { email: string; storeName: string }) {
  await send(
    params.email,
    "Sua conta DropSync foi aprovada!",
    `Olá! A loja "${params.storeName}" foi aprovada. Você já pode fazer login e começar a publicar produtos do catálogo.`,
    "BemVindoLojista"
  );
}

export async function sendLojistaSuspenso(params: { email: string; storeName: string }) {
  await send(
    params.email,
    "Sua conta DropSync foi suspensa",
    `A loja "${params.storeName}" foi suspensa pelo administrador. Entre em contato para mais informações.`,
    "LojistaSuspenso"
  );
}

export async function sendPedidoRecebidoAdmin(params: {
  adminEmail: string;
  pedidoId: string;
  plataformaOrderId: string;
  plataforma: string;
  storeName: string;
  produto: string;
}) {
  await send(
    params.adminEmail,
    `Novo pedido #${params.plataformaOrderId} — ${params.produto} via ${params.plataforma}`,
    `Loja: ${params.storeName}\nProduto: ${params.produto}\nPlataforma: ${params.plataforma}\nPedido: #${params.plataformaOrderId}\n\nVer no admin: ${process.env.NEXT_PUBLIC_APP_URL}/admin/pedidos/${params.pedidoId}`,
    "PedidoRecebido"
  );
}

const STATUS_LABEL: Record<string, string> = {
  NOVO: "Novo",
  CONFIRMADO: "Confirmado",
  SEPARANDO: "Em separação",
  EMBALANDO: "Em embalagem",
  AGUARDANDO_COLETA: "Aguardando coleta",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
  DEVOLVIDO: "Devolvido",
};

export async function sendPedidoStatusAtualizado(params: {
  email: string;
  pedidoId: string;
  status: string;
  rastreio?: string | null;
}) {
  const label = STATUS_LABEL[params.status] ?? params.status;
  const rastreioTxt = params.rastreio ? ` Código de rastreio: ${params.rastreio}.` : "";
  await send(
    params.email,
    `Pedido atualizado — ${label}`,
    `O pedido #${params.pedidoId} agora está com status "${label}".${rastreioTxt}`,
    "PedidoEnviado"
  );
}

export async function sendFaturaEnviada(params: {
  email: string;
  numero: string;
  valorTotal: string;
  vencimento: string;
  linkPagamento?: string;
}) {
  const link = params.linkPagamento ? ` Pague aqui: ${params.linkPagamento}` : "";
  await send(
    params.email,
    `Fatura ${params.numero} disponível — DropSync`,
    `A fatura ${params.numero} no valor de ${params.valorTotal} vence em ${params.vencimento}.${link}`,
    "FaturaEmitida"
  );
}

export async function sendFaturaPaga(params: { email: string; numero: string; valorTotal: string }) {
  await send(
    params.email,
    `Pagamento confirmado — Fatura ${params.numero}`,
    `Recebemos o pagamento da fatura ${params.numero} no valor de ${params.valorTotal}. Obrigado!`,
    "FaturaPaga"
  );
}

export async function sendFaturaVencendo(params: {
  email: string;
  numero: string;
  valorTotal: string;
  linkPagamento?: string | null;
}) {
  const link = params.linkPagamento ? ` Pague aqui: ${params.linkPagamento}` : "";
  await send(
    params.email,
    `⚠️ Fatura ${params.numero} vence em 2 dias`,
    `A fatura ${params.numero} no valor de ${params.valorTotal} vence em 2 dias.${link}`,
    "FaturaVencendo"
  );
}

export async function sendEmailTeste(adminEmail: string) {
  await send(
    adminEmail,
    "Email de teste — DropSync",
    `Este é um email de teste disparado manualmente pelo painel de Sistema em ${new Date().toLocaleString("pt-BR")}.`,
    "Teste"
  );
}
