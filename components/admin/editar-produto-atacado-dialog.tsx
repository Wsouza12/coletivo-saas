"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIAS } from "@/lib/constants";
import { ReservaPreview } from "@/components/admin/criar-produto-atacado-dialog";
import { CoresAtacadoEditor } from "@/components/admin/cores-atacado-editor";

type Fornecedor = { id: string; nome: string };

type ProdutoAtacado = {
  id: string;
  codigo?: string | null;
  nome: string;
  descricao: string;
  categoria: string;
  marca?: string | null;
  voltagem?: string | null;
  codigoAnatel?: string | null;
  custoUnitario: number;
  precoCatalogo?: number | null;
  precoVendaSugerido?: number | null;
  minimoUnidadesPadrao?: number | null;
  reservaLojaPadrao?: number | null;
  unidadesPorCaixa: number;
  pesoKg: number;
  comprimentoCm: number;
  larguraCm: number;
  alturaCm: number;
  coresVariadas?: boolean;
  fornecedor?: { id: string; nome: string } | null;
};

export function EditarProdutoAtacadoDialog({
  produto,
  fornecedores = [],
  onChange,
  openByDefault = false,
  hideTrigger = false,
}: {
  produto: ProdutoAtacado;
  fornecedores?: Fornecedor[];
  onChange: () => void;
  openByDefault?: boolean;
  hideTrigger?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(openByDefault);
  const [loading, setLoading] = useState(false);
  const [gerandoDescricao, setGerandoDescricao] = useState(false);
  const [codigo, setCodigo] = useState(produto.codigo ?? "");
  const [nome, setNome] = useState(produto.nome);
  const [descricao, setDescricao] = useState(produto.descricao);
  const [categoria, setCategoria] = useState(produto.categoria);
  const [marca, setMarca] = useState(produto.marca ?? "");
  const [voltagem, setVoltagem] = useState(produto.voltagem ?? "");
  const [codigoAnatel, setCodigoAnatel] = useState(produto.codigoAnatel ?? "");
  const [custoUnitario, setCustoUnitario] = useState(String(produto.custoUnitario));
  const [precoCatalogo, setPrecoCatalogo] = useState(produto.precoCatalogo != null ? String(produto.precoCatalogo) : "");
  const [precoVendaSugerido, setPrecoVendaSugerido] = useState(
    produto.precoVendaSugerido != null ? String(produto.precoVendaSugerido) : ""
  );
  const [minimoUnidadesPadrao, setMinimoUnidadesPadrao] = useState(
    produto.minimoUnidadesPadrao != null ? String(produto.minimoUnidadesPadrao) : "1"
  );
  const [reservaLojaPadrao, setReservaLojaPadrao] = useState(
    produto.reservaLojaPadrao != null ? String(produto.reservaLojaPadrao) : ""
  );
  const [unidadesPorCaixa, setUnidadesPorCaixa] = useState(String(produto.unidadesPorCaixa));
  const [pesoKg, setPesoKg] = useState(String(produto.pesoKg));
  const [comprimentoCm, setComprimentoCm] = useState(String(produto.comprimentoCm));
  const [larguraCm, setLarguraCm] = useState(String(produto.larguraCm));
  const [alturaCm, setAlturaCm] = useState(String(produto.alturaCm));
  const [fornecedorId, setFornecedorId] = useState(produto.fornecedor?.id ?? "");
  const ehEstoqueProprioInicial = produto.fornecedor?.nome?.includes("ESTOQUE PRÓPRIO") ?? false;
  const [isEstoqueProprio, setIsEstoqueProprio] = useState(ehEstoqueProprioInicial);
  const [coresVariadas, setCoresVariadas] = useState(produto.coresVariadas ?? false);

  async function gerarDescricao() {
    if (!nome.trim()) {
      toast.error("Preencha o nome antes de gerar a descrição");
      return;
    }
    setGerandoDescricao(true);
    try {
      const res = await fetch("/api/admin/atacado/produtos/gerar-descricao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, categoria, marca: marca || undefined, voltagem: voltagem || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao gerar descrição");
        return;
      }
      setDescricao(json.data.descricao);
      toast.success("Descrição gerada — ajuste se quiser");
    } finally {
      setGerandoDescricao(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/produtos/${produto.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: codigo || undefined,
          nome,
          descricao,
          categoria,
          marca: marca || undefined,
          voltagem: voltagem || undefined,
          codigoAnatel: codigoAnatel || undefined,
          custoUnitario: Number(custoUnitario),
          precoCatalogo: precoCatalogo ? Number(precoCatalogo) : undefined,
          precoVendaSugerido: precoVendaSugerido ? Number(precoVendaSugerido) : undefined,
          reservaLojaPadrao: reservaLojaPadrao ? Number(reservaLojaPadrao) : undefined,
          minimoUnidadesPadrao: Number(minimoUnidadesPadrao) || 1,
          unidadesPorCaixa: Number(unidadesPorCaixa),
          pesoKg: Number(pesoKg),
          comprimentoCm: Number(comprimentoCm),
          larguraCm: Number(larguraCm),
          alturaCm: Number(alturaCm),
          fornecedorId: isEstoqueProprio ? "ESTOQUE_PROPRIO" : (fornecedorId || undefined),
          coresVariadas,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao salvar produto");
        return;
      }
      toast.success("Produto atualizado");
      setOpen(false);
      onChange();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!hideTrigger && (
        <Button type="button" size="sm" variant="ghost" className="h-7 px-1.5" onClick={() => setOpen(true)}>
          <Pencil className="size-3.5" />
        </Button>
      )}
      <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val && hideTrigger) onChange(); // When closed and has no trigger, it was mounted conditionally, so call onChange to unmount it.
      }}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg sm:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Editar produto</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Label>Código do produto (opcional)</Label>
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ex: LE-519-1 (do catálogo do fornecedor)"
            />

            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required />

            <div className="flex items-center justify-between">
              <Label>Descrição</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7"
                disabled={gerandoDescricao || !nome.trim()}
                onClick={gerarDescricao}
              >
                <Sparkles className={`size-3.5 ${gerandoDescricao ? "animate-pulse" : ""}`} />
                {gerandoDescricao ? "Gerando..." : "Gerar com IA"}
              </Button>
            </div>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} required />

            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={(v) => v && setCategoria(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione">{() => categoria || "Selecione"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Marca (opcional)</Label>
                <Input value={marca} onChange={(e) => setMarca(e.target.value)} />
              </div>
              <div>
                <Label>Voltagem (opcional)</Label>
                <Input value={voltagem} onChange={(e) => setVoltagem(e.target.value)} placeholder="127V, 220V, Bivolt..." />
              </div>
            </div>

            <Label>Código Anatel (opcional)</Label>
            <Input value={codigoAnatel} onChange={(e) => setCodigoAnatel(e.target.value)} placeholder="Ex: 00279-20-15621" />

            <Label>Unidades por caixa</Label>
            <Input type="number" min="1" value={unidadesPorCaixa} onChange={(e) => setUnidadesPorCaixa(e.target.value)} required />

            <Label>Reserva padrão pra minha loja (opcional)</Label>
            <Input
              type="number"
              min="0"
              value={reservaLojaPadrao}
              onChange={(e) => setReservaLojaPadrao(e.target.value)}
              placeholder="Pré-preenche a reserva ao criar a rodada"
            />

            <ReservaPreview
              custo={Number(custoUnitario)}
              meta={Number(unidadesPorCaixa)}
              reserva={Number(reservaLojaPadrao)}
            />

            <Label>Preços (R$)</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Input type="number" step="0.01" min="0" value={custoUnitario} onChange={(e) => setCustoUnitario(e.target.value)} placeholder="Custo" required />
                <span className="text-xs text-muted-foreground">Custo do catálogo</span>
              </div>
              <div>
                <Input type="number" step="0.01" min="0" value={precoCatalogo} onChange={(e) => setPrecoCatalogo(e.target.value)} placeholder="Opcional" />
                <span className="text-xs text-muted-foreground">Preço no catálogo</span>
              </div>
              <div>
                <Input type="number" step="0.01" min="0" value={precoVendaSugerido} onChange={(e) => setPrecoVendaSugerido(e.target.value)} placeholder="Opcional" />
                <span className="text-xs text-muted-foreground">Venda sugerida</span>
              </div>
            </div>

            <Label>Quantidade mínima por comprador (opcional)</Label>
            <Input
              type="number"
              min="1"
              value={minimoUnidadesPadrao}
              onChange={(e) => setMinimoUnidadesPadrao(e.target.value)}
              placeholder="Padrão: 1"
            />
            <span className="text-xs text-muted-foreground mt-[-8px]">
              O comprador será obrigado a pedir pelo menos essa quantidade.
            </span>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isEstoqueProprio}
                  onChange={(e) => {
                    setIsEstoqueProprio(e.target.checked);
                    if (e.target.checked) setFornecedorId("");
                  }}
                  className="rounded border-input text-primary focus:ring-primary"
                />
                📦 Este produto é do meu Estoque Próprio
              </label>
            </div>

            {!isEstoqueProprio && (
              <>
                <Label>Fornecedor (uso interno, opcional)</Label>
                <Select value={fornecedorId} onValueChange={(v) => setFornecedorId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Nenhum">
                      {() => fornecedores.find((f) => f.id === fornecedorId)?.nome ?? "Nenhum"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {fornecedores.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            <Label>Peso e dimensões (pra calcular frete real)</Label>
            <div className="grid grid-cols-4 gap-2">
              <Input type="number" step="0.01" min="0" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} placeholder="Kg" />
              <Input type="number" min="1" value={comprimentoCm} onChange={(e) => setComprimentoCm(e.target.value)} placeholder="Compr. cm" />
              <Input type="number" min="1" value={larguraCm} onChange={(e) => setLarguraCm(e.target.value)} placeholder="Larg. cm" />
              <Input type="number" min="1" value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)} placeholder="Alt. cm" />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
              <input
                id="coresVariadasEdit"
                type="checkbox"
                checked={coresVariadas}
                onChange={(e) => setCoresVariadas(e.target.checked)}
                className="size-4 rounded"
              />
              <div>
                <label htmlFor="coresVariadasEdit" className="text-sm font-medium text-orange-800 cursor-pointer">
                  Cores sortidas (grade variada)
                </label>
                <p className="text-[11px] text-orange-600">
                  Cliente escolhe só tamanho + quantidade — cores vêm misturadas
                </p>
              </div>
            </div>

            <CoresAtacadoEditor produtoId={produto.id} />

            <Button type="submit" disabled={loading || !nome || !categoria || !custoUnitario || !unidadesPorCaixa}>
              {loading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
