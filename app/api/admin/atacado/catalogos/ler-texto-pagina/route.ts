import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { lerTextoPaginaCatalogo } from "@/lib/groq";

// OCR sob demanda de uma página (sem salvar nada) — usado pela busca por IA
// no catálogo, que varre página por página procurando um termo.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const formData = await req.formData();
  const imagem = formData.get("imagem");
  if (!(imagem instanceof File) || imagem.size === 0) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Imagem da página ausente" } }, { status: 422 });
  }

  const buffer = Buffer.from(await imagem.arrayBuffer());
  const dataUrl = `data:${imagem.type || "image/png"};base64,${buffer.toString("base64")}`;

  try {
    const texto = await lerTextoPaginaCatalogo(dataUrl);
    return NextResponse.json({ data: { texto } }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao ler a página com IA";
    return NextResponse.json({ error: { code: "IA_FALHOU", message } }, { status: 422 });
  }
}
