import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Rota temporária de diagnóstico — REMOVER após resolver o bug do sendMedia.
// Testa o endpoint sendMedia da Evolution API e retorna o erro bruto para debugging.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { grupoId, imagemUrl } = body as { grupoId?: string; imagemUrl?: string };

  const baseUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, "");
  const instance = process.env.EVOLUTION_INSTANCE;
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!baseUrl || !instance || !apiKey) {
    return NextResponse.json({ error: "Evolution API não configurada" }, { status: 500 });
  }

  const results: Record<string, unknown> = {};

  // Teste 1: status da instância
  try {
    const r = await fetch(`${baseUrl}/instance/connectionState/${instance}`, {
      headers: { apikey: apiKey },
    });
    results.instanceState = { status: r.status, body: await r.json().catch(() => r.text()) };
  } catch (e) {
    results.instanceState = { error: String(e) };
  }

  // Teste 2: sendText simples (sem imagem)
  if (grupoId) {
    try {
      const r = await fetch(`${baseUrl}/message/sendText/${instance}`, {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ number: grupoId, text: "🔧 Teste de diagnóstico DropSync" }),
      });
      const responseText = await r.text();
      results.sendText = { status: r.status, body: responseText };
    } catch (e) {
      results.sendText = { error: String(e) };
    }
  }

  // Teste 3: sendMedia com URL (se imagemUrl fornecida)
  if (grupoId && imagemUrl) {
    try {
      const r = await fetch(`${baseUrl}/message/sendMedia/${instance}`, {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          number: grupoId,
          mediatype: "image",
          mimetype: "image/png",
          media: imagemUrl,
          caption: "Teste diagnóstico",
          fileName: "teste.png",
        }),
      });
      const responseText = await r.text();
      results.sendMediaUrl = { status: r.status, body: responseText };
    } catch (e) {
      results.sendMediaUrl = { error: String(e) };
    }
  }

  return NextResponse.json({ results });
}
