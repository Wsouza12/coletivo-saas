import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadPostagemMidia } from "@/lib/storage";

// Recebe uma mídia (imagem/vídeo, multipart "arquivo") e devolve a URL pública.
// Usada pelas 3 abas da Agenda pra hospedar prints/uploads antes de agendar.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const formData = await req.formData();
  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "arquivo ausente" } }, { status: 422 });
  }

  const tipo = arquivo.type || "image/jpeg";
  const ext = tipo.startsWith("video") ? "mp4" : tipo.includes("png") ? "png" : "jpg";

  try {
    const url = await uploadPostagemMidia(arquivo, ext, tipo);
    return NextResponse.json({ data: { url } });
  } catch (e: any) {
    return NextResponse.json({ error: { code: "UPLOAD_FALHOU", message: e?.message ?? "erro" } }, { status: 502 });
  }
}
