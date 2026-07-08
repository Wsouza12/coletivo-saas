import { NextResponse } from "next/server";
import { sincronizarPedidosExternos } from "@/lib/sync";

// Proteja com Authorization: Bearer CRON_SECRET e agende a cada 15min
// (Vercel Cron ou Upstash QStash apontando pra esta rota).
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const { synced, errors } = await sincronizarPedidosExternos();

  return NextResponse.json({ data: { synced, errors } }, { status: 200 });
}
