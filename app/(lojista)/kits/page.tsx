import { redirect } from "next/navigation";
import Image from "next/image";
import { Check, Clock, X } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getConfiguracaoFinanceira } from "@/lib/configuracao-financeira";
import { formatBRL } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CriarKitDialog } from "@/components/lojista/criar-kit-dialog";
import { KitPublicarButton } from "@/components/lojista/kit-publicar-button";
import { KitExcluirButton } from "@/components/lojista/kit-excluir-button";

function StatusPlataforma({ plataforma, status, url }: { plataforma: string; status?: string; url?: string | null }) {
  const label = plataforma === "MERCADOLIVRE" ? "ML" : "Shopee";
  const conteudo = (() => {
    if (!status) return { icon: null, texto: "Não vinculado", cor: "text-muted-foreground bg-muted" };
    if (status === "PUBLICADO") return { icon: <Check className="size-3" />, texto: "Publicado", cor: "text-success bg-success/10" };
    if (status === "ERRO") return { icon: <X className="size-3" />, texto: "Erro de sincronização", cor: "text-destructive bg-destructive/10" };
    return { icon: <Clock className="size-3" />, texto: "Pendente", cor: "text-warning bg-warning/10" };
  })();

  const pill = (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${conteudo.cor}`}>
      {label}: {conteudo.icon}
      {conteudo.texto}
    </span>
  );

  if (status === "PUBLICADO" && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
        {pill}
      </a>
    );
  }
  return pill;
}

export default async function KitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const lojistaId = session.user.lojistaId;
  const sp = await searchParams;
  const produtoIdPreSelecionado = sp.produtoId;

  const [kits, produtosCatalogo, integracoes, configuracaoFinanceira] = await Promise.all([
    prisma.kit.findMany({
      where: { lojistaId },
      include: {
        itens: {
          include: {
            produto: {
              select: {
                nome: true,
                sku: true,
                precoAtacado: true,
                estoque: true,
                imagens: { where: { principal: true }, take: 1, select: { url: true, alt: true } },
              },
            },
          },
        },
        anuncios: { select: { id: true, plataforma: true, status: true, url: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.produto.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        sku: true,
        precoAtacado: true,
        estoque: true,
        imagens: { where: { principal: true }, take: 1, select: { url: true, alt: true } },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.integracao.findMany({ where: { lojistaId, ativa: true }, select: { plataforma: true } }),
    getConfiguracaoFinanceira(),
  ]);

  const plataformasConectadas = integracoes.map((i) => i.plataforma);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Kits</h1>
        <CriarKitDialog
          produtosCatalogo={produtosCatalogo.map((p) => ({ ...p, precoAtacado: p.precoAtacado.toString() }))}
          produtoIdPreSelecionado={produtoIdPreSelecionado}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Combine vários produtos do catálogo num anúncio só. Quando vender, o admin já vê
        exatamente quais produtos e quantidades separar pra esse kit — sem precisar adivinhar.
      </p>

      {kits.length === 0 ? (
        <p className="px-2 text-sm text-muted-foreground">Nenhum kit criado ainda.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((kit) => {
            const custoTotal = kit.itens.reduce(
              (soma, i) => soma + i.quantidade * Number(i.produto.precoAtacado),
              0
            );
            const estoqueDisponivel = Math.min(
              ...kit.itens.map((i) => Math.floor(i.produto.estoque / i.quantidade))
            );
            const fotoPrincipal = kit.itens[0]?.produto.imagens[0];
            const plataformasJaPublicadas = kit.anuncios
              .filter((a) => a.status === "PUBLICADO")
              .map((a) => a.plataforma);

            return (
              <Card key={kit.id} className="flex flex-col overflow-hidden">
                <div className="relative aspect-[16/9] bg-muted">
                  {fotoPrincipal && (
                    <Image src={fotoPrincipal.url} alt={fotoPrincipal.alt ?? kit.nome} fill className="object-cover" />
                  )}
                </div>
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                  <div>
                    <CardTitle className="text-base">{kit.nome}</CardTitle>
                    {kit.descricao && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{kit.descricao}</p>
                    )}
                  </div>
                  <KitExcluirButton kitId={kit.id} bloqueado={kit.anuncios.length > 0} />
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  <ul className="flex flex-col gap-1 text-sm">
                    {kit.itens.map((item) => (
                      <li key={item.id} className="flex justify-between">
                        <span>
                          {item.quantidade}x {item.produto.nome}{" "}
                          <span className="font-mono text-xs text-muted-foreground">({item.produto.sku})</span>
                        </span>
                        <span className="text-muted-foreground">
                          {formatBRL(Number(item.produto.precoAtacado) * item.quantidade)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                    <span className="font-medium">Custo total</span>
                    <span className="font-medium">{formatBRL(custoTotal)}</span>
                  </div>
                  {kit.precoVenda && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Preço de venda</span>
                      <span className="font-medium text-success">{formatBRL(Number(kit.precoVenda))}</span>
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Estoque disponível pra montar o kit: {estoqueDisponivel}
                  </span>

                  <div className="flex flex-wrap items-center gap-2">
                    {(["MERCADOLIVRE", "SHOPEE"] as const).map((plat) => {
                      const anuncio = kit.anuncios.find((a) => a.plataforma === plat);
                      return (
                        <StatusPlataforma
                          key={plat}
                          plataforma={plat}
                          status={anuncio?.status}
                          url={anuncio?.url}
                        />
                      );
                    })}
                  </div>

                  <div className="mt-auto pt-2">
                    <KitPublicarButton
                      kitId={kit.id}
                      nomeKit={kit.nome}
                      custoTotal={custoTotal}
                      precoVendaSugerido={kit.precoVenda ? Number(kit.precoVenda) : undefined}
                      plataformasConectadas={plataformasConectadas}
                      plataformasJaPublicadas={plataformasJaPublicadas}
                      tipoVendedorShopee={configuracaoFinanceira.tipoVendedorShopee}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
