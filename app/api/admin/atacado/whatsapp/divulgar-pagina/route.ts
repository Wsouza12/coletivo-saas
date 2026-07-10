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
    const grupoAvisosId = formData.get("grupoAvisosId") as string | null;
    const grupoPedidosId = formData.get("grupoPedidosId") as string | null;
    const legenda = formData.get("legenda") as string | null;
    const linkPedidos = formData.get("linkPedidos") as string | null;

    if (!imagem || (!grupoAvisosId && !grupoPedidosId)) {
      return NextResponse.json({ error: { message: "Campos obrigatórios: imagem e pelo menos um grupo" } }, { status: 400 });
    }

    // Lê a imagem como buffer para converter em base64
    const buffer = Buffer.from(await imagem.arrayBuffer());
    const mimeType = imagem.type || "image/jpeg";
    const base64DataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

    // Dispara via Evolution API, mas com textos separados se necessário
    if (grupoAvisosId) {
      const legAvisos = legenda ? (linkPedidos ? `${legenda}\n\n⚠️ *Atenção:* Este grupo é apenas para divulgação. Peça pelo código do produto no grupo de pedidos:\n👉 ${linkPedidos}` : legenda) : "";
      await enviarImagemGrupo(grupoAvisosId, base64DataUrl, legAvisos);
    }
    
    if (grupoPedidosId) {
      await enviarImagemGrupo(grupoPedidosId, base64DataUrl, legenda || "");
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Erro no disparador de página para WhatsApp:", err);
    return NextResponse.json({ error: { message: err.message || "Falha interna" } }, { status: 500 });
  }
}
