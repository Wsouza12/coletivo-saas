import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (!q) {
    const [fornecedores, totalPaginasIndexadas, totalCrops, gridPorCatalogo] = await Promise.all([
      prisma.fornecedorAtacado.findMany({
        select: {
          id: true, nome: true,
          catalogos: {
            select: {
              id: true, nome: true,
              _count: { select: { itens: true, paginas: true } },
              itens: { select: { produtoAtacadoId: true } },
            },
          },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.mapaCatalogoPagina.count(),
      // crops e gridCrops via SQL direto — imune a cache do Prisma client
      prisma.$queryRaw<{ catalogoId: string; total: bigint; comEmbedding: bigint }[]>`
        SELECT "catalogoId", COUNT(*) AS total, COUNT(embedding) AS "comEmbedding" FROM "MapaCatalogoCrop" GROUP BY "catalogoId"
      `.catch(() => [] as { catalogoId: string; total: bigint; comEmbedding: bigint }[]),
      prisma.$queryRaw<{ id: string; gridCrops: string | null }[]>`
        SELECT id, "gridCrops" FROM "CatalogoFornecedor"
      `.catch(() => [] as { id: string; gridCrops: string | null }[]),
    ]);

    // Para cada catálogo: paginasIndexadas, itens mapeados manualmente, com produto cadastrado
    const stats = fornecedores.map((f) => ({
      id: f.id,
      nome: f.nome,
      catalogos: f.catalogos.map((c) => {
        const totalItens = c._count.itens;
        const comProduto = c.itens.filter((i) => i.produtoAtacadoId).length;
        const semProduto = totalItens - comProduto;
        const paginasIndexadas = c._count.paginas ?? 0;
        const cropRow = (totalCrops as any[]).find((r: any) => r.catalogoId === c.id);
        const cropsIndexados = Number(cropRow?.total ?? 0);
        const cropsComEmbedding = Number(cropRow?.comEmbedding ?? 0);
        const gridCrops = (gridPorCatalogo as any[]).find((r: any) => r.id === c.id)?.gridCrops ?? "2x3";
        const naoPaginadas = Math.max(0, totalItens - paginasIndexadas);
        return {
          id: c.id, nome: c.nome,
          gridCrops,
          totalItens,
          comProduto,
          semProduto,
          paginasIndexadas,
          cropsIndexados,
          cropsComEmbedding,
          naoIndexadas: naoPaginadas,
        };
      }),
    }));

    const totalItens = stats.reduce((s, f) => s + f.catalogos.reduce((ss, c) => ss + c.totalItens, 0), 0);
    const totalComProduto = stats.reduce((s, f) => s + f.catalogos.reduce((ss, c) => ss + c.comProduto, 0), 0);
    const totalSemProduto = totalItens - totalComProduto;

    return NextResponse.json({ data: { stats, totalItens, totalComProduto, totalSemProduto, totalPaginasIndexadas, comEmbedding: 0 } });
  }

  // ── Busca em CatalogoFornecedorItem (produtos mapeados manualmente) ──
  const itensMapeados = await prisma.catalogoFornecedorItem.findMany({
    where: {
      OR: [
        { nomeProduto: { contains: q, mode: "insensitive" } },
        { codigo: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 30,
    orderBy: { nomeProduto: "asc" },
    include: {
      catalogo: {
        select: {
          id: true, nome: true,
          fornecedor: { select: { id: true, nome: true } },
        },
      },
      produtoAtacado: {
        select: {
          id: true, nome: true, codigo: true, categoria: true, marca: true,
          unidadesPorCaixa: true, pesoKg: true,
          imagemUrl: true, custoUnitario: true, precoVendaSugerido: true,
          voltagem: true, codigoAnatel: true,
        },
      },
    },
  });

  // ── Busca no índice completo de páginas (MapaCatalogoPagina) ──
  const paginasIndexadas = await prisma.mapaCatalogoPagina.findMany({
    where: { textoOcr: { contains: q, mode: "insensitive" } },
    take: 30,
    orderBy: { pagina: "asc" },
    include: {
      catalogo: {
        select: {
          id: true, nome: true,
          fornecedor: { select: { id: true, nome: true } },
          itens: {
            where: { pagina: { gte: 0 } }, // join via pagina abaixo
            select: { pagina: true, nomeProduto: true, codigo: true, produtoAtacadoId: true,
              produtoAtacado: {
                select: { id: true, nome: true, codigo: true, imagemUrl: true,
                  unidadesPorCaixa: true, pesoKg: true, categoria: true, marca: true,
                  voltagem: true, codigoAnatel: true, custoUnitario: true, precoVendaSugerido: true },
              },
            },
          },
        },
      },
    },
  });

  // Para cada página do índice, anota se há item manual naquela página
  const paginasComItem = paginasIndexadas.map((p) => {
    const itemNaPagina = p.catalogo.itens.find((i) => i.pagina === p.pagina);
    const nomeOcr = p.textoOcr
      .split(/[\n|]+/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 4 && !/^\d[\d\s.,]*$/.test(l))
      .slice(0, 5)
      .sort((a, b) => b.length - a.length)[0] ?? null;
    return {
      id: p.id,
      pagina: p.pagina,
      textoTrecho: p.textoOcr.substring(0, 300),
      nomeOcr,
      catalogoId: p.catalogoId,
      catalogoNome: p.catalogo.nome,
      fornecedor: p.catalogo.fornecedor,
      itemMapeado: itemNaPagina ?? null,
    };
  });

  // ── Busca em ProdutoAtacado sem item de catálogo ──
  const produtosSemItem = await prisma.produtoAtacado.findMany({
    where: {
      OR: [
        { nome: { contains: q, mode: "insensitive" } },
        { codigo: { contains: q, mode: "insensitive" } },
        { marca: { contains: q, mode: "insensitive" } },
      ],
      itensCatalogo: { none: {} },
    },
    take: 20,
    select: {
      id: true, nome: true, codigo: true, categoria: true, marca: true,
      unidadesPorCaixa: true, pesoKg: true,
      imagemUrl: true, custoUnitario: true, precoVendaSugerido: true,
      voltagem: true, codigoAnatel: true,
      fornecedor: { select: { id: true, nome: true } },
    },
  });

  return NextResponse.json({ data: { itensMapeados, paginasIndexadas: paginasComItem, produtosSemItem } });
}
