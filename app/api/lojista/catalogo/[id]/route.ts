import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const produto = await prisma.produto.findUnique({
    where: { id },
    include: { imagens: { orderBy: { ordem: "asc" } } },
  });

  if (!produto || !produto.ativo) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Produto não encontrado" } },
      { status: 404 }
    );
  }

  const anunciosExistentes = await prisma.anuncio.findMany({
    where: { produtoId: id, lojistaId: session.user.lojistaId },
  });

  const integracoes = await prisma.integracao.findMany({
    where: { lojistaId: session.user.lojistaId, ativa: true },
    select: { plataforma: true },
  });

  return NextResponse.json(
    {
      data: {
        produto,
        anunciosExistentes,
        plataformasConectadas: integracoes.map((i) => i.plataforma),
      },
    },
    { status: 200 }
  );
}
