"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function SolicitarDevolucaoButton({ pedidoId }: { pedidoId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);

  async function solicitar() {
    if (!motivo.trim()) {
      toast.error("Descreva o motivo da devolução");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/lojista/devolucoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pedidoId, motivo }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error?.message ?? "Erro ao solicitar devolução");
      return;
    }
    toast.success("Devolução solicitada — Pablo vai processar o reembolso");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Solicitar devolução
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar devolução</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          <Label htmlFor="motivo">Motivo</Label>
          <Textarea id="motivo" rows={4} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <DialogFooter>
          <Button disabled={loading} onClick={solicitar}>
            {loading ? "Enviando..." : "Confirmar solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
