import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Proxy de imagem só pro CDN oficial do ML — evita problema de CORS no navegador
// ao reconstruir File a partir do link de uma foto importada. Whitelist de host
// evita que a rota seja usada como proxy genérico (SSRF).
const HOSTS_PERMITIDOS = ["mlstatic.com"];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "url é obrigatório" } }, { status: 422 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: { code: "VALIDATION", message: "url inválida" } }, { status: 422 });
  }

  if (!HOSTS_PERMITIDOS.some((host) => parsed.hostname.endsWith(host))) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Host não permitido" } }, { status: 403 });
  }

  const res = await fetch(parsed.toString());
  if (!res.ok) {
    return NextResponse.json({ error: { code: "FETCH_FAILED" } }, { status: 502 });
  }

  return new NextResponse(res.body, {
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg" },
  });
}
