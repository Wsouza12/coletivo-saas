"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { AceiteTermosCheckbox } from "@/components/shared/aceite-termos-checkbox";

type ProdutoResultado = { id: string; nome: string; sku: string; precoAtacado: string | number };

export function VincularVendaDialog({
  vendaId,
  plataforma,
  plataformaItemId,
}: {
  vendaId: string;
  plataforma: string;
  plataformaItemId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [resultados, setResultados] = useState<ProdutoResultado[]>([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoResultado | null>(null);
  const [precoVenda, setPrecoVenda] = useState("");
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!busca.trim()) {
      setResultados([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/lojista/catalogo?q=${encodeURIComponent(busca)}`);
      const json = await res.json().catch(() => null);
      setResultados(json?.data?.items ?? []);
    }, 300);
    return () => clearTimeout(timer);
  }, [busca]);

  async function vincular() {
    if (!produtoSelecionado) {
      toast.error("Escolha um produto do catálogo");
      return;
    }
    if (!precoVenda || Number(precoVenda) <= 0) {
      toast.error("Informe o preço de venda desse anúncio");
      return;
    }
    if (!aceiteTermos) {
      toast.error("Confirme que você assume a responsabilidade por esse vínculo");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/lojista/vendas-sem-vinculo/${vendaId}/vincular`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoId: produtoSelecionado.id,
          precoVenda: Number(precoVenda),
          aceiteTermos,
        }),
      });
      if (!res.ok) throw await res.json();
      toast.success("Vinculado — as próximas vendas desse anúncio serão sincronizadas corretamente");
      setOpen(false);
      router.refresh();
    } catch (err) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? "Erro ao vincular";
      toast.error(typeof message === "string" ? message : "Erro ao vincular");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        Vincular a um produto
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular venda a um produto</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <p className="text-xs text-muted-foreground">
            Item {plataformaItemId} ({plataforma}) vendido sem produto vinculado. Escolha a qual
            produto do catálogo ele corresponde.
          </p>
          <div className="relative flex flex-col gap-2">
            <Label>Buscar produto</Label>
            <Input
              value={produtoSelecionado ? produtoSelecionado.nome : busca}
              onChange={(e) => {
                setProdutoSelecionado(null);
                setBusca(e.target.value);
              }}
              placeholder="Nome ou SKU"
            />
            {!produtoSelecionado && busca.trim() && resultados.length > 0 && (
              <div className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover shadow-md">
                {resultados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="block w-full px-2 py-1.5 text-left text-xs hover:bg-accent"
                    onClick={() => {
                      setProdutoSelecionado(p);
                      setBusca("");
                      setResultados([]);
                    }}
                  >
                    <span className="font-medium">{p.nome}</span> — {p.sku}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label>Preço de venda desse anúncio (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
            />
          </div>
          <AceiteTermosCheckbox checked={aceiteTermos} onChange={setAceiteTermos} />
        </div>
        <DialogFooter>
          <Button disabled={loading || !aceiteTermos} onClick={vincular}>
            {loading ? "Vinculando..." : "Confirmar vínculo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
