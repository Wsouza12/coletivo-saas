import { NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadEtapaFoto } from "@/lib/storage";

// Baixa todas as provas de envio de um pedido como um único .zip — só ADMIN.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;

  const etapas = await prisma.etapaPedido.findMany({
    where: { pedidoId: id },
    orderBy: { criadoEm: "asc" },
  });

  if (etapas.length === 0) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Nenhuma prova registrada" } }, { status: 404 });
  }

  const zip = new JSZip();
  for (const etapa of etapas) {
    const blob = await downloadEtapaFoto(etapa.fotoUrl);
    const ext = etapa.fotoUrl.split(".").pop() ?? "jpg";
    const nomeArquivo = `${etapa.etapa}_${etapa.criadoEm.toISOString().replace(/[:.]/g, "-")}.${ext}`;
    zip.file(nomeArquivo, await blob.arrayBuffer());
  }

  const bytes = await zip.generateAsync({ type: "uint8array" });
  const buffer = Buffer.from(bytes);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="provas-pedido-${id}.zip"`,
    },
  });
}
