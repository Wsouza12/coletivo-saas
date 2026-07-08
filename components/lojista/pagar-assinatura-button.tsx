"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PagarAssinaturaButton() {
  const [loading, setLoading] = useState(false);

  async function pagar() {
    setLoading(true);
    const res = await fetch("/api/lojista/assinatura/pagar", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      toast.error("Erro ao gerar pagamento — tente novamente em alguns minutos");
      return;
    }
    const { data } = await res.json();
    window.location.href = data.link;
  }

  return (
    <Button onClick={pagar} disabled={loading} className="w-full">
      {loading ? "Gerando pagamento..." : "Pagar R$ 29,99 e liberar 30 dias"}
    </Button>
  );
}
