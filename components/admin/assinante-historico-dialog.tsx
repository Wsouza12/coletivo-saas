"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatBRL } from "@/lib/format";

type Reserva = {
  id: string;
  quantidade: number;
  valorTotal: string;
  status: string;
  createdAt: string;
  rodada: { produtoAtacado: { nome: string } };
};

export function AssinanteHistoricoDialog({ assinanteId }: { assinanteId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reservas, setReservas] = useState<Reserva[] | null>(null);

  async function abrir() {
    setOpen(true);
    if (reservas) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/assinantes/${assinanteId}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error("Erro ao carregar histórico");
        return;
      }
      setReservas(json.data.reservas);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={abrir}>
        <Eye className="size-3.5" />
        Histórico
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-xl sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Histórico de compras</DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : !reservas || reservas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma compra ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {reservas.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{r.rodada.produtoAtacado.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.quantidade}un — {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-primary">{formatBRL(Number(r.valorTotal))}</span>
                    <StatusBadge status={r.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
