"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RastreioPublico } from "@/lib/rastreio";

const ETAPA_LABEL: Record<string, string> = {
  NOVO: "Pedido recebido",
  CONFIRMADO: "Pagamento confirmado",
  SEPARANDO: "Em separação",
  EMBALANDO: "Em embalagem",
  AGUARDANDO_COLETA: "Aguardando coleta",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
};

function formatarData(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Timeline pública de rastreio — sem fotos. Conecta via SSE para receber atualizações em tempo real.
export function RastreioTimeline({ token, inicial }: { token: string; inicial: RastreioPublico }) {
  const [rastreio, setRastreio] = useState<RastreioPublico>(inicial);

  useEffect(() => {
    const source = new EventSource(`/api/rastreio/${token}/stream`);
    source.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!data.error) setRastreio(data);
    };
    return () => source.close();
  }, [token]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Pedido #{rastreio.numero}</p>
        <h1 className="text-xl font-semibold text-foreground">{rastreio.produto}</h1>
        {rastreio.rastreio && (
          <p className="mt-1 text-sm text-muted-foreground">
            Rastreio: <span className="font-medium text-foreground">{rastreio.rastreio}</span>
            {rastreio.transportadora ? ` — ${rastreio.transportadora}` : ""}
          </p>
        )}
      </div>

      {rastreio.cancelado ? (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/15 p-4 text-destructive">
          <XCircle className="h-5 w-5" />
          <span>
            Pedido {rastreio.status === "CANCELADO" ? "cancelado" : "devolvido"}
            {rastreio.motivoCancelamento ? `: ${rastreio.motivoCancelamento}` : ""}
          </span>
        </div>
      ) : (
        <ol className="space-y-4">
          {rastreio.etapas.map((etapa) => (
            <li key={etapa.etapa} className="flex items-start gap-3">
              {etapa.concluida ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <div>
                <p
                  className={cn(
                    "font-medium",
                    etapa.concluida ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {ETAPA_LABEL[etapa.etapa] ?? etapa.etapa}
                </p>
                {etapa.dataHora && (
                  <p className="text-xs text-muted-foreground">{formatarData(etapa.dataHora)}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
