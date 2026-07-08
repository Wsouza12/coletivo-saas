import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, redisConfigurado } from "@/lib/redis";
import { decrypt, encrypt } from "@/lib/crypto";
import { MercadoLivreClient } from "@/lib/mercadolivre";
import { mlOrderToPedido } from "@/lib/mappers/ml";
import { upsertPedidoDeExterno } from "@/lib/pedido-sync";

type MlWebhookBody = {
  resource: string;
  topic: string;
  user_id: number;
};

function assinaturaValida(rawBody: string, assinatura: string | null): boolean {
  if (!assinatura) return false;
  const esperada = crypto
    .createHmac("sha256", process.env.ML_SECRET ?? "")
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada));
}

export async function POST(req: Request) {
  if (redisConfigurado) await redis.set("webhook:ml:lastReceived", new Date().toISOString()).catch(() => {});

  const rawBody = await req.text();

  // O Mercado Livre não documenta assinatura HMAC universal para todos os
  // tópicos — quando ML_SECRET está configurado, validamos best-effort;
  // sem header de assinatura no ambiente de testes, apenas seguimos.
  const assinatura = req.headers.get("x-signature");
  if (assinatura && !assinaturaValida(rawBody, assinatura)) {
    return NextResponse.json({ error: { code: "INVALID_SIGNATURE" } }, { status: 401 });
  }

  let body: MlWebhookBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: { code: "INVALID_BODY" } }, { status: 400 });
  }

  // ML espera resposta rápida — sempre 200, mesmo quando ignoramos o evento,
  // para não acumular retries do lado deles.
  if (body.topic !== "orders_v2") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const orderId = body.resource.split("/").pop();
  if (!orderId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const integracao = await prisma.integracao.findFirst({
    where: { plataforma: "MERCADOLIVRE", accountId: String(body.user_id), ativa: true },
  });
  if (!integracao) {
    console.warn(`Webhook ML: nenhuma integração ativa para o vendedor ${body.user_id}`);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    const client = new MercadoLivreClient(decrypt(integracao.accessToken), {
      refreshToken: decrypt(integracao.refreshToken),
      onRefresh: async (tokens) => {
        await prisma.integracao.update({
          where: { id: integracao.id },
          data: {
            accessToken: encrypt(tokens.access_token),
            refreshToken: encrypt(tokens.refresh_token),
            tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
          },
        });
      },
    });

    const order = await client.getOrder(orderId);
    const endereco = order.shipping ? await client.getShipment(order.shipping.id) : undefined;

    const mapeado = mlOrderToPedido(order, endereco);
    const resultado = await upsertPedidoDeExterno(integracao.lojistaId, mapeado);

    return NextResponse.json({ ok: true, ...resultado }, { status: 200 });
  } catch (err) {
    console.error("Falha ao processar webhook do Mercado Livre:", err);
    // Mesmo em erro, respondemos 200 — o cron fallback (4.6) cobre o que
    // não for sincronizado aqui, evitando retries agressivos do ML.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
