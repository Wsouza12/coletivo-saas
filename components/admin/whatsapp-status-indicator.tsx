"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function WhatsAppStatusIndicator() {
  const [state, setState] = useState<string>("loading");

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    async function checkStatus() {
      try {
        const r = await fetch("/api/admin/evolution/status");
        if (!r.ok) {
          setState("error");
          return;
        }
        const data = await r.json();
        setState(data?.state || "unknown");
      } catch (e) {
        setState("error");
      } finally {
        timeoutId = setTimeout(checkStatus, 10000); // 10 segundos
      }
    }

    checkStatus();

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  let colorClass = "bg-muted-foreground/30";
  let textColor = "text-muted-foreground";
  let label = "Carregando...";

  if (state !== "loading") {
    if (state === "open") {
      colorClass = "bg-green-500";
      textColor = "text-green-600 dark:text-green-500";
      label = "Conectado";
    } else if (state === "unconfigured") {
      colorClass = "bg-yellow-500";
      textColor = "text-yellow-600 dark:text-yellow-500";
      label = "Não config.";
    } else if (state === "error" || state === "close" || state === "connecting") {
      colorClass = "bg-red-500";
      textColor = "text-red-600 dark:text-red-500";
      label = "Desconectado";
    } else {
      colorClass = "bg-red-500";
      textColor = "text-red-600 dark:text-red-500";
      label = "Desconectado";
    }
  }

  return (
    <div className="flex items-center justify-between px-6 py-2 border-b border-sidebar-border bg-sidebar-accent/30">
      <div className="flex items-center gap-2">
        <div className="relative flex size-2">
          {state === "open" && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
          )}
          <span className={cn("relative inline-flex size-2 rounded-full", colorClass)}></span>
        </div>
        <span className={cn("text-[11px] font-medium uppercase tracking-wider", textColor)}>
          {label}
        </span>
      </div>
      <span className="text-[9px] text-muted-foreground uppercase">WhatsApp</span>
    </div>
  );
}
