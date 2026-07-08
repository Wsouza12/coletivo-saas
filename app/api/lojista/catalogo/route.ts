import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 24;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const categoria = searchParams.get("categoria");
  const ordenar = searchParams.get("ordenar") ?? "destaque";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  const where = {
    ativo: true,
    ...(q
      ? {
          OR: [
            { nome: { contains: q, mode: "insensitive" as const } },
            { sku: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(categoria ? { categoria } : {}),
  };

  const orderBy =
    ordenar === "preco_asc"
      ? { precoAtacado: "asc" as const }
      : ordenar === "preco_desc"
        ? { precoAtacado: "desc" as const }
        : ordenar === "nome"
          ? { nome: "asc" as const }
          : [{ destaque: "desc" as const }, { createdAt: "desc" as const }];

  const [items, total] = await Promise.all([
    prisma.produto.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { imagens: { where: { principal: true }, take: 1 } },
    }),
    prisma.produto.count({ where }),
  ]);

  return NextResponse.json({ data: { items, total, page, pageSize: PAGE_SIZE } }, { status: 200 });
}
