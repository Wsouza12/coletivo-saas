import { NextResponse } from "next/server";
import { processarPostagensVencidas } from "@/lib/agenda";

// Dispara as postagens agendadas vencidas. Agende no cron-job.org a cada ~5min
// com header Authorization: Bearer CRON_SECRET.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const { processadas, erros } = await processarPostagensVencidas();
  return NextResponse.json({ data: { processadas, erros } }, { status: 200 });
}
