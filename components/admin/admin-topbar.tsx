import { MobileSidebar } from "@/components/shared/mobile-sidebar";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { LogoutButton } from "@/components/shared/logout-button";
import { NotificacaoBell } from "@/components/shared/notificacao-bell";

export function AdminTopbar({ adminName }: { adminName: string }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar>
          <AdminSidebarNav />
        </MobileSidebar>
        <span className="text-sm text-muted-foreground">Olá, {adminName}</span>
      </div>
      <div className="flex items-center gap-2">
        <NotificacaoBell endpoint="admin" />
        <LogoutButton />
      </div>
    </header>
  );
}
