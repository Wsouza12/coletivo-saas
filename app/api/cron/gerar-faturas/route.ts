import { NextResponse } from "next/server";
import { redis, redisConfigurado } from "@/lib/redis";
import { executarGeracaoQuinzenal } from "@/lib/financeiro";

// Substitui o worker BullMQ "faturaWorker" — agende via Vercel Cron nos dias
// 1 e 16 de cada mês (ver vercel.json). Gera as faturas da quinzena vigente
// e já envia (link MP + email) cada uma.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const faturas = await executarGeracaoQuinzenal();

  if (redisConfigurado) {
    await redis
      .set(
        "jobStatus:gerarFaturas",
        JSON.stringify({ executadoEm: new Date().toISOString(), geradas: faturas.length })
      )
      .catch(() => {});
  }

  return NextResponse.json({ data: { geradas: faturas.length } }, { status: 200 });
}
