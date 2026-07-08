"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Settings,
  Users2,
  Truck,
  MessageCircle,
  Megaphone,
  Map,
  CalendarClock,
  Radar,
  KeyRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Coletivo SaaS — menu só do compras coletivas (white-label).
const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/atacado", label: "Compras Coletivas", icon: Users2 },
  { href: "/admin/atacado/produtos", label: "Catálogo", icon: Package },
  { href: "/admin/atacado/fornecedores", label: "Fornecedores", icon: Truck },
  { href: "/admin/atacado/mapeamento", label: "Mapa de Catálogos", icon: Map },
  { href: "/admin/atacado/agenda", label: "Agenda de Postagem", icon: CalendarClock },
  { href: "/admin/atacado/origens", label: "Origem dos Leads", icon: Radar },
  { href: "/admin/avisos", label: "Avisos da Comunidade", icon: Megaphone },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { href: "/admin/dev", label: "Desenvolvedor", icon: KeyRound },
];

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Compras Coletivas";

export function AdminSidebarNav() {
  const pathname = usePathname();

  // Item ativo = o de href mais longo que casa com a rota atual, pra não acender
  // "Atacado Coletivo" e "Fornecedores" juntos (um é prefixo do outro).
  const hrefAtivo = NAV_ITEMS.map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          {APP_NAME.charAt(0).toUpperCase()}
        </div>
        <span className="font-semibold text-sidebar-foreground">{APP_NAME}</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === hrefAtivo;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
