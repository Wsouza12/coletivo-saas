import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteCatalogoFornecedorPdfPorUrl } from "@/lib/storage-r2";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const catalogo = await prisma.catalogoFornecedor.findUnique({
    where: { id },
    include: { itens: { orderBy: { pagina: "asc" } } },
  });
  if (!catalogo) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  return NextResponse.json({ data: catalogo }, { status: 200 });
}

// Edita título, data e opcionalmente substitui o arquivo (re-upload feito via
// /upload-url; aqui só atualizamos a referência e apagamos o PDF antigo do R2).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const atual = await prisma.catalogoFornecedor.findUnique({ where: { id } });
  if (!atual) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: { nome?: string; data?: Date | null; arquivoUrl?: string; gridCrops?: string } = {};

  if (typeof body?.nome === "string" && body.nome.trim()) data.nome = body.nome.trim();
  if (body?.data !== undefined) {
    const dataStr = typeof body.data === "string" && body.data ? body.data : null;
    data.data = dataStr ? new Date(dataStr) : null;
  }
  const GRIDS_VALIDOS = ["2x2", "2x3", "3x3", "3x4"];
  if (typeof body?.gridCrops === "string" && GRIDS_VALIDOS.includes(body.gridCrops)) {
    data.gridCrops = body.gridCrops;
  }
  let urlAntigaPraApagar: string | null = null;
  if (typeof body?.arquivoUrl === "string" && body.arquivoUrl && body.arquivoUrl !== atual.arquivoUrl) {
    data.arquivoUrl = body.arquivoUrl;
    urlAntigaPraApagar = atual.arquivoUrl;
  }

  const catalogo = await prisma.catalogoFornecedor.update({ where: { id }, data });
  if (urlAntigaPraApagar) {
    await deleteCatalogoFornecedorPdfPorUrl(urlAntigaPraApagar).catch(() => {});
  }
  return NextResponse.json({ data: catalogo }, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const catalogo = await prisma.catalogoFornecedor.findUnique({ where: { id } });
  if (!catalogo) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  await deleteCatalogoFornecedorPdfPorUrl(catalogo.arquivoUrl);
  await prisma.catalogoFornecedor.delete({ where: { id } });
  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
