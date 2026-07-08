import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_ORIGEM, ORIGEM_DIRETO, slugCodigo } from "@/lib/origem";

// Link fixo rastreado da COMUNIDADE: /r/comunidade?o={origem}
// Tudo (redes sociais, anúncios) aponta pra cá — registra o clique, guarda a
// origem no cookie e joga direto no convite do grupo da comunidade no WhatsApp.
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const bruto = searchParams.get("o");
  const origem = bruto ? slugCodigo(bruto) : ORIGEM_DIRETO;

  try {
    await prisma.cliqueLink.create({ data: { origem, slug: "comunidade" } });
  } catch (e) {
    console.error("Falha ao registrar clique da comunidade:", e);
  }

  // Destino = convite do grupo da comunidade (AVISOS_COMUNIDADE), ou o 1º grupo
  // que tenha link de convite cadastrado. Sem convite → cai na vitrine pública.
  let destino = `${origin}/atacado`;
  try {
    const comunidade =
      (await prisma.grupoWhatsappCategoria.findFirst({
        where: { categoria: "AVISOS_COMUNIDADE", linkConvite: { not: null } },
        select: { linkConvite: true },
      })) ??
      (await prisma.grupoWhatsappCategoria.findFirst({
        where: { linkConvite: { not: null } },
        select: { linkConvite: true },
      }));
    if (comunidade?.linkConvite) destino = comunidade.linkConvite;
  } catch (e) {
    console.error("Falha ao buscar link da comunidade:", e);
  }

  const res = NextResponse.redirect(destino);
  if (origem !== ORIGEM_DIRETO) {
    res.cookies.set(COOKIE_ORIGEM, origem, { maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: false, sameSite: "lax" });
  }
  return res;
}
