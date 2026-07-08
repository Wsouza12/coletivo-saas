"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";

export function BotaoCopiarLinkAssinatura() {
  const [copiado, setCopiado] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/assinatura` : "";

  function copiar() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="flex gap-2 items-center mt-2">
      <Button variant="outline" size="sm" onClick={copiar} className="gap-2">
        {copiado ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
        {copiado ? "Copiado!" : "Copiar Link da Assinatura"}
      </Button>
      <a href="/assinatura" target="_blank" rel="noreferrer">
        <Button variant="secondary" size="sm" className="gap-2">
          <ExternalLink className="size-4" />
          Ver Página
        </Button>
      </a>
    </div>
  );
}
