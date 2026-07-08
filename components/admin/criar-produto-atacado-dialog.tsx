"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Sparkles } from "lucide-react";
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
import { formatBRL } from "@/lib/format";

type Fornecedor = { id: string; nome: string };

export function CriarProdutoAtacadoDialog({ fornecedores = [] }: { fornecedores?: Fornecedor[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gerandoDescricao, setGerandoDescricao] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [marca, setMarca] = useState("");
  const [voltagem, setVoltagem] = useState("");
  const [codigoAnatel, setCodigoAnatel] = useState("");
  const [custoUnitario, setCustoUnitario] = useState("");
  const [precoCatalogo, setPrecoCatalogo] = useState("");
  const [precoVendaSugerido, setPrecoVendaSugerido] = useState("");
  const [linkReferencia, setLinkReferencia] = useState("");
  const [posicaoMaisVendido, setPosicaoMaisVendido] = useState("");
  const [unidadesPorCaixa, setUnidadesPorCaixa] = useState("");
  const [reservaLojaPadrao, setReservaLojaPadrao] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [comprimentoCm, setComprimentoCm] = useState("");
  const [larguraCm, setLarguraCm] = useState("");
  const [alturaCm, setAlturaCm] = useState("");
  const [fornecedorId, setFornecedorId] = useState("");
  const [sugerindoMedidas, setSugerindoMedidas] = useState(false);

  async function sugerirMedidas() {
    if (!nome.trim()) {
      toast.error("Preencha o nome antes de pedir a sugestão");
      return;
    }
    setSugerindoMedidas(true);
    try {
      const res = await fetch("/api/admin/atacado/produtos/sugerir-peso-dimensoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, categoria: categoria || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao sugerir medidas");
        return;
      }
      setPesoKg(String(json.data.pesoKg));
      setComprimentoCm(String(json.data.comprimentoCm));
      setLarguraCm(String(json.data.larguraCm));
      setAlturaCm(String(json.data.alturaCm));
      toast.success("Sugestão da IA — confira antes de salvar, é uma estimativa");
    } finally {
      setSugerindoMedidas(false);
    }
  }

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
      const res = await fetch("/api/admin/atacado/produtos", {
        method: "POST",
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
          linkReferencia: linkReferencia || undefined,
          posicaoMaisVendido: posicaoMaisVendido ? Number(posicaoMaisVendido) : undefined,
          unidadesPorCaixa: Number(unidadesPorCaixa),
          reservaLojaPadrao: reservaLojaPadrao ? Number(reservaLojaPadrao) : undefined,
          pesoKg: Number(pesoKg),
          comprimentoCm: Number(comprimentoCm),
          larguraCm: Number(larguraCm),
          alturaCm: Number(alturaCm),
          fornecedorId: fornecedorId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao criar produto");
        return;
      }
      toast.success("Produto criado — agora envie uma foto na lista");
      setOpen(false);
      setCodigo("");
      setNome("");
      setDescricao("");
      setCategoria("");
      setMarca("");
      setVoltagem("");
      setCodigoAnatel("");
      setCustoUnitario("");
      setPrecoCatalogo("");
      setPrecoVendaSugerido("");
      setLinkReferencia("");
      setPosicaoMaisVendido("");
      setUnidadesPorCaixa("");
      setReservaLojaPadrao("");
      setFornecedorId("");
      setPesoKg("");
      setComprimentoCm("");
      setLarguraCm("");
      setAlturaCm("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Novo produto
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg sm:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Novo produto do atacado</DialogTitle>
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
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              Vai ser usada pra vincular o grupo de WhatsApp certo quando essa integração entrar.
            </span>

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
            <Input
              value={codigoAnatel}
              onChange={(e) => setCodigoAnatel(e.target.value)}
              placeholder="Ex: 00279-20-15621"
            />

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

            <Label>Prova social — Mais vendidos no ML (opcional)</Label>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                type="url"
                value={linkReferencia}
                onChange={(e) => setLinkReferencia(e.target.value)}
                placeholder="https://www.mercadolivre.com.br/mais-vendidos/..."
              />
              <Input
                type="number"
                min="1"
                value={posicaoMaisVendido}
                onChange={(e) => setPosicaoMaisVendido(e.target.value)}
                placeholder="Posição"
                className="w-24"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Link da página de mais vendidos do ML + a posição do produto (ex: 19). Vira o selo
              &quot;Nº mais vendido&quot; na vitrine.
            </span>

            <Label>Fornecedor (uso interno, opcional)</Label>
            <Select value={fornecedorId} onValueChange={(v) => setFornecedorId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                {fornecedores.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <Label>Peso e dimensões da embalagem individual (obrigatório — pra calcular frete real)</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 shrink-0"
                disabled={sugerindoMedidas || !nome.trim()}
                onClick={sugerirMedidas}
              >
                <Sparkles className={`size-3.5 ${sugerindoMedidas ? "animate-pulse" : ""}`} />
                {sugerindoMedidas ? "Sugerindo..." : "Sugerir com IA"}
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <Input type="number" step="0.01" min="0.01" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} placeholder="Kg" required />
              <Input type="number" min="1" value={comprimentoCm} onChange={(e) => setComprimentoCm(e.target.value)} placeholder="Compr. cm" required />
              <Input type="number" min="1" value={larguraCm} onChange={(e) => setLarguraCm(e.target.value)} placeholder="Larg. cm" required />
              <Input type="number" min="1" value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)} placeholder="Alt. cm" required />
            </div>
            <span className="text-xs text-muted-foreground">
              A IA só sugere uma estimativa pelo nome do produto — confira e ajuste pro valor real sempre que souber.
            </span>

            <Button
              type="submit"
              disabled={
                loading ||
                !nome ||
                !categoria ||
                !custoUnitario ||
                !unidadesPorCaixa ||
                !pesoKg ||
                !comprimentoCm ||
                !larguraCm ||
                !alturaCm
              }
            >
              {loading ? "Criando..." : "Criar produto"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Prévia do efeito da reserva pra loja no custo por unidade do coletivo.
// O preço final ao comprador (com taxa) sai depois, ao criar a rodada.
export function ReservaPreview({ custo, meta, reserva }: { custo: number; meta: number; reserva: number }) {
  if (!reserva || reserva <= 0 || !meta || meta <= 0 || !custo || custo <= 0) return null;
  const coletivo = meta - reserva;
  if (coletivo <= 0) {
    return (
      <p className="text-xs text-destructive">
        Reserva ({reserva}un) precisa ser menor que o total da caixa ({meta}un).
      </p>
    );
  }
  const custoDiluido = (custo * meta) / coletivo;
  return (
    <div className="rounded-lg bg-muted p-2.5 text-xs">
      <div className="flex justify-between"><span>Suas unidades (grátis)</span><span>{reserva}un</span></div>
      <div className="flex justify-between"><span>Coletivo compra</span><span>{coletivo}un</span></div>
      <div className="flex justify-between font-medium"><span>Custo diluído/un</span><span>{formatBRL(custoDiluido)}</span></div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Preço final ao comprador (com taxa) é calculado na rodada.
      </p>
    </div>
  );
}
