import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const catalogos = await prisma.catalogoFornecedor.findMany({
    where: { fornecedorId: id },
    include: { _count: { select: { itens: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: catalogos }, { status: 200 });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const fornecedor = await prisma.fornecedorAtacado.findUnique({ where: { id } });
  if (!fornecedor) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  // Arquivo já foi enviado direto pro Supabase Storage via URL assinada
  // (ver /upload-url) — aqui só registramos a referência no banco.
  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const arquivoUrl = typeof body?.arquivoUrl === "string" ? body.arquivoUrl : "";
  const dataStr = typeof body?.data === "string" && body.data ? body.data : null;
  if (!nome) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Nome do catálogo é obrigatório" } }, { status: 422 });
  }
  if (!arquivoUrl) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "arquivoUrl é obrigatório" } }, { status: 422 });
  }

  const catalogo = await prisma.catalogoFornecedor.create({
    data: { fornecedorId: id, nome, arquivoUrl, data: dataStr ? new Date(dataStr) : null },
  });

  if (fornecedor.isEstoqueProprio) {
    await prisma.fornecedorAtacado.update({
      where: { id },
      data: { catalogoDesatualizado: false },
    });
  }

  return NextResponse.json({ data: catalogo }, { status: 201 });
}
