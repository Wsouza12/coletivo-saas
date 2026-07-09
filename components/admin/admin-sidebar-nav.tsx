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
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WhatsAppStatusIndicator } from "./whatsapp-status-indicator";

const NAV_ITEMS = [
  { href: "/admin/atacado", label: "Todas as Caixas", icon: Users2, desc: "Painel de caixas." },
  { href: "/admin/atacado/dashboard", label: "Painel Financeiro", icon: LayoutDashboard, desc: "Gráficos financeiros e métricas." },
  { href: "/admin/atacado/assinantes", label: "Assinantes", icon: Users, desc: "Gerencie os membros da comunidade." },
  { href: "/admin/atacado/produtos", label: "Loja (vitrine)", icon: Package, desc: "Cadastre e gerencie os produtos à venda." },
  { href: "/admin/atacado/fornecedores", label: "Catálogos", icon: Truck, desc: "Adicione PDFs e catálogos dos fabricantes." },
  { href: "/admin/atacado/mapeamento", label: "Pesquisa por imagem", icon: Map, desc: "Encontre produtos na internet usando uma foto." },
  { href: "/admin/atacado/agenda", label: "Mensagens Agendadas", icon: CalendarClock, desc: "Programe envios no WhatsApp da comunidade." },
  { href: "/admin/atacado/origens", label: "Link para divulgação", icon: Radar, desc: "Links com rastreio de UTM para campanhas." },
  { href: "/admin/avisos", label: "Avisos da Comunidade", icon: Megaphone, desc: "Publique alertas para os assinantes." },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle, desc: "Status de conexão do robô atendente." },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, desc: "Ajustes gerais e regras de negócio." },
  { href: "/admin/dev", label: "Desenvolvedor", icon: KeyRound, desc: "Configurações técnicas e chaves de API." },
];

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Compras Coletivas";

export function AdminSidebarNav({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();

  // Item ativo = o de href mais longo que casa com a rota atual, pra não acender
  // "Atacado Coletivo" e "Fornecedores" juntos (um é prefixo do outro).
  const hrefAtivo = NAV_ITEMS.map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <img src="/icon.png" alt="Logo" className="size-8 object-contain rounded-md" />
        <span className="font-semibold text-sidebar-foreground">{APP_NAME}</span>
      </div>
      <WhatsAppStatusIndicator />
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.filter((item) => {
          if (item.href === "/admin/dev") {
            return userEmail === "ceopablowanderson@gmail.com";
          }
          return true;
        }).map((item) => {
          const isActive = item.href === hrefAtivo;
          const Icon = item.icon;
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger>
                <Link
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
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px] text-xs">
                <p>{item.desc}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </div>
  );
}
