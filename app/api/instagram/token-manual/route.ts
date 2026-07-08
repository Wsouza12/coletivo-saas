import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const IG_APP_ID = process.env.INSTAGRAM_APP_ID!;
const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;
const GRAPH = "https://graph.instagram.com";

const schema = z.object({
  token: z.string().min(10),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION" } }, { status: 422 });

  const { token } = parsed.data;

  // Troca por token de longa duração (60 dias)
  const longRes = await fetch(
    `${GRAPH}/access_token?grant_type=ig_exchange_token&client_id=${IG_APP_ID}&client_secret=${IG_APP_SECRET}&access_token=${token}`
  );
  const longJson = await longRes.json();

  const accessToken = longJson.access_token ?? token;
  const expiresIn = longJson.expires_in ?? 5184000;

  // Busca dados do usuário
  const meRes = await fetch(`${GRAPH}/me?fields=id,username&access_token=${accessToken}`);
  const meJson = await meRes.json();

  if (!meJson.id) {
    return NextResponse.json({ error: { code: "TOKEN_INVALIDO", message: meJson.error?.message ?? "Token inválido" } }, { status: 400 });
  }

  const expiry = new Date(Date.now() + expiresIn * 1000);

  const config = await prisma.configuracaoFinanceira.findFirst();
  if (config) {
    await prisma.configuracaoFinanceira.update({
      where: { id: config.id },
      data: {
        instagramAccessToken: accessToken,
        instagramUserId: meJson.id,
        instagramUsername: meJson.username ?? "",
        instagramTokenExpiry: expiry,
      },
    });
  } else {
    await prisma.configuracaoFinanceira.create({
      data: {
        instagramAccessToken: accessToken,
        instagramUserId: meJson.id,
        instagramUsername: meJson.username ?? "",
        instagramTokenExpiry: expiry,
      },
    });
  }

  return NextResponse.json({ data: { username: meJson.username, userId: meJson.id, expiry } });
}
