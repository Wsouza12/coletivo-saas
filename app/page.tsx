import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { calcularPrecoVendaComTaxa, getConfiguracaoFinanceira } from "@/lib/configuracao-financeira";
import { ProdutoVitrineCard } from "@/components/shared/produto-vitrine-card";
import { VitrineCategoriaStrip } from "@/components/shared/vitrine-categoria-strip";

const PAGE_SIZE = 24;

export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const categoria = sp.categoria;

  const where = { ativo: true, ...(categoria ? { categoria } : {}) };

  const [produtos, categoriasAgrupadas, config] = await Promise.all([
    prisma.produto.findMany({
      where,
      select: {
        id: true,
        nome: true,
        categoria: true,
        precoAtacado: true,
        categoriaMlId: true,
        imagens: {
          where: { OR: [{ destacarVitrine: true }, { principal: true }] },
          orderBy: { destacarVitrine: "desc" },
          take: 1,
          select: { url: true, alt: true },
        },
      },
      orderBy: { destaque: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.produto.groupBy({ by: ["categoria"], where: { ativo: true }, _count: { _all: true } }),
    getConfiguracaoFinanceira(),
  ]);

  const seteDiasAtras = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const vendidos = await prisma.itemPedido.groupBy({
    by: ["produtoId"],
    where: { produtoId: { in: produtos.map((p) => p.id) }, pedido: { createdAt: { gte: seteDiasAtras } } },
    _sum: { quantidade: true },
  });
  const maisVendidosIds = new Set(
    vendidos
      .filter((v) => (v._sum.quantidade ?? 0) > 0)
      .sort((a, b) => (b._sum.quantidade ?? 0) - (a._sum.quantidade ?? 0))
      .slice(0, 5)
      .map((v) => v.produtoId)
  );

  const margemDesejada = Number(config.margemPadrao);

  // Sugestão de preço calculada com taxa real de cada plataforma (não chutada) —
  // ML faz 1 chamada à API oficial por produto, Shopee é cálculo local instantâneo.
  const produtosComPreco = await Promise.all(
    produtos.map(async (produto) => {
      const custoReal = Number(produto.precoAtacado);
      const shopee = await calcularPrecoVendaComTaxa({
        custoReal,
        margemDesejada,
        plataforma: "SHOPEE",
      });
      let precoSugeridoMl: number | null = null;
      if (produto.categoriaMlId) {
        try {
          const ml = await calcularPrecoVendaComTaxa({
            custoReal,
            margemDesejada,
            plataforma: "MERCADOLIVRE",
            categoriaMlId: produto.categoriaMlId,
          });
          precoSugeridoMl = ml.precoSugerido;
        } catch {
          precoSugeridoMl = null;
        }
      }
      return {
        id: produto.id,
        nome: produto.nome,
        categoria: produto.categoria,
        precoAtacado: custoReal,
        precoSugeridoMl,
        precoSugeridoShopee: shopee.precoSugerido,
        maisVendido: maisVendidosIds.has(produto.id),
        imagens: produto.imagens,
      };
    })
  );

  const categorias = categoriasAgrupadas
    .map((c) => ({ nome: c.categoria, total: c._count._all }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <span className="text-lg font-bold text-primary">DropyAtacado</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Quero revender
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-center text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          OFERTAS PARA REVENDER AGORA!
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          Lojistas cadastrados publicam estes produtos no Mercado Livre e na Shopee com 1
          clique, definem sua própria margem, e nós cuidamos da embalagem e do envio.
        </p>

        <div className="mt-8">
          <VitrineCategoriaStrip categorias={categorias} categoriaAtiva={categoria} />
        </div>

        <h2 className="mt-8 text-sm font-bold tracking-wide text-foreground uppercase">
          Melhores ofertas pra revender
        </h2>

        {produtosComPreco.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Nenhum produto disponível nessa categoria.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {produtosComPreco.map((produto) => (
              <ProdutoVitrineCard key={produto.id} produto={produto} />
            ))}
          </div>
        )}

        <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Quer revender estes produtos na sua loja?
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Cadastro gratuito. Você escolhe os produtos do nosso catálogo, define o preço e
            fica com a margem — o resto é com a gente.
          </p>
          <Link
            href="/register"
            className="mt-1 flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-base font-bold text-primary-foreground transition hover:opacity-90"
          >
            Criar minha conta de lojista
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
