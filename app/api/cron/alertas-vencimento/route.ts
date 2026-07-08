import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, redisConfigurado } from "@/lib/redis";
import { sendFaturaVencendo } from "@/lib/email";
import { formatBRL } from "@/lib/format";

// Substitui o worker BullMQ "alertaVencimentoWorker" — agende diariamente às
// 9h via Vercel Cron (ver vercel.json). Avisa lojistas com fatura vencendo em 2 dias.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const hoje = new Date();
  const inicioJanela = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 2);
  const fimJanela = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 3);

  const faturas = await prisma.fatura.findMany({
    where: {
      status: { in: ["PENDENTE", "ENVIADA"] },
      vencimento: { gte: inicioJanela, lt: fimJanela },
    },
    include: { lojista: { include: { user: true } } },
  });

  for (const fatura of faturas) {
    await sendFaturaVencendo({
      email: fatura.lojista.user.email,
      numero: fatura.numero,
      valorTotal: formatBRL(fatura.valorTotal.toString()),
      linkPagamento: fatura.mpPaymentLink,
    });
  }

  if (redisConfigurado) {
    await redis
      .set(
        "jobStatus:alertasVencimento",
        JSON.stringify({ executadoEm: new Date().toISOString(), alertadas: faturas.length })
      )
      .catch(() => {});
  }

  return NextResponse.json({ data: { alertadas: faturas.length } }, { status: 200 });
}
