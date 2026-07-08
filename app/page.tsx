import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import {
  VitrineCategoriaStrip,
  VitrineSubcategoriasSidebar,
} from "@/components/shared/vitrine-categoria-strip";
import {
  ProdutoAtacadoVitrineCard,
  type ProdutoAtacadoVitrine,
} from "@/components/atacado/produto-atacado-vitrine-card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { VitrineHero } from "@/components/atacado/vitrine-hero";
import { VitrineBenefits } from "@/components/atacado/vitrine-benefits";

const PAGE_SIZE = 12;

export default async function VitrineAtacadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const categoria = sp.categoria;
  const q = sp.q?.trim() ?? "";
  const ordem = sp.ordem ?? "recentes";
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  // Categoria com subcategorias usa convenção "Pai › Filha" (separador U+203A).
  // Se o usuário clica num PAI puro ("Casa"), trazemos tudo: o próprio pai +
  // todas as filhas ("Casa › Cozinha", "Casa › Banheiro"). Se clica numa
  // filha completa ("Casa › Cozinha"), trazemos só essa exata.
  const SEP_CAT = " › ";
  const categoriaFiltro = categoria
    ? categoria.includes(SEP_CAT)
      ? { categoria }
      : { OR: [{ categoria }, { categoria: { startsWith: `${categoria}${SEP_CAT}` } }] }
    : {};

  const where = {
    ativo: true,
    ...categoriaFiltro,
    ...(q ? {
      OR: [
        { nome: { contains: q, mode: "insensitive" as const } },
        { codigo: { contains: q, mode: "insensitive" as const } }
      ]
    } : {}),
  };

  // Buscamos TODOS os ids ordenados por createdAt (mais simples pra paginar
  // mesmo com ordenação por preço, que é feita em memória). Pra catálogos
  // até alguns milhares isso é OK; acima disso precisaria de paginação real.
  const [total, produtos, categoriasAgrupadas, vinculos] = await Promise.all([
    prisma.produtoAtacado.count({ where }),
    prisma.produtoAtacado.findMany({
      where,
      select: {
        id: true,
        codigo: true,
        nome: true,
        categoria: true,
        descricao: true,
        imagemUrl: true,
        voltagem: true,
        codigoAnatel: true,
        unidadesPorCaixa: true,
        precoVendaSugerido: true,
        precoCatalogo: true,
        linkReferencia: true,
        posicaoMaisVendido: true,
        cores: {
          select: { id: true, tipo: true, nome: true, imagemUrl: true },
          orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
        },
      },
      orderBy:
        ordem === "menor-preco"
          ? { precoCatalogo: "asc" }
          : ordem === "maior-preco"
            ? { precoCatalogo: "desc" }
            : { createdAt: "desc" },
      skip: (pagina - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.produtoAtacado.groupBy({ by: ["categoria"], where: { ativo: true }, _count: { _all: true } }),
    prisma.grupoWhatsappCategoria.findMany({ select: { categoria: true, linkConvite: true } }),
  ]);

  const linkPorCategoria = new Map(vinculos.map((v) => [v.categoria, v.linkConvite]));

  const produtosVitrine: ProdutoAtacadoVitrine[] = produtos.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    nome: p.nome,
    categoria: p.categoria,
    descricao: p.descricao,
    imagemUrl: p.imagemUrl,
    voltagem: p.voltagem,
    codigoAnatel: p.codigoAnatel,
    unidadesPorCaixa: p.unidadesPorCaixa,
    // Preço público = preço de catálogo (o "real" que o usuário quer mostrar na
    // vitrine), com fallback na venda sugerida. Nunca expõe o custo de aquisição
    // (custoUnitario).
    preco: p.precoCatalogo
      ? Number(p.precoCatalogo)
      : p.precoVendaSugerido
        ? Number(p.precoVendaSugerido)
        : null,
    linkConvite: linkPorCategoria.get(p.categoria) ?? null,
    linkReferencia: p.linkReferencia,
    posicaoMaisVendido: p.posicaoMaisVendido,
    cores: p.cores,
  }));

  const categorias = categoriasAgrupadas
    .map((c) => ({ nome: c.categoria, total: c._count._all }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  // Sidebar de subcategorias só aparece se o pai ativo tiver filhas.
  const paiAtivo = categoria ? categoria.split(SEP_CAT)[0] : null;
  const temSidebar = !!(
    paiAtivo &&
    categorias.some((c) => c.nome.startsWith(`${paiAtivo}${SEP_CAT}`))
  );

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function urlPagina(p: number): string {
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    if (q) params.set("q", q);
    if (ordem !== "recentes") params.set("ordem", ordem);
    if (p > 1) params.set("pagina", String(p));
    const s = params.toString();
    return s ? `/?${s}` : "/";
  }

  return (
    <div className="dark relative flex flex-col min-h-screen bg-black text-white">
      {/* Background Radial Gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(168,85,247,0.25),rgba(0,0,0,0))]" />
      
      <header className="relative z-10 bg-transparent">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <Link href="/" className="flex items-center gap-1.5 text-xl font-bold">
            <svg className="size-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
            </svg>
            <span className="bg-gradient-to-r from-purple-400 to-amber-300 bg-clip-text text-transparent">
              {APP_NAME}
            </span>
          </Link>
          <Link href="/login" className="text-sm font-semibold text-white/90 hover:text-white transition">
            Entrar
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <VitrineHero />
        <VitrineBenefits />

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="mt-4">
          <VitrineCategoriaStrip categorias={categorias} categoriaAtiva={categoria} basePath="/" />
        </div>

        <form
          method="get"
          className="mx-auto mt-6 flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center"
        >
          {categoria ? <input type="hidden" name="categoria" value={categoria} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por nome ou código..."
            className="h-10 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/40 focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/40"
          />
          <select
            name="ordem"
            defaultValue={ordem}
            className="h-10 rounded-lg border border-white/15 bg-black px-3 text-sm text-white outline-none focus:border-purple-400/60 focus:ring-1 focus:ring-purple-400/40"
          >
            <option value="recentes">Mais recentes</option>
            <option value="menor-preco">Menor preço</option>
            <option value="maior-preco">Maior preço</option>
          </select>
          <button
            type="submit"
            className="h-10 rounded-lg bg-gradient-to-r from-purple-600 to-amber-500 px-6 text-sm font-bold text-black shadow-lg shadow-purple-900/40 transition hover:opacity-90"
          >
            Aplicar
          </button>
        </form>

        {/* Sidebar de subcategorias só aparece se o pai ativo tiver filhas;
            caso contrário, o grid usa a largura total. */}
        <div
          className={`mt-8 grid gap-6 ${
            temSidebar ? "grid-cols-1 md:grid-cols-[220px_1fr]" : "grid-cols-1"
          }`}
        >
          {temSidebar ? (
            <div className="md:sticky md:top-4 md:self-start">
              <VitrineSubcategoriasSidebar
                categorias={categorias}
                categoriaAtiva={categoria}
                basePath="/"
              />
            </div>
          ) : null}

          <div>
            {produtosVitrine.length === 0 ? (
              <p className="mt-10 text-center text-sm text-muted-foreground">
                Nenhum produto disponível nessa categoria.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {produtosVitrine.map((produto) => (
                    <ProdutoAtacadoVitrineCard key={produto.id} produto={produto} />
                  ))}
                </div>

                <Paginacao
                  paginaAtual={pagina}
                  totalPaginas={totalPaginas}
                  urlPagina={urlPagina}
                />
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  </div>
);
}

// Paginação numerada — ‹ 1 2 [3] 4 5 › estilo Google. Mostra até 5 números em
// volta da página ativa; ... quando há gap; «»/« » nas pontas.
function Paginacao({
  paginaAtual,
  totalPaginas,
  urlPagina,
}: {
  paginaAtual: number;
  totalPaginas: number;
  urlPagina: (p: number) => string;
}) {
  if (totalPaginas <= 1) return null;

  // Calcula janela de páginas pra mostrar: até 5 ao redor da atual.
  const janela = 2;
  const inicio = Math.max(1, paginaAtual - janela);
  const fim = Math.min(totalPaginas, paginaAtual + janela);
  const numeros: number[] = [];
  for (let i = inicio; i <= fim; i++) numeros.push(i);

  const cls = (ativo: boolean) =>
    `flex size-9 items-center justify-center rounded-md text-sm font-medium transition ${
      ativo ? "bg-primary text-primary-foreground" : "border border-border bg-card hover:bg-muted"
    }`;

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-1">
      <Link
        href={urlPagina(Math.max(1, paginaAtual - 1))}
        aria-disabled={paginaAtual === 1}
        className={`${cls(false)} ${paginaAtual === 1 ? "pointer-events-none opacity-40" : ""}`}
      >
        <ChevronLeft className="size-4" />
      </Link>

      {inicio > 1 ? (
        <>
          <Link href={urlPagina(1)} className={cls(false)}>
            1
          </Link>
          {inicio > 2 ? <span className="px-1 text-muted-foreground">…</span> : null}
        </>
      ) : null}

      {numeros.map((n) => (
        <Link key={n} href={urlPagina(n)} className={cls(n === paginaAtual)}>
          {n}
        </Link>
      ))}

      {fim < totalPaginas ? (
        <>
          {fim < totalPaginas - 1 ? <span className="px-1 text-muted-foreground">…</span> : null}
          <Link href={urlPagina(totalPaginas)} className={cls(false)}>
            {totalPaginas}
          </Link>
        </>
      ) : null}

      <Link
        href={urlPagina(Math.min(totalPaginas, paginaAtual + 1))}
        aria-disabled={paginaAtual === totalPaginas}
        className={`${cls(false)} ${paginaAtual === totalPaginas ? "pointer-events-none opacity-40" : ""}`}
      >
        <ChevronRight className="size-4" />
      </Link>
    </nav>
  );
}
