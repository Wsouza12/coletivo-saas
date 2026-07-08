import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function gerarSenhaTemporaria(): string {
  return crypto.randomUUID().split("-")[0] + "Aa1!";
}

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const lojista = await prisma.lojista.findUnique({ where: { id } });
  if (!lojista) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Lojista não encontrado" } },
      { status: 404 }
    );
  }

  const novaSenha = gerarSenhaTemporaria();

  await prisma.user.update({
    where: { id: lojista.userId },
    data: { password: await bcrypt.hash(novaSenha, 12) },
  });

  return NextResponse.json({ data: { novaSenha } }, { status: 200 });
}
