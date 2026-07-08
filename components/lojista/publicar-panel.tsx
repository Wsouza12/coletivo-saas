"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/format";

type Anuncio = { id: string; plataforma: string; status: string; url: string | null };

export function PublicarPanel({
  produtoId,
  nomeProduto,
  precoAtacado,
  semEstoque,
  plataformasConectadas,
  anunciosExistentes,
}: {
  produtoId: string;
  nomeProduto: string;
  precoAtacado: number;
  semEstoque: boolean;
  plataformasConectadas: string[];
  anunciosExistentes: Anuncio[];
}) {
  const router = useRouter();
  const [plataforma, setPlataforma] = useState<"MERCADOLIVRE" | "SHOPEE" | "AMBAS">(
    "MERCADOLIVRE"
  );
  const [titulo, setTitulo] = useState(nomeProduto.slice(0, 60));
  const [precoVenda, setPrecoVenda] = useState("");
  const [freteGratis, setFreteGratis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingIA, setLoadingIA] = useState(false);
  const [sugestaoIA, setSugestaoIA] = useState<{
    precoSugerido: number;
    margem: number;
    estrategia: string;
    taxaPercentual?: number;
    taxaValor?: number;
    lucroLiquido?: number;
    taxaPlataforma?: string;
    freteGratisObrigatorio?: boolean;
  } | null>(null);

  const venda = Number(precoVenda);
  const margem = venda > precoAtacado ? venda - precoAtacado : null;

  async function publicarEm(plat: "MERCADOLIVRE" | "SHOPEE") {
    const res = await fetch("/api/lojista/publicar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ produtoId, plataforma: plat, titulo, precoVenda: venda, freteGratis }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data.data;
  }

  async function handlePublicar() {
    if (semEstoque) {
      toast.error("Produto sem estoque");
      return;
    }
    if (!venda || venda <= precoAtacado) {
      toast.error("Defina um preço de venda maior que o preço de atacado");
      return;
    }

    const alvos: ("MERCADOLIVRE" | "SHOPEE")[] =
      plataforma === "AMBAS" ? ["MERCADOLIVRE", "SHOPEE"] : [plataforma];

    for (const alvo of alvos) {
      if (!plataformasConectadas.includes(alvo)) {
        toast.error(
          `Conecte sua conta ${alvo === "MERCADOLIVRE" ? "Mercado Livre" : "Shopee"} antes de publicar`
        );
        router.push("/integracoes");
        return;
      }
    }

    setLoading(true);
    try {
      for (const alvo of alvos) {
        toast.loading(`Publicando ${alvo === "MERCADOLIVRE" ? "no Mercado Livre" : "na Shopee"}...`, {
          id: `publicar-${alvo}`,
        });
        await publicarEm(alvo);
        toast.success(`Publicado ${alvo === "MERCADOLIVRE" ? "no Mercado Livre" : "na Shopee"}`, {
          id: `publicar-${alvo}`,
        });
      }
      router.push("/meus-anuncios");
    } catch (err) {
      const error = err as { error?: { message?: string; code?: string } };
      toast.error(error?.error?.message ?? "Erro ao publicar anúncio");
    } finally {
      setLoading(false);
    }
  }

  async function handleSugestaoIA() {
    setLoadingIA(true);
    try {
      const res = await fetch(`/api/lojista/catalogo/${produtoId}/analisar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plataforma: plataforma === "AMBAS" ? "MERCADOLIVRE" : plataforma,
        }),
      });
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setSugestaoIA(data);
      setPrecoVenda(String(data.precoSugerido));
    } catch {
      toast.error("Não foi possível obter sugestão de preço agora");
    } finally {
      setLoadingIA(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold text-foreground">Publicar este produto</h3>

      {anunciosExistentes.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md bg-muted p-2 text-xs text-muted-foreground">
          {anunciosExistentes.map((a) => (
            <span key={a.id}>
              Você já tem um anúncio {a.plataforma === "MERCADOLIVRE" ? "no ML" : "na Shopee"}{" "}
              ({a.status}).{" "}
              <Link href="/meus-anuncios" className="text-primary hover:underline">
                Ver em Meus Anúncios
              </Link>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label>Plataforma</Label>
        <Select value={plataforma} onValueChange={(v) => v && setPlataforma(v as typeof plataforma)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MERCADOLIVRE">Mercado Livre</SelectItem>
            <SelectItem value="SHOPEE">Shopee</SelectItem>
            <SelectItem value="AMBAS">Ambas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Título do anúncio</Label>
        <Input value={titulo} maxLength={60} onChange={(e) => setTitulo(e.target.value)} />
        <span className="text-xs text-muted-foreground">{titulo.length}/60</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Preço de venda (R$)</Label>
          <button
            type="button"
            onClick={handleSugestaoIA}
            disabled={loadingIA}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            <Sparkles className="size-3.5" />
            {loadingIA ? "Analisando..." : "Sugestão com IA"}
          </button>
        </div>
        <Input
          type="number"
          step="0.01"
          value={precoVenda}
          onChange={(e) => setPrecoVenda(e.target.value)}
        />
        {margem !== null && (
          <span className="text-sm font-medium text-success">Margem bruta: {formatBRL(margem)}</span>
        )}
        {sugestaoIA && (
          <p className="rounded-md bg-primary/5 p-2 text-xs text-muted-foreground">
            IA sugere {formatBRL(sugestaoIA.precoSugerido)} (margem ~{sugestaoIA.margem}%):{" "}
            {sugestaoIA.estrategia}
            {sugestaoIA.taxaPlataforma && (
              <>
                {" "}
                <br />
                Taxa considerada: {sugestaoIA.taxaPercentual}% — {sugestaoIA.taxaPlataforma}
              </>
            )}
            {sugestaoIA.taxaValor !== undefined && sugestaoIA.lucroLiquido !== undefined && (
              <>
                <br />
                <span className="font-medium text-foreground">
                  Você pagaria {formatBRL(sugestaoIA.taxaValor)} de taxa e ficaria com{" "}
                  <span className="text-success">{formatBRL(sugestaoIA.lucroLiquido)}</span> de lucro líquido.
                </span>
              </>
            )}
          </p>
        )}
        {(plataforma === "MERCADOLIVRE" || plataforma === "AMBAS") && venda >= 79 && (
          <p className="text-xs text-warning">
            A partir de R$79, o Mercado Livre exige frete grátis pro comprador — o vendedor arca
            com parte da tarifa de frete (varia por peso e reputação da conta).
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={freteGratis}
          onChange={(e) => setFreteGratis(e.target.checked)}
        />
        Oferecer frete grátis (melhora a qualidade e competitividade do anúncio)
      </label>

      <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
        Outras duas recomendações do ML pra qualidade 90+ não dependem desta tela: <strong>preço de
        atacado</strong> (Vendas por Volume) e <strong>parcelamento sem juros</strong> são configurados
        direto na sua conta Mercado Livre/Mercado Pago, não por anúncio.
      </p>

      <Button onClick={handlePublicar} disabled={loading || semEstoque}>
        {loading ? "Publicando..." : "Publicar agora"}
      </Button>
    </div>
  );
}
