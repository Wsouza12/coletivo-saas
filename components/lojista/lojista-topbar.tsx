import { MobileSidebar } from "@/components/shared/mobile-sidebar";
import { LojistaSidebarNav } from "@/components/lojista/lojista-sidebar-nav";
import { LogoutButton } from "@/components/shared/logout-button";
import { NotificacaoBell } from "@/components/shared/notificacao-bell";
import { cn } from "@/lib/utils";

export function LojistaTopbar({
  lojistaName,
  storeName,
  pedidosNovos,
  mlConectado,
  shopeeConectado,
  diasRestantesAcesso,
}: {
  lojistaName: string;
  storeName: string;
  pedidosNovos: number;
  mlConectado: boolean;
  shopeeConectado: boolean;
  diasRestantesAcesso?: number | null;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar>
          <LojistaSidebarNav storeName={storeName} pedidosNovos={pedidosNovos} />
        </MobileSidebar>
        <span className="text-sm text-muted-foreground">Olá, {lojistaName}</span>
      </div>
      <div className="flex items-center gap-4">
        {diasRestantesAcesso !== null && diasRestantesAcesso !== undefined && diasRestantesAcesso <= 3 && (
          <span className="rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
            {diasRestantesAcesso <= 0
              ? "Acesso vence hoje"
              : `${diasRestantesAcesso} dia(s) restante(s)`}
          </span>
        )}
        <div className="flex items-center gap-2 text-xs font-medium">
          <span
            title={mlConectado ? "Mercado Livre conectado" : "Mercado Livre não conectado"}
            className={cn(
              "rounded-full px-2 py-1",
              mlConectado
                ? "bg-warning/15 text-warning"
                : "bg-muted text-muted-foreground"
            )}
          >
            ML
          </span>
          <span
            title={shopeeConectado ? "Shopee conectado" : "Shopee não conectado"}
            className={cn(
              "rounded-full px-2 py-1",
              shopeeConectado
                ? "bg-destructive/15 text-destructive"
                : "bg-muted text-muted-foreground"
            )}
          >
            Shopee
          </span>
        </div>
        <NotificacaoBell endpoint="lojista" />
        <LogoutButton />
      </div>
    </header>
  );
}
