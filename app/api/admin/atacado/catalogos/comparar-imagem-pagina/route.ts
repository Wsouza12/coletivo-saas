import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { comparaImagemComPaginaCatalogo } from "@/lib/groq";

// Compara uma foto de referência com uma página do catálogo (sem salvar nada)
// — usado pela busca visual, que varre página por página.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const formData = await req.formData();
  const referencia = formData.get("referencia");
  const pagina = formData.get("pagina");
  if (!(referencia instanceof File) || referencia.size === 0 || !(pagina instanceof File) || pagina.size === 0) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Imagem de referência e da página são obrigatórias" } }, { status: 422 });
  }

  const refBuffer = Buffer.from(await referencia.arrayBuffer());
  const refDataUrl = `data:${referencia.type || "image/png"};base64,${refBuffer.toString("base64")}`;
  const pagBuffer = Buffer.from(await pagina.arrayBuffer());
  const pagDataUrl = `data:${pagina.type || "image/png"};base64,${pagBuffer.toString("base64")}`;

  try {
    const resultado = await comparaImagemComPaginaCatalogo(refDataUrl, pagDataUrl);
    return NextResponse.json({ data: resultado }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao comparar imagens com IA";
    return NextResponse.json({ error: { code: "IA_FALHOU", message } }, { status: 422 });
  }
}
