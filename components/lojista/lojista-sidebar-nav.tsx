"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Megaphone,
  ClipboardList,
  Wallet,
  Plug,
  Undo2,
  Settings,
  PackagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/catalogo", label: "Catálogo", icon: Store },
  { href: "/meus-anuncios", label: "Meus Anúncios", icon: Megaphone },
  { href: "/kits", label: "Kits", icon: PackagePlus },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList, badgeKey: "pedidosNovos" as const },
  { href: "/devolucoes", label: "Devoluções", icon: Undo2 },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/integracoes", label: "Integrações", icon: Plug },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function LojistaSidebarNav({
  storeName,
  pedidosNovos = 0,
}: {
  storeName: string;
  pedidosNovos?: number;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 flex-col justify-center gap-0.5 border-b border-sidebar-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            D
          </div>
          <span className="font-semibold text-sidebar-foreground">DropyAtacado.com.br</span>
        </div>
        <span className="ml-10 truncate text-xs text-muted-foreground">{storeName}</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const badgeCount = item.badgeKey === "pedidosNovos" ? pedidosNovos : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="size-4" />
                {item.label}
              </span>
              {badgeCount > 0 && (
                <Badge
                  variant={isActive ? "secondary" : "default"}
                  className="h-5 min-w-5 justify-center rounded-full px-1"
                >
                  {badgeCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
