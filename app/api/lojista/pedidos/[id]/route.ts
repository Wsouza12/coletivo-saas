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
  const pedido = await prisma.pedido.findFirst({
    where: { id, lojistaId: session.user.lojistaId },
    include: { itens: { include: { produto: { select: { nome: true, sku: true } } } } },
  });

  if (!pedido) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Pedido não encontrado" } },
      { status: 404 }
    );
  }

  // O lojista não tem acesso ao endereço completo do comprador — só Pablo
  // precisa disso para o envio. Expomos apenas cidade/UF para referência.
  const endereco = pedido.enderecoEntrega as { cidade?: string; uf?: string } | null;

  const { enderecoEntrega, compradorDoc, compradorTelefone, compradorEmail, ...resto } = pedido;
  void enderecoEntrega;
  void compradorDoc;
  void compradorTelefone;
  void compradorEmail;

  return NextResponse.json(
    {
      data: {
        ...resto,
        cidadeEntrega: endereco?.cidade ?? null,
        ufEntrega: endereco?.uf ?? null,
      },
    },
    { status: 200 }
  );
}
