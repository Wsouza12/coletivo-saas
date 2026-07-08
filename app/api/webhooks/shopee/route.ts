import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, redisConfigurado } from "@/lib/redis";
import { decrypt } from "@/lib/crypto";
import { ShopeeClient } from "@/lib/shopee";
import { shopeeOrderToPedido } from "@/lib/mappers/shopee";
import { upsertPedidoDeExterno } from "@/lib/pedido-sync";

type ShopeePushBody = {
  shop_id: number;
  data: { ordersn?: string; order_sn?: string; status?: string };
};

function assinaturaValida(url: string, rawBody: string, assinatura: string | null): boolean {
  if (!assinatura) return false;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY ?? "";
  const baseString = `${url}|${rawBody}`;
  const esperada = crypto.createHmac("sha256", partnerKey).update(baseString).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada));
}

export async function POST(req: Request) {
  if (redisConfigurado) await redis.set("webhook:shopee:lastReceived", new Date().toISOString()).catch(() => {});

  const rawBody = await req.text();
  const assinatura = req.headers.get("authorization");

  if (!assinaturaValida(req.url, rawBody, assinatura)) {
    return NextResponse.json({ error: { code: "INVALID_SIGNATURE" } }, { status: 401 });
  }

  let body: ShopeePushBody;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: { code: "INVALID_BODY" } }, { status: 400 });
  }

  const orderSn = body.data?.ordersn ?? body.data?.order_sn;
  if (!orderSn) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const integracao = await prisma.integracao.findFirst({
    where: { plataforma: "SHOPEE", accountId: String(body.shop_id), ativa: true },
  });
  if (!integracao) {
    console.warn(`Webhook Shopee: nenhuma integração ativa para a loja ${body.shop_id}`);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    const client = new ShopeeClient(
      process.env.SHOPEE_PARTNER_ID ?? "",
      process.env.SHOPEE_PARTNER_KEY ?? "",
      decrypt(integracao.accessToken),
      integracao.accountId
    );

    const detalhe = await client.getOrderDetail(orderSn);
    const mapeado = shopeeOrderToPedido(detalhe);
    const resultado = await upsertPedidoDeExterno(integracao.lojistaId, mapeado);

    return NextResponse.json({ ok: true, ...resultado }, { status: 200 });
  } catch (err) {
    console.error("Falha ao processar webhook da Shopee:", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
