import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadProdutoImagem, deleteProdutoImagemPorUrl } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const cores = await prisma.produtoAtacadoCor.findMany({
    where: { produtoAtacadoId: id },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ data: cores }, { status: 200 });
}

// Cria uma cor com upload de imagem opcional. multipart/form-data: nome + (imagem).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const produto = await prisma.produtoAtacado.findUnique({ where: { id } });
  if (!produto) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const formData = await req.formData();
  const nome = String(formData.get("nome") ?? "").trim();
  const tipoRaw = String(formData.get("tipo") ?? "COR").toUpperCase();
  const tipo = (["COR", "TAMANHO", "VOLTAGEM"].includes(tipoRaw) ? tipoRaw : "COR") as
    | "COR"
    | "TAMANHO"
    | "VOLTAGEM";
  if (!nome) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Nome da variação é obrigatório" } }, { status: 422 });
  }

  let imagemUrl: string | null = null;
  const imagem = formData.get("imagem");
  if (imagem instanceof File && imagem.size > 0) {
    try {
      imagemUrl = await uploadProdutoImagem(imagem, `atacado-${id}-cor`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha no upload";
      console.error("[cores POST] upload falhou:", err);
      return NextResponse.json({ error: { code: "UPLOAD_FALHOU", message } }, { status: 500 });
    }
  }

  try {
    const ordem = await prisma.produtoAtacadoCor.count({ where: { produtoAtacadoId: id } });
    const cor = await prisma.produtoAtacadoCor.create({
      data: { produtoAtacadoId: id, tipo, nome, imagemUrl, ordem },
    });
    return NextResponse.json({ data: cor }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao criar variação";
    console.error("[cores POST] create falhou:", err);
    return NextResponse.json({ error: { code: "CREATE_FALHOU", message } }, { status: 500 });
  }
}

// Excluir cor por id da cor (?corId=...).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const corId = new URL(req.url).searchParams.get("corId");
  if (!corId) return NextResponse.json({ error: { code: "VALIDATION", message: "corId obrigatório" } }, { status: 422 });

  const cor = await prisma.produtoAtacadoCor.findUnique({ where: { id: corId } });
  if (!cor || cor.produtoAtacadoId !== id) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  if (cor.imagemUrl) {
    await deleteProdutoImagemPorUrl(cor.imagemUrl).catch(() => {});
  }
  await prisma.produtoAtacadoCor.delete({ where: { id: corId } });
  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
