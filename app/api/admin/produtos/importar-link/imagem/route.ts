import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Proxy de imagem genérico (várias origens possíveis, diferente do import do ML
// que só usa mlstatic.com) — evita CORS no navegador. Mitigação de SSRF: só
// https, bloqueia hostnames/IPs privados óbvios, e exige resposta image/*.
const HOSTNAME_PROIBIDO =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.0\.0\.0|\[?::1\]?)/i;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: { code: "VALIDATION" } }, { status: 422 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION" } }, { status: 422 });
  }

  if (parsed.protocol !== "https:" || HOSTNAME_PROIBIDO.test(parsed.hostname)) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const res = await fetch(parsed.toString());
  const contentType = res.headers.get("Content-Type") ?? "";
  if (!res.ok || !contentType.startsWith("image/")) {
    return NextResponse.json({ error: { code: "FETCH_FAILED" } }, { status: 502 });
  }

  return new NextResponse(res.body, { headers: { "Content-Type": contentType } });
}
