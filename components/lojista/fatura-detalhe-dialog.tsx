"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";

type ItemPedido = { id: string; quantidade: number; precoUnit: string; produto: { nome: string } };
type Pedido = { id: string; plataformaOrderId: string; valorCusto: string; itens: ItemPedido[] };
type Fatura = { numero: string; valorTotal: string; pedidos: Pedido[] };

export function FaturaDetalheDialog({ faturaId, numero }: { faturaId: string; numero: string }) {
  const [open, setOpen] = useState(false);
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const [loading, setLoading] = useState(false);

  async function abrir() {
    setOpen(true);
    setLoading(true);
    const res = await fetch(`/api/lojista/financeiro/faturas/${faturaId}`);
    if (res.ok) {
      const { data } = await res.json();
      setFatura(data);
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" onClick={abrir}>
        Ver detalhes
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Fatura {numero}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !fatura ? (
          <p className="text-sm text-muted-foreground">Não foi possível carregar a fatura.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fatura.pedidos.map((pedido) => (
              <div key={pedido.id} className="flex justify-between border-b border-border py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">#{pedido.plataformaOrderId}</p>
                  <p className="text-xs text-muted-foreground">
                    {pedido.itens.map((i) => i.produto.nome).join(", ")}
                  </p>
                </div>
                <span>{formatBRL(pedido.valorCusto)}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 text-sm font-semibold">
              <span>Total</span>
              <span>{formatBRL(fatura.valorTotal)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
