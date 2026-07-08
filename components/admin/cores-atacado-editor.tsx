"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Editor de variações do produto do atacado (cor/tamanho/voltagem). Variações
// são informativas — caixa fechada vem sortida, nada disso gera reserva
// separada. Cor pode ter foto; tamanho/voltagem geralmente não precisa.
// Só funciona depois que o produto existe (precisa do id pra upload).

type Tipo = "COR" | "TAMANHO" | "VOLTAGEM";
type Variacao = { id: string; tipo: Tipo; nome: string; imagemUrl: string | null };

const ROTULOS: Record<Tipo, string> = { COR: "Cor", TAMANHO: "Tamanho", VOLTAGEM: "Voltagem" };
const PLACEHOLDERS: Record<Tipo, string> = {
  COR: "Ex: Vermelho",
  TAMANHO: "Ex: P, M, G, 38, 40",
  VOLTAGEM: "Ex: 110V, 220V, Bivolt",
};

export function CoresAtacadoEditor({ produtoId }: { produtoId: string }) {
  const [variacoes, setVariacoes] = useState<Variacao[] | null>(null);
  const [tipo, setTipo] = useState<Tipo>("COR");
  const [nome, setNome] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    try {
      const res = await fetch(`/api/admin/atacado/produtos/${produtoId}/cores`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setVariacoes(json.data);
      else toast.error(json.error?.message ?? "Erro ao carregar variações");
    } catch {
      toast.error("Erro ao carregar variações");
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId]);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const formData = new FormData();
      formData.append("tipo", tipo);
      formData.append("nome", nome.trim());
      if (arquivo) formData.append("imagem", arquivo);
      let res: Response;
      try {
        res = await fetch(`/api/admin/atacado/produtos/${produtoId}/cores`, {
          method: "POST",
          body: formData,
        });
      } catch (err) {
        console.error("[cores] fetch falhou:", err);
        toast.error("Erro de rede ao adicionar variação");
        return;
      }
      let json: { data?: Variacao; error?: { message?: string } } = {};
      try {
        json = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        console.error("[cores] resposta nao-JSON:", res.status, text);
      }
      if (!res.ok) {
        const msg = json.error?.message ?? `Erro ${res.status}`;
        console.error("[cores] POST falhou:", res.status, json);
        toast.error(msg);
        return;
      }
      toast.success(`${ROTULOS[tipo]} "${nome}" adicionada`);
      setNome("");
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      // Atualiza local pra dar feedback instantâneo, mesmo se o re-fetch demorar.
      if (json.data) {
        const nova = json.data;
        setVariacoes((atual) => (atual ? [...atual, nova] : [nova]));
      }
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: string) {
    const res = await fetch(`/api/admin/atacado/produtos/${produtoId}/cores?corId=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Erro ao remover");
      return;
    }
    setVariacoes((atual) => (atual ? atual.filter((v) => v.id !== id) : null));
  }

  // Agrupa por tipo pra mostrar separado.
  const grupos: Record<Tipo, Variacao[]> = { COR: [], TAMANHO: [], VOLTAGEM: [] };
  (variacoes ?? []).forEach((v) => grupos[v.tipo]?.push(v));

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <Palette className="size-3.5" />
        Variações (opcional) — cor, tamanho, voltagem
      </div>
      <p className="text-[11px] text-muted-foreground">
        Informativo — caixa fechada vem sortida. Cor pode ter foto pra mostrar na vitrine.
      </p>

      {variacoes === null ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : variacoes.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma variação cadastrada.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {(["COR", "TAMANHO", "VOLTAGEM"] as Tipo[]).map((t) =>
            grupos[t].length > 0 ? (
              <div key={t}>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{ROTULOS[t]}</span>
                <div className="flex flex-wrap gap-1.5">
                  {grupos[t].map((v) => (
                    <div key={v.id} className="flex items-center gap-1.5 rounded-md bg-muted px-1.5 py-1 text-xs">
                      {v.imagemUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.imagemUrl} alt={v.nome} className="size-6 rounded object-cover" />
                      ) : null}
                      <span className="font-medium text-foreground">{v.nome}</span>
                      <button type="button" onClick={() => remover(v.id)}>
                        <Trash2 className="size-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}

      <form onSubmit={adicionar} className="flex flex-wrap items-center gap-1.5">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Tipo)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="COR">Cor</option>
          <option value="TAMANHO">Tamanho</option>
          <option value="VOLTAGEM">Voltagem</option>
        </select>
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={PLACEHOLDERS[tipo]}
          className="h-8 flex-1 min-w-[120px] text-xs"
        />
        {tipo === "COR" ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              {arquivo ? arquivo.name.slice(0, 10) : "Foto"}
            </Button>
          </>
        ) : null}
        <Button type="submit" size="sm" className="h-8" disabled={salvando || !nome.trim()}>
          <Plus className="size-3.5" />
          {salvando ? "..." : "Add"}
        </Button>
      </form>
    </div>
  );
}
