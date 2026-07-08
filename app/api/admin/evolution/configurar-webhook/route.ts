import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Configura o webhook do Evolution API pra apontar pra /api/webhooks/evolution.
// Roda 1x por instância (ou de novo se a URL pública mudar).
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const baseUrl = process.env.EVOLUTION_API_URL;
  const instance = process.env.EVOLUTION_INSTANCE;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl || !instance || !apiKey || !appUrl) {
    return NextResponse.json(
      { error: { code: "CONFIG", message: "Faltando EVOLUTION_API_URL/EVOLUTION_INSTANCE/EVOLUTION_API_KEY/NEXT_PUBLIC_APP_URL" } },
      { status: 422 }
    );
  }

  const webhookUrl = `${appUrl.replace(/\/$/, "")}/api/webhooks/evolution`;

  // Payload do Evolution API (v2) — habilita só os eventos que importam.
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/webhook/set/${instance}`, {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        // GROUP_PARTICIPANTS_UPDATE = dispara as boas-vindas ao novo membro.
        events: ["MESSAGES_UPSERT", "GROUP_PARTICIPANTS_UPDATE"],
      },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: { code: "EVOLUTION_FAIL", message: `${res.status}: ${text.slice(0, 200)}` } },
      { status: 502 }
    );
  }

  return NextResponse.json({ data: { ok: true, webhookUrl, response: text.slice(0, 200) } }, { status: 200 });
}
