"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Categoria = { id: string; nome: string; ativa: boolean };

export function ConfiguracoesCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/admin/configuracoes/categorias");
    if (res.ok) {
      const { data } = await res.json();
      setCategorias(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial das categorias ao montar
    carregar();
  }, []);

  async function adicionar() {
    const nome = novoNome.trim();
    if (!nome) return;
    const res = await fetch("/api/admin/configuracoes/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error?.message ?? "Erro ao criar categoria");
      return;
    }
    setNovoNome("");
    carregar();
  }

  async function toggleAtiva(categoria: Categoria) {
    const res = await fetch(`/api/admin/configuracoes/categorias/${categoria.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativa: !categoria.ativa }),
    });
    if (!res.ok) {
      toast.error("Erro ao atualizar categoria");
      return;
    }
    carregar();
  }

  async function remover(id: string) {
    const res = await fetch(`/api/admin/configuracoes/categorias/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Erro ao remover categoria");
      return;
    }
    carregar();
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex gap-2">
        <Input
          placeholder="Nova categoria"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
        />
        <Button type="button" onClick={adicionar}>
          Adicionar
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : categorias.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {categorias.map((categoria) => (
            <li
              key={categoria.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5"
            >
              <span className={categoria.ativa ? "text-sm" : "text-sm text-muted-foreground line-through"}>
                {categoria.nome}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={categoria.ativa}
                    onChange={() => toggleAtiva(categoria)}
                  />
                  Ativa
                </label>
                <button type="button" onClick={() => remover(categoria.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
