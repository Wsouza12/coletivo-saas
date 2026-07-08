import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { exchangeMlCode, getMlUser } from "@/lib/mercadolivre";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const lojistaId = searchParams.get("state");
  const erro = searchParams.get("error");

  if (erro || !code || !lojistaId) {
    return NextResponse.redirect(new URL("/integracoes?error=ml", req.url));
  }

  const lojista = await prisma.lojista.findUnique({ where: { id: lojistaId } });
  if (!lojista) {
    return NextResponse.redirect(new URL("/integracoes?error=ml", req.url));
  }

  try {
    const tokens = await exchangeMlCode(code);
    const usuario = await getMlUser(tokens.access_token);

    await prisma.integracao.upsert({
      where: { lojistaId_plataforma: { lojistaId, plataforma: "MERCADOLIVRE" } },
      update: {
        accountId: String(usuario.id),
        accountName: usuario.nickname,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        ativa: true,
      },
      create: {
        lojistaId,
        plataforma: "MERCADOLIVRE",
        accountId: String(usuario.id),
        accountName: usuario.nickname,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });
  } catch (err) {
    console.error("Falha no callback OAuth do Mercado Livre:", err);
    return NextResponse.redirect(new URL("/integracoes?error=ml", req.url));
  }

  return NextResponse.redirect(new URL("/integracoes?success=ml", req.url));
}
