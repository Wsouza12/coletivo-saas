import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCodeForToken } from "@/lib/instagram";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/atacado/fornecedores?tab=divulgacao&erro=permissao`);
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description") ?? searchParams.get("error_reason") ?? "";

  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/admin/atacado/fornecedores?tab=divulgacao`;

  if (error || !code) {
    const msg = error ? `${error}: ${errorDescription}` : "cancelado";
    return NextResponse.redirect(`${redirectBase}&erro=${encodeURIComponent(msg)}`);
  }

  try {
    const { accessToken, userId, username, expiry } = await exchangeCodeForToken(code);

    // Salva/atualiza na ConfiguracaoFinanceira (singleton)
    const config = await prisma.configuracaoFinanceira.findFirst();
    if (config) {
      await prisma.configuracaoFinanceira.update({
        where: { id: config.id },
        data: { instagramAccessToken: accessToken, instagramUserId: userId, instagramUsername: username, instagramTokenExpiry: expiry },
      });
    } else {
      await prisma.configuracaoFinanceira.create({
        data: { instagramAccessToken: accessToken, instagramUserId: userId, instagramUsername: username, instagramTokenExpiry: expiry },
      });
    }

    return NextResponse.redirect(`${redirectBase}&instagram=conectado&usuario=${encodeURIComponent(username)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.redirect(`${redirectBase}&erro=${encodeURIComponent(msg)}`);
  }
}
