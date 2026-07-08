import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadProdutoImagem, deleteProdutoImagemPorUrl } from "@/lib/storage";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const produto = await prisma.produtoAtacado.findUnique({ where: { id } });
  if (!produto) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Arquivo não enviado" } }, { status: 422 });
  }

  try {
    const url = await uploadProdutoImagem(file, `atacado-${id}`);
    if (produto.imagemUrl) {
      await deleteProdutoImagemPorUrl(produto.imagemUrl).catch(() => {});
    }
    const atualizado = await prisma.produtoAtacado.update({ where: { id }, data: { imagemUrl: url } });
    return NextResponse.json({ data: atualizado }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha no upload";
    return NextResponse.json({ error: { code: "UPLOAD_FALHOU", message } }, { status: 500 });
  }
}
