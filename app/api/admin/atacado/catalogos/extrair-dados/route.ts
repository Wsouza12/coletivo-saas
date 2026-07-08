import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extrairDadosProdutoDeImagem } from "@/lib/groq";

// Recebe o recorte de um produto na página do catálogo (multipart) e devolve os
// dados lidos pela IA de visão pra autopreencher o pré-cadastro. Best-effort: se
// a IA falhar (quota/leitura ruim), o admin cai no preenchimento manual de hoje.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const formData = await req.formData();
  const imagem = formData.get("imagem");
  if (!(imagem instanceof File) || imagem.size === 0) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Recorte de imagem ausente" } }, { status: 422 });
  }

  const buffer = Buffer.from(await imagem.arrayBuffer());
  const dataUrl = `data:${imagem.type || "image/png"};base64,${buffer.toString("base64")}`;

  try {
    const dados = await extrairDadosProdutoDeImagem(dataUrl);
    return NextResponse.json({ data: dados }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao ler a imagem com IA";
    return NextResponse.json({ error: { code: "IA_FALHOU", message } }, { status: 422 });
  }
}
