"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

export function CopiarCodigo({ codigo }: { codigo: string }) {
  const [copiado, setCopiado] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      toast.success("Código de rastreio copiado!");
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      toast.error("Falha ao copiar código");
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 ml-2 px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100 text-xs font-semibold border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
      title="Copiar código de rastreamento"
    >
      {copiado ? (
        <>
          <Check className="size-3.5" />
          <span>Copiado!</span>
        </>
      ) : (
        <>
          <Copy className="size-3.5" />
          <span>Copiar</span>
        </>
      )}
    </button>
  );
}
