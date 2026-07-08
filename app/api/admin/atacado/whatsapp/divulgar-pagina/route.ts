import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { enviarImagemGrupo, enviarImagemMassa } from "@/lib/evolution";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: { message: "Não autorizado" } }, { status: 401 });
    }

    const formData = await req.formData();
    const imagem = formData.get("imagem") as File | null;
    const grupoJidsRaw = formData.get("grupoJids") as string | null;
    const legenda = formData.get("legenda") as string | null;

    if (!imagem || !grupoJidsRaw) {
      return NextResponse.json({ error: { message: "Campos obrigatórios: imagem e grupoJids" } }, { status: 400 });
    }

    const grupoJids = JSON.parse(grupoJidsRaw);
    const gruposParaDisparar = Array.isArray(grupoJids) ? grupoJids : [];

    // Lê a imagem como buffer para converter em base64
    const buffer = Buffer.from(await imagem.arrayBuffer());
    const mimeType = imagem.type || "image/jpeg";
    const base64DataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    // Dispara via Evolution API (otimizado para massa)
    await enviarImagemMassa(gruposParaDisparar, base64DataUrl, legenda || "");

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro no disparador de página para WhatsApp:", err);
    return NextResponse.json({ error: { message: err.message || "Falha interna" } }, { status: 500 });
  }
}
