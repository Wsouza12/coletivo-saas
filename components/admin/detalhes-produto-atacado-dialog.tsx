"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL } from "@/lib/format";

type ProdutoAtacado = {
  nome: string;
  descricao: string;
  categoria: string;
  imagemUrl?: string | null;
  marca?: string | null;
  voltagem?: string | null;
  codigoAnatel?: string | null;
  custoUnitario: number;
  precoCatalogo?: number | null;
  precoVendaSugerido?: number | null;
  unidadesPorCaixa: number;
  pesoKg: number;
  comprimentoCm: number;
  larguraCm: number;
  alturaCm: number;
  fornecedor?: { id: string; nome: string } | null;
};

function Linha({ label, valor }: { label: string; valor: React.ReactNode }) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div className="flex justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{valor}</span>
    </div>
  );
}

export function DetalhesProdutoAtacadoDialog({ produto }: { produto: ProdutoAtacado }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => setOpen(true)}>
        <Info className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg sm:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{produto.nome}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {produto.imagemUrl ? (
              <div className="aspect-square w-full max-w-[200px] overflow-hidden rounded-lg bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={produto.imagemUrl} alt={produto.nome} className="h-full w-full object-cover" />
              </div>
            ) : null}

            <p className="text-sm text-muted-foreground">{produto.descricao}</p>

            <div className="divide-y divide-border rounded-lg border border-border px-3">
              <Linha label="Categoria" valor={produto.categoria} />
              <Linha label="Marca" valor={produto.marca} />
              <Linha label="Voltagem" valor={produto.voltagem} />
              <Linha label="Código Anatel" valor={produto.codigoAnatel} />
              <Linha label="Custo do catálogo" valor={formatBRL(produto.custoUnitario)} />
              <Linha label="Preço no catálogo" valor={produto.precoCatalogo ? formatBRL(produto.precoCatalogo) : null} />
              <Linha label="Venda sugerida" valor={produto.precoVendaSugerido ? formatBRL(produto.precoVendaSugerido) : null} />
              <Linha label="Unidades por caixa" valor={produto.unidadesPorCaixa} />
              <Linha label="Peso" valor={`${produto.pesoKg} kg`} />
              <Linha
                label="Dimensões"
                valor={`${produto.comprimentoCm} x ${produto.larguraCm} x ${produto.alturaCm} cm`}
              />
              <Linha label="Fornecedor" valor={produto.fornecedor?.nome} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
