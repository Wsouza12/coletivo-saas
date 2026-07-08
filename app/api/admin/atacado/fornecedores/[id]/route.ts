import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fornecedorAtacadoSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const parsed = fornecedorAtacadoSchema.partial().safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  const fornecedor = await prisma.fornecedorAtacado.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ data: fornecedor }, { status: 200 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { id } = await params;
  const emUso = await prisma.produtoAtacado.count({ where: { fornecedorId: id } });
  if (emUso > 0) {
    return NextResponse.json({ error: { code: "EM_USO", message: "Fornecedor vinculado a produtos" } }, { status: 409 });
  }

  await prisma.fornecedorAtacado.delete({ where: { id } });
  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
