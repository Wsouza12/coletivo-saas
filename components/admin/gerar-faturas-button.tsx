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
  DialogDescription,
} from "@/components/ui/dialog";

function formatInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function GerarFaturasButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const hoje = new Date();
  const quinzeDiasAtras = new Date(hoje);
  quinzeDiasAtras.setDate(quinzeDiasAtras.getDate() - 15);

  const [periodoInicio, setPeriodoInicio] = useState(formatInputDate(quinzeDiasAtras));
  const [periodoFim, setPeriodoFim] = useState(formatInputDate(hoje));

  async function gerar() {
    setLoading(true);
    const res = await fetch("/api/admin/financeiro/faturas/gerar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ periodoInicio, periodoFim }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error?.message ?? "Erro ao gerar faturas");
      return;
    }
    const { data } = await res.json();
    toast.success(`${data.total} fatura(s) gerada(s)`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>Gerar Faturas</Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar faturas do período</DialogTitle>
          <DialogDescription>
            Agrupa pedidos ENVIADO/ENTREGUE ainda não faturados, por lojista.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label>Período início</Label>
            <Input
              type="date"
              value={periodoInicio}
              onChange={(e) => setPeriodoInicio(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Período fim</Label>
            <Input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={loading} onClick={gerar}>
            {loading ? "Gerando..." : "Confirmar e gerar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
