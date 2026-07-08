import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadProdutoImagem } from "@/lib/storage";
import { enviarImagemGrupo, enviarVideoGrupo, enviarMensagemGrupo } from "@/lib/evolution";

// Posta um aviso (texto + opcional imagem/print/vídeo) nos grupos escolhidos.
// Envio best-effort por grupo: se um falhar, os outros seguem.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const formData = await req.formData();
  const texto = String(formData.get("texto") ?? "").trim();
  const grupoJids: string[] = JSON.parse(String(formData.get("grupoJids") ?? "[]"));
  const media = formData.get("media");

  if (grupoJids.length === 0) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Selecione ao menos um grupo" } }, { status: 422 });
  }

  let mediaUrl: string | null = null;
  let ehVideo = false;
  if (media instanceof File && media.size > 0) {
    ehVideo = media.type.startsWith("video/");
    try {
      mediaUrl = await uploadProdutoImagem(media, `aviso-${Date.now()}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no upload da mídia";
      return NextResponse.json({ error: { code: "UPLOAD_FALHOU", message } }, { status: 500 });
    }
  }

  if (!mediaUrl && !texto) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Escreva um texto ou anexe uma mídia" } }, { status: 422 });
  }

  const erros: string[] = [];
  for (const jid of grupoJids) {
    try {
      if (mediaUrl && ehVideo) {
        await enviarVideoGrupo(jid, mediaUrl, texto);
      } else if (mediaUrl) {
        await enviarImagemGrupo(jid, mediaUrl, texto);
      } else {
        await enviarMensagemGrupo(jid, texto);
      }
    } catch (err) {
      console.error(`Falha ao enviar aviso pro grupo ${jid}:`, err);
      erros.push(jid);
    }
  }

  return NextResponse.json({ data: { ok: true, enviados: grupoJids.length - erros.length, falhas: erros.length } }, { status: 200 });
}
