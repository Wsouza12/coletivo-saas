import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { ETAPA_LABEL } from "@/lib/rastreio";
import type { EtapaPedidoTimeline } from "@/lib/rastreio";

export function PedidoTimeline({
  etapas,
  cancelado,
  motivoCancelamento,
  status,
  compact = false,
}: {
  etapas: EtapaPedidoTimeline[];
  cancelado: boolean;
  motivoCancelamento?: string | null;
  status: string;
  compact?: boolean;
}) {
  if (cancelado) {
    return (
      <p className="text-sm text-destructive">
        Pedido {status === "CANCELADO" ? "cancelado" : "devolvido"}
        {motivoCancelamento ? `: ${motivoCancelamento}` : ""}
      </p>
    );
  }

  return (
    <ol className={cn("flex flex-col", compact ? "gap-2" : "gap-4")}>
      {etapas.map(({ etapa, concluida, dataHora }) => (
        <li key={etapa} className="flex items-center gap-3">
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full",
              compact ? "size-4" : "size-6",
              concluida ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {concluida && <Check className={compact ? "size-2.5" : "size-3.5"} />}
          </span>
          <span
            className={cn(
              compact ? "text-xs" : "text-sm",
              concluida ? "font-medium text-foreground" : "text-muted-foreground"
            )}
          >
            {ETAPA_LABEL[etapa]}
          </span>
          {dataHora && !compact && (
            <span className="text-xs text-muted-foreground">{formatDateTime(dataHora)}</span>
          )}
        </li>
      ))}
    </ol>
  );
}
