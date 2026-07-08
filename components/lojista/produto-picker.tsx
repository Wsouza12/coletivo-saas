"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Search } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ProdutoParaPicker = {
  id: string;
  nome: string;
  sku: string;
  precoAtacado: string | number;
  estoque: number;
  imagens: { url: string; alt: string | null }[];
};

export function ProdutoPicker({
  produtos,
  value,
  onChange,
  placeholder = "Selecione um produto",
  excluirIds = [],
}: {
  produtos: ProdutoParaPicker[];
  value: string;
  onChange: (produtoId: string) => void;
  placeholder?: string;
  excluirIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");

  const selecionado = produtos.find((p) => p.id === value);

  const opcoes = useMemo(() => {
    const semExcluidos = produtos.filter((p) => p.id === value || !excluirIds.includes(p.id));
    const termo = busca.trim().toLowerCase();
    if (!termo) return semExcluidos;
    return semExcluidos.filter(
      (p) => p.nome.toLowerCase().includes(termo) || p.sku.toLowerCase().includes(termo)
    );
  }, [produtos, excluirIds, value, busca]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-auto w-full justify-start gap-2 px-2 py-1.5"
        onClick={() => setOpen(true)}
      >
        {selecionado ? (
          <>
            <div className="relative size-8 shrink-0 overflow-hidden rounded-md bg-muted">
              {selecionado.imagens[0] && (
                <Image
                  src={selecionado.imagens[0].url}
                  alt={selecionado.imagens[0].alt ?? selecionado.nome}
                  fill
                  className="object-cover"
                />
              )}
            </div>
            <div className="flex min-w-0 flex-col items-start text-left">
              <span className="truncate text-sm font-medium">{selecionado.nome}</span>
              <span className="font-mono text-xs text-muted-foreground">{selecionado.sku}</span>
            </div>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">{placeholder}</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] w-full max-w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Selecionar produto</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 px-4 pb-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Buscar por nome ou SKU..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex max-h-[50vh] flex-col gap-1 overflow-y-auto">
              {opcoes.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum produto encontrado.
                </p>
              ) : (
                opcoes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      onChange(p.id);
                      setOpen(false);
                      setBusca("");
                    }}
                    className="flex items-center gap-3 rounded-md p-2 text-left hover:bg-accent"
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {p.imagens[0] && (
                        <Image
                          src={p.imagens[0].url}
                          alt={p.imagens[0].alt ?? p.nome}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{p.nome}</span>
                      <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                    </div>
                    <div className="flex flex-col items-end text-xs text-muted-foreground">
                      <span>{formatBRL(Number(p.precoAtacado))}</span>
                      <span className={p.estoque <= 0 ? "text-destructive" : ""}>
                        Estoque: {p.estoque}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
