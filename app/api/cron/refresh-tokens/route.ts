import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { refreshMlToken } from "@/lib/mercadolivre";
import { refreshShopeeToken } from "@/lib/shopee";

// Substitui o worker BullMQ "refreshTokensWorker" pedido no prompt original:
// como o deploy é Vercel serverless (CLAUDE.md), não há processo Node de
// longa duração pra manter um worker BullMQ vivo. Use Vercel Cron ou Upstash
// QStash apontando para esta rota a cada poucas horas.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const limite = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const integracoes = await prisma.integracao.findMany({
    where: { ativa: true, tokenExpiry: { lt: limite } },
  });

  const resultados = { renovadas: 0, erros: [] as string[] };

  for (const integracao of integracoes) {
    try {
      const refreshToken = decrypt(integracao.refreshToken);

      if (integracao.plataforma === "MERCADOLIVRE") {
        const tokens = await refreshMlToken(refreshToken);
        await prisma.integracao.update({
          where: { id: integracao.id },
          data: {
            accessToken: encrypt(tokens.access_token),
            refreshToken: encrypt(tokens.refresh_token),
            tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
          },
        });
      } else {
        const tokens = await refreshShopeeToken(refreshToken, integracao.accountId);
        await prisma.integracao.update({
          where: { id: integracao.id },
          data: {
            accessToken: encrypt(tokens.access_token),
            refreshToken: encrypt(tokens.refresh_token),
            tokenExpiry: new Date(Date.now() + tokens.expire_in * 1000),
          },
        });
      }
      resultados.renovadas++;
    } catch (err) {
      console.error(`Falha ao renovar token da integração ${integracao.id}:`, err);
      resultados.erros.push(integracao.id);
    }
  }

  return NextResponse.json({ data: resultados }, { status: 200 });
}
