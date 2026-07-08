import Image from "next/image";
import { Flame } from "lucide-react";
import { formatBRL } from "@/lib/format";

type Produto = {
  id: string;
  nome: string;
  categoria: string;
  precoAtacado: number;
  precoSugeridoMl: number | null;
  precoSugeridoShopee: number;
  maisVendido: boolean;
  imagens: { url: string; alt: string | null }[];
};

// Card da vitrine pública — mostra o custo real e os preços sugeridos de venda
// (calculados com taxa real de cada plataforma, não chutados), pra quem está
// avaliando se vale virar lojista ver o potencial de margem de cada produto.
export function ProdutoVitrineCard({ produto }: { produto: Produto }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md">
      <div className="relative aspect-square bg-muted">
        {produto.imagens[0] && (
          <Image
            src={produto.imagens[0].url}
            alt={produto.imagens[0].alt ?? produto.nome}
            fill
            className="object-cover transition group-hover:scale-105"
          />
        )}
        <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2.5 py-0.5 text-xs font-medium text-foreground shadow-sm">
          {produto.categoria}
        </span>
        {produto.maisVendido && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-warning px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            <Flame className="size-3" />
            Mais vendido
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-sm font-medium text-foreground">{produto.nome}</p>

        <div className="mt-auto flex flex-col gap-1 border-t border-border pt-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Custo (atacado)</span>
            <span className="font-semibold text-foreground">{formatBRL(produto.precoAtacado)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Sugerido Mercado Livre</span>
            <span className="font-semibold text-success">
              {produto.precoSugeridoMl !== null ? formatBRL(produto.precoSugeridoMl) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Sugerido Shopee</span>
            <span className="font-semibold text-success">{formatBRL(produto.precoSugeridoShopee)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
