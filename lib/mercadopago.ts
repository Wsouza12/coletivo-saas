import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import type { Fatura, Lojista, User, AssinaturaAtacado, ReservaAtacado } from "@prisma/client";

type FaturaComLojista = Fatura & { lojista: Lojista & { user: User } };

function getClient(): MercadoPagoConfig | null {
  if (!process.env.MP_ACCESS_TOKEN) return null;
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

// Best-effort: sem MP_ACCESS_TOKEN configurado, retorna null e o fluxo de
// envio de fatura segue sem link de pagamento (email ainda é enviado).
export async function createFaturaPaymentLink(
  fatura: FaturaComLojista,
  valorOverride?: number
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const preference = new Preference(client);

  const resultado = await preference.create({
    body: {
      items: [
        {
          id: fatura.id,
          title: `Fatura DropSync #${fatura.numero}`,
          quantity: 1,
          unit_price: valorOverride ?? Number(fatura.valorTotal),
          currency_id: "BRL",
        },
      ],
      payer: {
        email: fatura.lojista.user.email,
        name: fatura.lojista.storeName,
      },
      back_urls: {
        success: `${appUrl}/financeiro`,
        failure: `${appUrl}/financeiro`,
        pending: `${appUrl}/financeiro`,
      },
      auto_return: "approved",
      external_reference: fatura.id,
    },
  });

  return resultado.init_point ?? null;
}

export type PixPayment = {
  paymentId: string;
  qrCode: string; // texto copia-e-cola
  qrCodeBase64: string; // imagem PNG em base64, pra renderizar o QR
  status: string;
};

// Cria uma cobrança Pix direta (não preferência/checkout hospedado) — formato
// de resposta confirmado ao vivo via curl contra a API real antes de codificar
// (point_of_interaction.transaction_data.qr_code / qr_code_base64).
async function createPixPayment(params: {
  externalReference: string;
  amount: number;
  description: string;
  payerEmail: string;
  payerNome: string;
}): Promise<PixPayment | null> {
  const client = getClient();
  if (!client) return null;

  const payment = new Payment(client);
  const [firstName, ...rest] = params.payerNome.trim().split(" ");

  const resultado = await payment.create({
    body: {
      transaction_amount: Math.round(params.amount * 100) / 100,
      description: params.description,
      payment_method_id: "pix",
      payer: {
        email: params.payerEmail,
        first_name: firstName || params.payerNome,
        last_name: rest.join(" ") || undefined,
      },
      external_reference: params.externalReference,
      // Sem isso o MP não sabe pra onde mandar a notificação de pagamento —
      // confirmado em produção: pagamento real aprovado, mas sem nenhum
      // webhook disparado porque notification_url ficou null.
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
    },
    requestOptions: { idempotencyKey: `${params.externalReference}-${Date.now()}` },
  });

  const transactionData = resultado.point_of_interaction?.transaction_data;
  if (!resultado.id || !transactionData?.qr_code || !transactionData?.qr_code_base64) return null;

  return {
    paymentId: String(resultado.id),
    qrCode: transactionData.qr_code,
    qrCodeBase64: transactionData.qr_code_base64,
    status: resultado.status ?? "pending",
  };
}

// Cobrança Pix da assinatura mensal de acesso ao grupo de compras coletivas
// (Fase 6). external_reference com prefixo "assinatura-atacado:" pra
// diferenciar das demais cobranças no mesmo webhook do MP.
export async function createAssinaturaAtacadoPix(assinatura: AssinaturaAtacado): Promise<PixPayment | null> {
  return createPixPayment({
    externalReference: `assinatura-atacado:${assinatura.id}`,
    amount: Number(assinatura.valor),
    description: "DropSync Atacado Coletivo — assinatura mensal",
    payerEmail: assinatura.compradorEmail,
    payerNome: assinatura.compradorNome,
  });
}

// Cobrança Pix de uma reserva numa rodada de compra coletiva (produto + taxa
// de serviço embutida + frete já calculado por CEP). external_reference com
// prefixo "reserva-atacado:".
export async function createReservaAtacadoPix(
  reserva: ReservaAtacado,
  tituloProduto: string
): Promise<PixPayment | null> {
  return createPixPayment({
    externalReference: `reserva-atacado:${reserva.id}`,
    amount: Number(reserva.valorTotal),
    description: `Reserva atacado — ${tituloProduto} (${reserva.quantidade}un)`,
    payerEmail: reserva.compradorEmail,
    payerNome: reserva.compradorNome,
  });
}

// Cobrança Pix da "Lista de Fornecedores" (produto separado). external_reference
// com prefixo "lista-fornecedores:".
export async function createCompraListaPix(params: {
  id: string; valor: number; nome: string; email: string;
}): Promise<PixPayment | null> {
  return createPixPayment({
    externalReference: `lista-fornecedores:${params.id}`,
    amount: params.valor,
    description: "Lista completa de fornecedores + catálogos",
    payerEmail: params.email,
    payerNome: params.nome,
  });
}

export async function buscarPagamentoMP(paymentId: string) {
  const client = getClient();
  if (!client) return null;
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}

export const VALOR_ASSINATURA = 29.99;

// Cobrança da assinatura de acesso (30 dias) — external_reference com prefixo
// "assinatura:" pra diferenciar de pagamento de fatura no webhook.
export async function createAssinaturaPaymentLink(
  lojista: Lojista & { user: User }
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const preference = new Preference(client);

  const resultado = await preference.create({
    body: {
      items: [
        {
          id: `assinatura-${lojista.id}`,
          title: "Assinatura DropSync — 30 dias de acesso",
          quantity: 1,
          unit_price: VALOR_ASSINATURA,
          currency_id: "BRL",
        },
      ],
      payer: {
        email: lojista.user.email,
        name: lojista.storeName,
      },
      back_urls: {
        success: `${appUrl}/dashboard`,
        failure: `${appUrl}/assinatura-expirada`,
        pending: `${appUrl}/assinatura-expirada`,
      },
      auto_return: "approved",
      external_reference: `assinatura:${lojista.id}`,
    },
  });

  return resultado.init_point ?? null;
}
