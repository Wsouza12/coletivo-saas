"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { FaturaStatus } from "@prisma/client";

export function FaturaStatusActions({
  faturaId,
  status,
}: {
  faturaId: string;
  status: FaturaStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function enviar() {
    setLoading(true);
    const res = await fetch(`/api/admin/financeiro/faturas/${faturaId}/enviar`, {
      method: "POST",
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Erro ao enviar fatura");
      return;
    }
    toast.success("Fatura enviada com link de pagamento");
    router.refresh();
  }

  async function marcarPaga() {
    setLoading(true);
    const res = await fetch(`/api/admin/financeiro/faturas/${faturaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAGA" }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Erro ao atualizar fatura");
      return;
    }
    toast.success("Fatura marcada como paga");
    router.refresh();
  }

  if (status === "PENDENTE") {
    return (
      <Button size="sm" disabled={loading} onClick={enviar}>
        Enviar Fatura
      </Button>
    );
  }
  if (status === "ENVIADA" || status === "VENCIDA") {
    return (
      <Button size="sm" variant="outline" disabled={loading} onClick={marcarPaga}>
        Marcar como Paga
      </Button>
    );
  }
  return null;
}
