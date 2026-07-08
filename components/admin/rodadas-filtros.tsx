"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TABS = [
  { value: "abertas", label: "Abertas" },
  { value: "fechadas", label: "Fechadas" },
  { value: "todas", label: "Todas" },
  { value: "solicitacoes", label: "Solicitações" },
];

const STATUS_OPTIONS = [
  { value: "FECHADA", label: "Fechada (Aguardando)" },
  { value: "SEPARANDO", label: "Separando" },
  { value: "EMBALANDO", label: "Embalando" },
  { value: "PRONTA_ENVIO", label: "Pronta para Envio" },
  { value: "ENVIADA", label: "Enviada" },
  { value: "CANCELADA", label: "Cancelada" },
];

export function RodadasFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get("tab") ?? "abertas";
  const currentStatus = searchParams.get("status") ?? "all";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Ao trocar a aba, reseta o filtro de status se mudar para "abertas"
    if (key === "tab" && value === "abertas") {
      params.delete("status");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Abas de Navegação */}
      <div className="flex border-b border-muted">
        {TABS.map((tab) => {
          const isActive = currentTab === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setParam("tab", tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Inputs e Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Buscar por produto ou código..."
          defaultValue={searchParams.get("q") ?? ""}
          className="max-w-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") setParam("q", e.currentTarget.value);
          }}
          onBlur={(e) => setParam("q", e.currentTarget.value)}
        />

        {/* Dropdown de status específico, exibido apenas se não for a aba "abertas" */}
        {currentTab !== "abertas" && (
          <Select
            value={currentStatus}
            onValueChange={(value) => setParam("status", value)}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Status da Caixa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status fechados</SelectItem>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
