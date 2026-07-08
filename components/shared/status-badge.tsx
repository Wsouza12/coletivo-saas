import { cn } from "@/lib/utils";

const PEDIDO_STATUS_STYLE: Record<string, string> = {
  NOVO: "bg-blue-100 text-blue-700",
  CONFIRMADO: "bg-emerald-100 text-emerald-700",
  SEPARANDO: "bg-amber-100 text-amber-700",
  EMBALANDO: "bg-amber-100 text-amber-700",
  AGUARDANDO_COLETA: "bg-orange-100 text-orange-700",
  ENVIADO: "bg-indigo-100 text-indigo-700",
  ENTREGUE: "bg-success/15 text-success",
  CANCELADO: "bg-destructive/15 text-destructive",
  DEVOLVIDO: "bg-destructive/15 text-destructive",
};

const ANUNCIO_STATUS_STYLE: Record<string, string> = {
  RASCUNHO: "bg-muted text-muted-foreground",
  PUBLICADO: "bg-success/15 text-success",
  PAUSADO: "bg-warning/15 text-warning",
  REMOVIDO: "bg-destructive/15 text-destructive",
  ERRO: "bg-destructive/15 text-destructive",
};

const FATURA_STATUS_STYLE: Record<string, string> = {
  PENDENTE: "bg-muted text-muted-foreground",
  ENVIADA: "bg-blue-100 text-blue-700",
  PAGA: "bg-success/15 text-success",
  VENCIDA: "bg-destructive/15 text-destructive",
  CANCELADA: "bg-destructive/15 text-destructive",
};

const USER_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-warning/15 text-warning",
  ACTIVE: "bg-success/15 text-success",
  SUSPENDED: "bg-destructive/15 text-destructive",
};

const DEVOLUCAO_STATUS_STYLE: Record<string, string> = {
  SOLICITADA: "bg-warning/15 text-warning",
  EM_ANDAMENTO: "bg-blue-100 text-blue-700",
  REEMBOLSADA: "bg-success/15 text-success",
  NEGADA: "bg-destructive/15 text-destructive",
};

const RODADA_ATACADO_STATUS_STYLE: Record<string, string> = {
  ABERTA: "bg-success/15 text-success",
  FECHADA: "bg-blue-100 text-blue-700",
  SEPARANDO: "bg-amber-100 text-amber-700",
  EMBALANDO: "bg-amber-100 text-amber-700",
  PRONTA_ENVIO: "bg-orange-100 text-orange-700",
  CANCELADA: "bg-destructive/15 text-destructive",
  ENVIADA: "bg-emerald-100 text-emerald-700",
};

const ASSINATURA_ATACADO_STATUS_STYLE: Record<string, string> = {
  ATIVA: "bg-success/15 text-success",
  INADIMPLENTE: "bg-warning/15 text-warning",
};

const RESERVA_ATACADO_STATUS_STYLE: Record<string, string> = {
  AGUARDANDO_PAGAMENTO: "bg-warning/15 text-warning",
  PAGO: "bg-success/15 text-success",
};

const LABELS: Record<string, string> = {
  NOVO: "Novo",
  CONFIRMADO: "Confirmado",
  SEPARANDO: "Separando",
  EMBALANDO: "Embalando",
  AGUARDANDO_COLETA: "Aguardando coleta",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
  DEVOLVIDO: "Devolvido",
  RASCUNHO: "Rascunho",
  PUBLICADO: "Publicado",
  PAUSADO: "Pausado",
  REMOVIDO: "Removido",
  ERRO: "Erro",
  PENDENTE: "Pendente",
  ENVIADA: "Enviada",
  PAGA: "Paga",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
  PENDING: "Pendente",
  ACTIVE: "Ativo",
  SUSPENDED: "Suspenso",
  SOLICITADA: "Solicitada",
  EM_ANDAMENTO: "Em andamento",
  REEMBOLSADA: "Reembolsada",
  NEGADA: "Negada",
  ABERTA: "Aberta",
  FECHADA: "Fechada",
  PRONTA_ENVIO: "Pronta para envio",
  ATIVA: "Ativa",
  INADIMPLENTE: "Inadimplente",
  AGUARDANDO_PAGAMENTO: "Aguardando pagamento",
  PAGO: "Pago",
};

const STYLE_MAPS = [
  PEDIDO_STATUS_STYLE,
  ANUNCIO_STATUS_STYLE,
  FATURA_STATUS_STYLE,
  USER_STATUS_STYLE,
  DEVOLUCAO_STATUS_STYLE,
  RODADA_ATACADO_STATUS_STYLE,
  ASSINATURA_ATACADO_STATUS_STYLE,
  RESERVA_ATACADO_STATUS_STYLE,
];

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = STYLE_MAPS.find((map) => status in map)?.[status] ?? "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        style,
        className
      )}
    >
      {LABELS[status] ?? status}
    </span>
  );
}

export function PlataformaBadge({ plataforma }: { plataforma: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        plataforma === "MERCADOLIVRE"
          ? "bg-warning/15 text-warning"
          : "bg-destructive/15 text-destructive"
      )}
    >
      {plataforma === "MERCADOLIVRE" ? "Mercado Livre" : "Shopee"}
    </span>
  );
}
