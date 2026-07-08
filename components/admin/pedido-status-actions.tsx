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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSPORTADORAS } from "@/lib/constants";
import type { PedidoStatus } from "@prisma/client";

export function PedidoStatusActions({
  pedidoId,
  status,
}: {
  pedidoId: string;
  status: PedidoStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [nfDialogOpen, setNfDialogOpen] = useState(false);
  const [enviadoDialogOpen, setEnviadoDialogOpen] = useState(false);
  const [notaFiscal, setNotaFiscal] = useState("");
  const [rastreio, setRastreio] = useState("");
  const [transportadora, setTransportadora] = useState("");

  async function atualizarStatus(payload: Record<string, unknown>) {
    setLoading(true);
    const res = await fetch(`/api/admin/pedidos/${pedidoId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error?.message ?? "Erro ao atualizar pedido");
      return;
    }
    toast.success("Pedido atualizado");
    setNfDialogOpen(false);
    setEnviadoDialogOpen(false);
    router.refresh();
  }

  switch (status) {
    case "NOVO":
      return (
        <Button size="sm" disabled={loading} onClick={() => atualizarStatus({ status: "CONFIRMADO" })}>
          Confirmar
        </Button>
      );
    case "CONFIRMADO":
      return (
        <Button size="sm" disabled={loading} onClick={() => atualizarStatus({ status: "SEPARANDO" })}>
          Iniciar Separação
        </Button>
      );
    case "SEPARANDO":
      return (
        <Button size="sm" disabled={loading} onClick={() => atualizarStatus({ status: "EMBALANDO" })}>
          Iniciar Embalagem
        </Button>
      );
    case "EMBALANDO":
      return (
        <Dialog open={nfDialogOpen} onOpenChange={setNfDialogOpen}>
          <Button size="sm" onClick={() => setNfDialogOpen(true)}>
            Pronto p/ Coleta
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pronto para coleta</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="nf">Nota Fiscal</Label>
              <Input id="nf" value={notaFiscal} onChange={(e) => setNotaFiscal(e.target.value)} />
            </div>
            <DialogFooter>
              <Button
                disabled={loading}
                onClick={() =>
                  atualizarStatus({ status: "AGUARDANDO_COLETA", notaFiscal: notaFiscal || undefined })
                }
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    case "AGUARDANDO_COLETA":
      return (
        <Dialog open={enviadoDialogOpen} onOpenChange={setEnviadoDialogOpen}>
          <Button size="sm" onClick={() => setEnviadoDialogOpen(true)}>
            Marcar Enviado
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar como enviado</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="rastreio">Código de rastreio</Label>
                <Input id="rastreio" value={rastreio} onChange={(e) => setRastreio(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Transportadora</Label>
                <Select value={transportadora} onValueChange={(v) => setTransportadora(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORTADORAS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={loading || !rastreio || !transportadora}
                onClick={() => atualizarStatus({ status: "ENVIADO", rastreio, transportadora })}
              >
                Confirmar envio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      );
    default:
      return null;
  }
}
