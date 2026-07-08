import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CatalogoSidebar } from "@/components/lojista/catalogo-sidebar";
import { CatalogoToolbar } from "@/components/lojista/catalogo-toolbar";
import { CatalogoGrid } from "@/components/lojista/catalogo-grid";
import { PaginationControls } from "@/components/shared/pagination-controls";

const PAGE_SIZE = 24;
const DIAS_POR_ORDENACAO: Record<string, number> = {
  vendidos_7d: 7,
  vendidos_30d: 30,
  vendidos_90d: 90,
};

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const sp = await searchParams;
  const q = sp.q?.trim();
  const categoria = sp.categoria;
  const ordenar = sp.ordenar ?? "atualizados";
  const page = Math.max(1, Number(sp.page ?? "1"));

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

  const diasVendidos = DIAS_POR_ORDENACAO[ordenar];

  let produtosBase: { id: string }[] = [];
  let total = 0;
  let produtosOrdenadosIds: string[] = [];

  if (diasVendidos) {
    // "+Vendidos Nd" não é um campo do Produto — soma a quantidade vendida via
    // ItemPedido nos últimos N dias e ordena por isso. Busca primeiro todos os IDs
    // que atendem o filtro (sem paginar ainda) pra poder ordenar pelo total vendido.
    const [todosIds, totalCount] = await Promise.all([
      prisma.produto.findMany({ where, select: { id: true } }),
      prisma.produto.count({ where }),
    ]);
    total = totalCount;
    const idsSet = new Set(todosIds.map((p) => p.id));

    const desde = new Date(Date.now() - diasVendidos * 24 * 60 * 60 * 1000);
    const vendidos = await prisma.itemPedido.groupBy({
      by: ["produtoId"],
      where: { produtoId: { in: [...idsSet] }, pedido: { createdAt: { gte: desde } } },
      _sum: { quantidade: true },
    });
    const vendidosPorProduto = new Map(vendidos.map((v) => [v.produtoId, v._sum.quantidade ?? 0]));

    produtosOrdenadosIds = [...idsSet].sort(
      (a, b) => (vendidosPorProduto.get(b) ?? 0) - (vendidosPorProduto.get(a) ?? 0)
    );
    produtosBase = produtosOrdenadosIds
      .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      .map((id) => ({ id }));
  }

  const orderBy =
    ordenar === "cadastrados"
      ? { createdAt: "desc" as const }
      : [{ destaque: "desc" as const }, { updatedAt: "desc" as const }];

  const [produtosRaw, totalSemVendidos, categoriasAgrupadas, totalGeral, integracoes] = await Promise.all([
    diasVendidos
      ? prisma.produto.findMany({
          where: { id: { in: produtosBase.map((p) => p.id) } },
          include: { imagens: { where: { principal: true }, take: 1 } },
        })
      : prisma.produto.findMany({
          where,
          orderBy,
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
          include: { imagens: { where: { principal: true }, take: 1 } },
        }),
    diasVendidos ? Promise.resolve(0) : prisma.produto.count({ where }),
    prisma.produto.groupBy({ by: ["categoria"], where: { ativo: true }, _count: { _all: true } }),
    prisma.produto.count({ where: { ativo: true } }),
    prisma.integracao.findMany({
      where: { lojistaId: session.user.lojistaId, ativa: true },
      select: { plataforma: true },
    }),
  ]);

  if (!diasVendidos) total = totalSemVendidos;

  // Quando ordenado por vendidos, o findMany com "in" não preserva a ordem — reordena
  // na mão seguindo produtosOrdenadosIds calculado acima.
  const produtos = diasVendidos
    ? produtosOrdenadosIds
        .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
        .map((id) => produtosRaw.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => !!p)
    : produtosRaw;

  const anuncios = await prisma.anuncio.findMany({
    where: { lojistaId: session.user.lojistaId, produtoId: { in: produtos.map((p) => p.id) } },
  });
  const anunciosPorProduto: Record<string, typeof anuncios> = {};
  for (const anuncio of anuncios) {
    (anunciosPorProduto[anuncio.produtoId as string] ??= []).push(anuncio);
  }

  const categorias = categoriasAgrupadas
    .map((c) => ({ nome: c.categoria, total: c._count._all }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Catálogo</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-6 md:self-start">
          <CatalogoSidebar categorias={categorias} totalGeral={totalGeral} />
        </aside>

        <div className="flex flex-col gap-4">
          <CatalogoToolbar total={total} />

          {produtos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado.
            </p>
          ) : (
            <CatalogoGrid
              produtos={produtos.map((produto) => ({
                id: produto.id,
                nome: produto.nome,
                sku: produto.sku,
                categoria: produto.categoria,
                precoAtacado: produto.precoAtacado.toString(),
                estoque: produto.estoque,
                imagens: produto.imagens,
              }))}
              plataformasConectadas={integracoes.map((i) => i.plataforma)}
              anunciosPorProduto={anunciosPorProduto}
            />
          )}

          <PaginationControls page={page} pageSize={PAGE_SIZE} total={total} pageSizeOptions={[24]} />
        </div>
      </div>
    </div>
  );
}
