import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createKitSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.lojistaId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const kits = await prisma.kit.findMany({
    where: { lojistaId: session.user.lojistaId },
    include: {
      itens: {
        include: {
          produto: {
            select: {
              nome: true,
              sku: true,
              precoAtacado: true,
              imagens: { where: { principal: true }, take: 1, select: { url: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: kits });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.lojistaId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const parsed = createKitSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const produtoIds = [...new Set(parsed.data.itens.map((i) => i.produtoId))];
  if (produtoIds.length !== parsed.data.itens.length) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Não repita o mesmo produto no kit — ajuste a quantidade dele" } },
      { status: 422 }
    );
  }

  const produtos = await prisma.produto.findMany({ where: { id: { in: produtoIds }, ativo: true } });
  if (produtos.length !== produtoIds.length) {
    return NextResponse.json(
      { error: { code: "PRODUTO_INVALIDO", message: "Um ou mais produtos do kit não existem ou estão inativos" } },
      { status: 422 }
    );
  }

  const kit = await prisma.kit.create({
    data: {
      lojistaId: session.user.lojistaId,
      nome: parsed.data.nome,
      descricao: parsed.data.descricao,
      precoVenda: parsed.data.precoVenda,
      itens: { create: parsed.data.itens },
    },
    include: { itens: { include: { produto: { select: { nome: true, sku: true, precoAtacado: true } } } } },
  });

  return NextResponse.json({ data: kit }, { status: 201 });
}
