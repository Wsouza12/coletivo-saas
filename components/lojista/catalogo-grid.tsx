"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ProdutoCard } from "@/components/lojista/produto-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

export function CatalogoGrid({
  produtos,
  plataformasConectadas,
  anunciosPorProduto,
}: {
  produtos: Produto[];
  plataformasConectadas: string[];
  anunciosPorProduto: Record<string, Anuncio[]>;
}) {
  const router = useRouter();
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [plataforma, setPlataforma] = useState<"MERCADOLIVRE" | "SHOPEE">("MERCADOLIVRE");
  const [margemPercent, setMargemPercent] = useState("30");
  const [freteGratis, setFreteGratis] = useState(false);
  const [publicando, setPublicando] = useState(false);

  function toggle(produtoId: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(produtoId)) novo.delete(produtoId);
      else novo.add(produtoId);
      return novo;
    });
  }

  function selecionarTodos() {
    setSelecionados(new Set(produtos.map((p) => p.id)));
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  async function publicarSelecionados() {
    if (!plataformasConectadas.includes(plataforma)) {
      toast.error(
        `Conecte sua conta ${plataforma === "MERCADOLIVRE" ? "Mercado Livre" : "Shopee"} antes de publicar`
      );
      router.push("/integracoes");
      return;
    }

    const margem = Number(margemPercent);
    if (!margem || margem <= 0) {
      toast.error("Defina uma margem válida");
      return;
    }

    setPublicando(true);
    const alvos = produtos.filter((p) => selecionados.has(p.id));
    let sucesso = 0;
    let falhas = 0;

    for (const produto of alvos) {
      const custo = Number(produto.precoAtacado);
      const precoVenda = Math.round(custo * (1 + margem / 100) * 100) / 100;
      try {
        const res = await fetch("/api/lojista/publicar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            produtoId: produto.id,
            plataforma,
            titulo: produto.nome.slice(0, 60),
            precoVenda,
            freteGratis,
          }),
        });
        if (!res.ok) throw new Error();
        sucesso++;
      } catch {
        falhas++;
      }
    }

    setPublicando(false);
    setDialogOpen(false);
    limparSelecao();
    toast[falhas > 0 ? "error" : "success"](
      `${sucesso} publicado(s)${falhas > 0 ? `, ${falhas} falharam` : ""}`
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={selecionados.size === produtos.length ? limparSelecao : selecionarTodos}
          className="text-sm text-primary hover:underline"
        >
          {selecionados.size === produtos.length ? "Limpar seleção" : "Selecionar todos"}
        </button>
        {selecionados.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{selecionados.size} selecionado(s)</span>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              Publicar selecionados
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {produtos.map((produto) => (
          <ProdutoCard
            key={produto.id}
            produto={produto}
            plataformasConectadas={plataformasConectadas}
            anunciosExistentes={anunciosPorProduto[produto.id] ?? []}
            selecionado={selecionados.has(produto.id)}
            onToggleSelecionado={toggle}
          />
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar {selecionados.size} produto(s)</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label>Plataforma</Label>
              <Select value={plataforma} onValueChange={(v) => v && setPlataforma(v as typeof plataforma)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MERCADOLIVRE">Mercado Livre</SelectItem>
                  <SelectItem value="SHOPEE">Shopee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Margem desejada (%)</Label>
              <Input
                type="number"
                min="1"
                value={margemPercent}
                onChange={(e) => setMargemPercent(e.target.value)}
              />
              <span className="text-xs text-muted-foreground">
                Preço de venda = custo × (1 + margem/100), calculado individualmente por produto
              </span>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={freteGratis}
                onChange={(e) => setFreteGratis(e.target.checked)}
              />
              Oferecer frete grátis em todos
            </label>
          </div>
          <DialogFooter>
            <Button disabled={publicando} onClick={publicarSelecionados}>
              {publicando ? "Publicando..." : "Confirmar publicação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
