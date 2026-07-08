import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { criarUploadUrlCatalogoFornecedor } from "@/lib/storage-r2";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const fornecedor = await prisma.fornecedorAtacado.findUnique({ where: { id } });
  if (!fornecedor) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });

  const dados = await criarUploadUrlCatalogoFornecedor(id);
  return NextResponse.json({ data: dados }, { status: 200 });
}
