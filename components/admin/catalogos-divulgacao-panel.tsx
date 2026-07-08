"use client";

import { useEffect, useState } from "react";
import { Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CatalogoDivulgacaoDialog } from "@/components/admin/catalogo-divulgacao-dialog";

type Catalogo = {
  id: string;
  nome: string;
  arquivoUrl: string;
  data: string | null;
  fornecedorId: string;
  fornecedor: { nome: string };
  _count: { itens: number };
};

export function CatalogosDivulgacaoPanel() {
  const [catalogos, setCatalogos] = useState<Catalogo[] | null>(null);
  const [busca, setBusca] = useState("");

  async function carregar() {
    const res = await fetch("/api/admin/atacado/catalogos", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setCatalogos(json.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const termo = norm(busca.trim());
  const catalogosFiltrados = !termo
    ? catalogos
    : (catalogos ?? []).filter((c) => norm(c.nome).includes(termo) || norm(c.fornecedor.nome).includes(termo));

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por catálogo ou fornecedor..."
          className="pl-8"
        />
      </div>

      {!catalogos ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : catalogos.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nenhum catálogo encontrado.</p>
      ) : catalogosFiltrados!.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nenhum resultado para "{busca}".</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {catalogosFiltrados!.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="size-4 text-primary shrink-0" />
                <span className="truncate text-sm font-semibold text-foreground" title={c.nome}>
                  {c.nome}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate" title={c.fornecedor.nome}>
                Fornecedor: {c.fornecedor.nome}
              </p>
              <div className="flex items-center justify-between mt-auto pt-2 border-t text-[11px] text-muted-foreground">
                <span>{c._count.itens} itens pré-cadastrados</span>
                <span>{c.data ? new Date(c.data).toLocaleDateString("pt-BR") : ""}</span>
              </div>
              <div className="mt-2">
                <CatalogoDivulgacaoDialog catalogoId={c.id} nome={c.nome} fornecedorNome={c.fornecedor.nome} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
