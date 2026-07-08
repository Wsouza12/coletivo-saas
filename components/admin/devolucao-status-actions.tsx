"use client";

import { useState } from "react";
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
import type { DevolucaoStatus } from "@prisma/client";

export function DevolucaoStatusActions({
  devolucaoId,
  status,
}: {
  devolucaoId: string;
  status: DevolucaoStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [valorReembolso, setValorReembolso] = useState("");

  async function atualizar(novoStatus: DevolucaoStatus, valor?: number) {
    setLoading(true);
    const res = await fetch(`/api/admin/devolucoes/${devolucaoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus, ...(valor !== undefined ? { valorReembolso: valor } : {}) }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error?.message ?? "Erro ao atualizar devolução");
      return;
    }
    toast.success("Devolução atualizada");
    setDialogOpen(false);
    router.refresh();
  }

  if (status === "SOLICITADA") {
    return (
      <div className="flex gap-2">
        <Button size="sm" disabled={loading} onClick={() => atualizar("EM_ANDAMENTO")}>
          Iniciar análise
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive"
          disabled={loading}
          onClick={() => atualizar("NEGADA")}
        >
          Negar
        </Button>
      </div>
    );
  }

  if (status === "EM_ANDAMENTO") {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            Confirmar reembolso
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            disabled={loading}
            onClick={() => atualizar("NEGADA")}
          >
            Negar
          </Button>
        </div>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar reembolso</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <Label htmlFor="valor">Valor reembolsado (R$)</Label>
            <Input
              id="valor"
              type="number"
              step="0.01"
              min="0"
              value={valorReembolso}
              onChange={(e) => setValorReembolso(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              disabled={loading || !valorReembolso}
              onClick={() => atualizar("REEMBOLSADA", Number(valorReembolso))}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
