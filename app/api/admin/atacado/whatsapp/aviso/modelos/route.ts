import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function exigirAdmin() {
  const session = await auth();
  if (!session?.user) return { erro: NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 }) };
  if (session.user.role !== "ADMIN") return { erro: NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 }) };
  return { erro: null };
}

export async function GET() {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  const modelos = await prisma.avisoModelo.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: modelos }, { status: 200 });
}

const criarSchema = z.object({ titulo: z.string().min(1), texto: z.string().min(1) });

export async function POST(req: Request) {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  const parsed = criarSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }
  const modelo = await prisma.avisoModelo.create({ data: parsed.data });
  return NextResponse.json({ data: modelo }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: { code: "VALIDATION", message: "id obrigatório" } }, { status: 422 });
  await prisma.avisoModelo.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ data: { ok: true } }, { status: 200 });
}
