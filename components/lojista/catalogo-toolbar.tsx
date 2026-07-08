"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ABAS_ORDENACAO = [
  { value: "atualizados", label: "Recém atualizados" },
  { value: "cadastrados", label: "Últ. cadastrados" },
  { value: "vendidos_7d", label: "+Vendidos 7d" },
  { value: "vendidos_30d", label: "+Vendidos 30d" },
  { value: "vendidos_90d", label: "+Vendidos 90d" },
];

export function CatalogoToolbar({ total }: { total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ordenarAtivo = searchParams.get("ordenar") ?? "atualizados";

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produto por nome ou SKU..."
            defaultValue={searchParams.get("q") ?? ""}
            className="pl-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") setParam("q", e.currentTarget.value || null);
            }}
            onBlur={(e) => setParam("q", e.currentTarget.value || null)}
          />
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">{total} produtos</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {ABAS_ORDENACAO.map((aba) => (
          <button
            key={aba.value}
            type="button"
            onClick={() => setParam("ordenar", aba.value === "atualizados" ? null : aba.value)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium",
              ordenarAtivo === aba.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-accent"
            )}
          >
            {aba.label}
          </button>
        ))}
      </div>
    </div>
  );
}
