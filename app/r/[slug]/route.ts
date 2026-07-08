import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COOKIE_ORIGEM, ORIGEM_DIRETO, slugCodigo } from "@/lib/origem";

// Link curto rastreado: /r/{slug}?o={origem} → grava o clique, guarda a origem
// num cookie (7 dias) e redireciona pro checkout /atacado/{slug}.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { searchParams, origin } = new URL(req.url);
  const bruto = searchParams.get("o");
  const origem = bruto ? slugCodigo(bruto) : ORIGEM_DIRETO;

  // Registra o clique (best-effort — nunca trava o redirect)
  try {
    await prisma.cliqueLink.create({ data: { origem, slug } });
  } catch (e) {
    console.error("Falha ao registrar clique:", e);
  }

  const res = NextResponse.redirect(`${origin}/atacado/${slug}`);
  // Guarda a origem pra atribuir à reserva no checkout (7 dias)
  if (origem !== ORIGEM_DIRETO) {
    res.cookies.set(COOKIE_ORIGEM, origem, { maxAge: 60 * 60 * 24 * 7, path: "/", httpOnly: false, sameSite: "lax" });
  }
  return res;
}
