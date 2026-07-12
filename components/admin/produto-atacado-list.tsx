"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Camera, Trash2, Send, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL } from "@/lib/format";
import { CriarRodadaAtacadoDialog } from "@/components/admin/criar-rodada-atacado-dialog";
import { DetalhesProdutoAtacadoDialog } from "@/components/admin/detalhes-produto-atacado-dialog";
import { EditarProdutoAtacadoDialog } from "@/components/admin/editar-produto-atacado-dialog";

type Fornecedor = { id: string; nome: string };

type ProdutoAtacado = {
  id: string;
  codigo?: string | null;
  nome: string;
  descricao: string;
  categoria: string;
  imagemUrl: string | null;
  marca?: string | null;
  voltagem?: string | null;
  codigoAnatel?: string | null;
  custoUnitario: number;
  precoCatalogo?: number | null;
  precoVendaSugerido?: number | null;
  reservaLojaPadrao?: number | null;
  linkConviteWhatsapp?: string | null;
  unidadesPorCaixa: number;
  pesoKg: number;
  comprimentoCm: number;
  larguraCm: number;
  alturaCm: number;
  ativo: boolean;
  fornecedor?: { id: string; nome: string } | null;
  cores?: { id: string; tipo: "COR" | "TAMANHO" | "VOLTAGEM"; nome: string; imagemUrl: string | null }[];
  catalogoOrigem?: { nome: string; pagina: number } | null;
};

export function ProdutoAtacadoList({
  produtos,
  fornecedores = [],
  taxaServicoPadrao = 10,
}: {
  produtos: (ProdutoAtacado & { esgotado?: boolean })[];
  fornecedores?: Fornecedor[];
  taxaServicoPadrao?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busca, setBusca] = useState(searchParams.get("q") || "");

  const termo = busca.trim().toLowerCase();
  const produtosFiltrados = termo
    ? produtos.filter(
        (p) => p.nome.toLowerCase().includes(termo) || (p.codigo ?? "").toLowerCase().includes(termo)
      )
    : produtos;

  if (produtos.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum produto cadastrado ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou código..."
          className="pl-8"
        />
      </div>

      {produtosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado para &quot;{busca}&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {produtosFiltrados.map((produto) => (
            <ProdutoAtacadoCard
              key={produto.id}
              produto={produto}
              fornecedores={fornecedores}
              taxaServicoPadrao={taxaServicoPadrao}
              onChange={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProdutoAtacadoCard({
  produto,
  fornecedores,
  taxaServicoPadrao,
  onChange,
}: {
  produto: ProdutoAtacado & { esgotado?: boolean };
  fornecedores: Fornecedor[];
  taxaServicoPadrao: number;
  onChange: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/atacado/produtos/${produto.id}/imagem`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro no upload");
        return;
      }
      onChange();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function toggleAtivo() {
    const res = await fetch(`/api/admin/atacado/produtos/${produto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !produto.ativo }),
    });
    if (!res.ok) {
      toast.error("Erro ao atualizar");
      return;
    }
    onChange();
  }

  async function toggleEsgotado() {
    const res = await fetch(`/api/admin/atacado/produtos/${produto.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ esgotado: !produto.esgotado }),
    });
    if (!res.ok) {
      toast.error("Erro ao atualizar status de esgotado");
      return;
    }
    onChange();
  }

  async function excluir() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/atacado/produtos/${produto.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao excluir");
        return;
      }
      toast.success("Produto excluído");
      onChange();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-3">
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
          {produto.imagemUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.imagemUrl} alt={produto.nome} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem foto</div>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute bottom-1.5 right-1.5 h-7 px-2 text-xs"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="size-3" />
            {uploading ? "..." : "Foto"}
          </Button>
        </div>

        <span className="truncate text-base font-bold text-foreground" title={produto.nome}>
          {produto.nome}
        </span>
        {produto.codigo ? (
          <span className="text-sm font-mono text-muted-foreground">Cód: {produto.codigo}</span>
        ) : null}
        <span className="text-sm text-muted-foreground">
          {produto.categoria}
          {produto.marca ? ` — ${produto.marca}` : ""}
          {produto.voltagem ? ` — ${produto.voltagem}` : ""}
        </span>
        <span className="text-sm font-medium">
          {formatBRL(produto.custoUnitario)}/un — {produto.unidadesPorCaixa}un/caixa
        </span>
        {produto.codigoAnatel ? (
          <span className="text-sm text-muted-foreground">Anatel: {produto.codigoAnatel}</span>
        ) : null}
        {produto.precoCatalogo ? (
          <span className="text-sm text-muted-foreground">Preço no catálogo: {formatBRL(produto.precoCatalogo)}</span>
        ) : null}
        {produto.precoVendaSugerido ? (
          <span className="text-sm text-muted-foreground">Venda sugerida: {formatBRL(produto.precoVendaSugerido)}</span>
        ) : null}
        {produto.fornecedor ? (
          <span className="truncate text-sm text-muted-foreground" title={produto.fornecedor.nome}>
            Fornecedor: {produto.fornecedor.nome}
          </span>
        ) : null}
        {produto.catalogoOrigem ? (
          <span className="truncate text-sm text-muted-foreground" title={produto.catalogoOrigem.nome}>
            Catálogo: {produto.catalogoOrigem.nome} — pág. {produto.catalogoOrigem.pagina}
          </span>
        ) : null}

        <div className="mt-2 flex flex-col gap-2 border-t border-border/50 pt-2">
          {/* Toggles */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <button
                type="button"
                onClick={toggleAtivo}
                title={produto.ativo ? "Ativo na vitrine" : "Oculto na vitrine"}
                aria-pressed={produto.ativo}
                className={`inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                  produto.ativo ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block size-3 translate-x-0.5 rounded-full bg-white shadow transition-transform ${
                    produto.ativo ? "translate-x-3" : ""
                  }`}
                />
              </button>
              Vitrine
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <button
                type="button"
                onClick={toggleEsgotado}
                title={produto.esgotado ? "Produto esgotado" : "Em estoque"}
                aria-pressed={produto.esgotado}
                className={`inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
                  produto.esgotado ? "bg-destructive" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block size-3 translate-x-0.5 rounded-full bg-white shadow transition-transform ${
                    produto.esgotado ? "translate-x-3" : ""
                  }`}
                />
              </button>
              <span className={produto.esgotado ? "text-destructive font-bold uppercase tracking-tighter text-[10px]" : ""}>Esgotado</span>
            </label>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between gap-1 mt-0.5 rounded bg-muted/30 p-1">
            <CriarRodadaAtacadoDialog
              produtos={[]}
              taxaServicoPadrao={taxaServicoPadrao}
              produtoFixo={{
                id: produto.id,
                nome: produto.nome,
                custoUnitario: produto.custoUnitario,
                unidadesPorCaixa: produto.unidadesPorCaixa,
                imagemUrl: produto.imagemUrl,
                reservaLojaPadrao: produto.reservaLojaPadrao,
                coresVariadas: (produto as { coresVariadas?: boolean }).coresVariadas,
                cores: produto.cores,
              }}
              trigger={
                <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px] font-medium bg-background border-border">
                  <Send className="mr-1 size-3 text-primary" />
                  Rodada
                </Button>
              }
            />
            <div className="flex items-center gap-0.5">
              <DetalhesProdutoAtacadoDialog produto={produto} />
              <EditarProdutoAtacadoDialog produto={produto} fornecedores={fornecedores} onChange={onChange} />
              <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5 hover:bg-destructive/10" disabled={deleting} onClick={excluir} title="Excluir produto">
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
