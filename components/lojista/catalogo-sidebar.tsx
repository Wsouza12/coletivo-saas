"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function CatalogoSidebar({
  categorias,
  totalGeral,
}: {
  categorias: { nome: string; total: number }[];
  totalGeral: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoriaAtiva = searchParams.get("categoria");

  function irPara(categoria: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (categoria) params.set("categoria", categoria);
    else params.delete("categoria");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="px-2 pb-1 text-xs font-semibold uppercase text-muted-foreground">
        Categorias
      </span>
      <button
        type="button"
        onClick={() => irPara(null)}
        className={cn(
          "flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-medium",
          !categoriaAtiva ? "bg-primary text-primary-foreground" : "hover:bg-accent"
        )}
      >
        <span>Todos os produtos</span>
        <span className="text-xs">{totalGeral}</span>
      </button>
      {categorias.map((c) => (
        <button
          key={c.nome}
          type="button"
          onClick={() => irPara(c.nome)}
          className={cn(
            "flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm",
            categoriaAtiva === c.nome
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent"
          )}
        >
          <span>{c.nome}</span>
          <span className={cn("text-xs", categoriaAtiva === c.nome ? "" : "text-muted-foreground")}>
            {c.total}
          </span>
        </button>
      ))}
    </div>
  );
}
