"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PublicarRapidoDialog } from "@/components/lojista/publicar-rapido-dialog";

type Anuncio = { id: string; plataforma: string; status: string; url: string | null };

type Produto = {
  id: string;
  nome: string;
  sku: string;
  categoria: string;
  precoAtacado: string;
  estoque: number;
  imagens: { url: string; alt: string | null }[];
};

export function ProdutoCard({
  produto,
  plataformasConectadas = [],
  anunciosExistentes = [],
  selecionado = false,
  onToggleSelecionado,
}: {
  produto: Produto;
  plataformasConectadas?: string[];
  anunciosExistentes?: Anuncio[];
  selecionado?: boolean;
  onToggleSelecionado?: (produtoId: string) => void;
}) {
  const [precoVenda, setPrecoVenda] = useState("");
  const custo = Number(produto.precoAtacado);
  const venda = Number(precoVenda);
  const margem = venda > custo ? venda - custo : null;
  const semEstoque = produto.estoque <= 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
      {onToggleSelecionado && (
        <label
          className="absolute top-2 left-2 z-10 flex size-5 items-center justify-center rounded-md bg-background/90"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selecionado}
            onChange={() => onToggleSelecionado(produto.id)}
            className="size-4"
          />
        </label>
      )}

      <Link href={`/catalogo/${produto.id}`} className="relative aspect-square bg-muted">
        {produto.imagens[0] && (
          <Image
            src={produto.imagens[0].url}
            alt={produto.imagens[0].alt ?? produto.nome}
            fill
            className="object-cover"
          />
        )}
        {semEstoque && (
          <Badge variant="destructive" className="absolute top-2 right-2">
            Sem estoque
          </Badge>
        )}
        <Badge variant="secondary" className="absolute bottom-2 left-2">
          {produto.categoria}
        </Badge>
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <Link href={`/catalogo/${produto.id}`}>
          <p className="line-clamp-2 text-sm font-medium text-foreground">{produto.nome}</p>
          <p className="font-mono text-xs text-muted-foreground">{produto.sku}</p>
        </Link>

        <p className="mt-1 text-sm text-muted-foreground">
          Custo: <span className="font-semibold text-foreground">{formatBRL(custo)}</span>
        </p>

        <div className="mt-1 flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Preço de venda</span>
          <Input
            type="number"
            step="0.01"
            placeholder="R$ 0,00"
            value={precoVenda}
            onChange={(e) => setPrecoVenda(e.target.value)}
            className="h-8"
          />
          <span className="text-xs font-medium text-success">
            Margem: {margem !== null ? formatBRL(margem) : "—"}
          </span>
        </div>

        {anunciosExistentes.length > 0 && (
          <div className="flex items-center gap-2">
            {["MERCADOLIVRE", "SHOPEE"].map((plat) => {
              const anuncio = anunciosExistentes.find((a) => a.plataforma === plat);
              if (!anuncio) return null;
              return (
                <span
                  key={plat}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                  title={`${plat === "MERCADOLIVRE" ? "Mercado Livre" : "Shopee"}: ${anuncio.status}`}
                >
                  {plat === "MERCADOLIVRE" ? "ML" : "Shopee"}
                  {anuncio.status === "PUBLICADO" && <Check className="size-3 text-success" />}
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-1 flex flex-col gap-1.5">
          <PublicarRapidoDialog
            produtoId={produto.id}
            nomeProduto={produto.nome}
            precoAtacado={custo}
            semEstoque={semEstoque}
            plataformasConectadas={plataformasConectadas}
            anunciosExistentes={anunciosExistentes}
            labelBotao="Cadastrar"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            render={<Link href={`/kits?produtoId=${produto.id}`} onClick={(e) => e.stopPropagation()} />}
          >
            Criar Kit
          </Button>
          <Link
            href={`/catalogo/${produto.id}`}
            className="w-full rounded-md border border-border px-3 py-1.5 text-center text-sm font-medium text-muted-foreground hover:bg-accent"
          >
            Ver Detalhes
          </Link>
        </div>
      </div>
    </div>
  );
}
