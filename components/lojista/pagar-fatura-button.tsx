"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PagarFaturaButton({ linkPagamento }: { linkPagamento: string | null }) {
  function pagar() {
    if (linkPagamento) {
      window.open(linkPagamento, "_blank");
      return;
    }
    toast.info("Link de pagamento via Mercado Pago será disponibilizado na Fase 5");
  }

  return (
    <Button size="sm" onClick={pagar}>
      Pagar agora
    </Button>
  );
}
