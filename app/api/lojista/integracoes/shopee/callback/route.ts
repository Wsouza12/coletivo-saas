import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { exchangeShopeeCode, getShopeeShopInfo } from "@/lib/shopee";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const shopId = searchParams.get("shop_id");
  const lojistaId = searchParams.get("state");

  if (!code || !shopId || !lojistaId) {
    return NextResponse.redirect(new URL("/integracoes?error=shopee", req.url));
  }

  const lojista = await prisma.lojista.findUnique({ where: { id: lojistaId } });
  if (!lojista) {
    return NextResponse.redirect(new URL("/integracoes?error=shopee", req.url));
  }

  try {
    const tokens = await exchangeShopeeCode(code, shopId);
    const loja = await getShopeeShopInfo(tokens.access_token, shopId);

    await prisma.integracao.upsert({
      where: { lojistaId_plataforma: { lojistaId, plataforma: "SHOPEE" } },
      update: {
        accountId: shopId,
        accountName: loja.shop_name,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiry: new Date(Date.now() + tokens.expire_in * 1000),
        ativa: true,
      },
      create: {
        lojistaId,
        plataforma: "SHOPEE",
        accountId: shopId,
        accountName: loja.shop_name,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiry: new Date(Date.now() + tokens.expire_in * 1000),
      },
    });
  } catch (err) {
    console.error("Falha no callback OAuth da Shopee:", err);
    return NextResponse.redirect(new URL("/integracoes?error=shopee", req.url));
  }

  return NextResponse.redirect(new URL("/integracoes?success=shopee", req.url));
}
