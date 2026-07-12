"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/format";

type Variacao = { id: string; tipo: "COR" | "TAMANHO" | "VOLTAGEM"; nome: string; imagemUrl: string | null };
type Produto = {
  id: string;
  nome: string;
  codigo?: string | null;
  custoUnitario: number;
  unidadesPorCaixa: number;
  imagemUrl?: string | null;
  reservaLojaPadrao?: number | null;
  minimoUnidadesPadrao?: number | null;
  coresVariadas?: boolean;
  cores?: Variacao[];
};

export function CriarRodadaAtacadoDialog({
  produtos,
  taxaServicoPadrao = 10,
  produtoFixo,
  trigger,
}: {
  produtos: Produto[];
  taxaServicoPadrao?: number;
  // Quando aberto a partir do card de um produto específico — pula a escolha
  // do produto e já trava nele.
  produtoFixo?: Produto;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [produtoAtacadoId, setProdutoAtacadoId] = useState(produtoFixo?.id ?? "");
  const [metaUnidades, setMetaUnidades] = useState("10");
  const [taxaServicoPercentual, setTaxaServicoPercentual] = useState(String(taxaServicoPadrao));
  const [minimoUnidadesPorReserva, setMinimoUnidadesPorReserva] = useState("1");
  const [unidadesReservadasLoja, setUnidadesReservadasLoja] = useState("0");
  const [variacaoId, setVariacaoId] = useState("");
  const [loopAtivo, setLoopAtivo] = useState(false);
  const [loopIntervaloMinutos, setLoopIntervaloMinutos] = useState(1440);

  const lista = produtoFixo ? [produtoFixo, ...produtos.filter((p) => p.id !== produtoFixo.id)] : produtos;
  const produto = lista.find((p) => p.id === produtoAtacadoId);

  // Ao escolher o produto, pré-preenche a meta da caixa e a reserva da loja com o padrão dele
  // (continua editável). Roda só quando troca de produto.
  useEffect(() => {
    if (produto) {
      setMetaUnidades(String(produto.unidadesPorCaixa));
      setUnidadesReservadasLoja(String(produto.reservaLojaPadrao ?? 0));
      setMinimoUnidadesPorReserva(String(produto.minimoUnidadesPadrao ?? 1));
    }
    setVariacaoId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoAtacadoId]);
  const custoUnitario = produto?.custoUnitario ?? 0;
  const metaTotal = Number(metaUnidades) || 0;
  const reservadasLoja = Number(unidadesReservadasLoja) || 0;
  const metaColetivo = metaTotal - reservadasLoja;
  // Mesma diluição do servidor: custo efetivo = custo × total / coletivo.
  const custoEfetivo =
    reservadasLoja > 0 && metaColetivo > 0 ? (custoUnitario * metaTotal) / metaColetivo : custoUnitario;
  const precoFinalUnitario =
    custoUnitario > 0 ? custoEfetivo * (1 + Number(taxaServicoPercentual || 0) / 100) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/atacado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtoAtacadoId,
          metaUnidades: Number(metaUnidades),
          taxaServicoPercentual: Number(taxaServicoPercentual),
          minimoUnidadesPorReserva: Number(minimoUnidadesPorReserva),
          unidadesReservadasLoja: Number(unidadesReservadasLoja) || 0,
          variacaoId: variacaoId || undefined,
          loopAtivo,
          loopIntervaloMinutos,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao criar rodada");
        return;
      }
      toast.success("Rodada criada");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)}>{trigger}</span>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Nova rodada
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova rodada de compra coletiva</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Label>Produto</Label>
          {produtoFixo ? (
            <div className="flex items-center gap-2 rounded-lg border border-border p-2">
              <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                {produtoFixo.imagemUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={produtoFixo.imagemUrl} alt={produtoFixo.nome} className="size-full object-cover" />
                ) : null}
              </div>
              <span className="text-sm font-medium text-foreground">{produtoFixo.nome}</span>
            </div>
          ) : (
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger 
                className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between")}
              >
                  {produto ? (
                    <div className="flex items-center gap-2 truncate">
                      <div className="size-5 shrink-0 overflow-hidden rounded bg-muted">
                        {produto.imagemUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={produto.imagemUrl} alt={produto.nome} className="size-full object-cover" />
                        ) : null}
                      </div>
                      <span className="truncate">{produto.nome} ({produto.unidadesPorCaixa}un/caixa)</span>
                    </div>
                  ) : (
                    "Selecione um produto..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Pesquisar produto ou código..." />
                  <CommandList>
                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                    <CommandGroup>
                      {produtos.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.nome + " " + (p.codigo || "")}
                          onSelect={() => {
                            setProdutoAtacadoId(p.id);
                            setOpenCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              produtoAtacadoId === p.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="size-6 shrink-0 overflow-hidden rounded bg-muted">
                              {p.imagemUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.imagemUrl} alt={p.nome} className="size-full object-cover" />
                              ) : null}
                            </div>
                            <span className="truncate">{p.nome}</span>
                            <span className="text-muted-foreground text-xs shrink-0 whitespace-nowrap">({p.unidadesPorCaixa}un)</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {produto && produto.cores && produto.cores.length > 0 ? (
            produto.coresVariadas || produto.cores.some((v) => v.tipo === "TAMANHO") ? (
              // Produto de roupas: cliente escolhe o mix de tamanhos no checkout
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                <span className="font-semibold">Produto com tamanhos variáveis</span>
                <p className="mt-0.5 text-xs text-orange-700">
                  O cliente escolhe a quantidade de cada tamanho direto no checkout — sem necessidade de abrir uma caixa por tamanho.
                  {produto.coresVariadas ? " Cores vêm sortidas." : ""}
                </p>
              </div>
            ) : (
              <>
                <Label>Variação desta caixa (obrigatório)</Label>
                <select
                  value={variacaoId}
                  onChange={(e) => setVariacaoId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Selecione...</option>
                  {produto.cores.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.tipo === "COR" ? "Cor" : v.tipo === "TAMANHO" ? "Tamanho" : "Voltagem"}: {v.nome}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">
                  Caixa fechada de UMA variação só. Pra abrir outra cor/tamanho, crie outra rodada.
                </span>
              </>
            )
          ) : null}

          <Label>Meta de unidades (total da caixa)</Label>
          <Input type="number" min="1" value={metaUnidades} onChange={(e) => setMetaUnidades(e.target.value)} required />

          <Label>Unidades reservadas pra minha loja (opcional)</Label>
          <Input
            type="number"
            min="0"
            value={unidadesReservadasLoja}
            onChange={(e) => setUnidadesReservadasLoja(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">
            Quantas unidades dessa caixa você quer pra sua loja. O custo delas é diluído no preço das
            unidades do coletivo — suas unidades saem &quot;de graça&quot; e o coletivo precisa comprar{" "}
            {metaColetivo > 0 ? metaColetivo : 0}un pra fechar a caixa.
          </span>

          <Label>Mínimo de unidades por reserva</Label>
          <Input
            type="number"
            min="1"
            value={minimoUnidadesPorReserva}
            onChange={(e) => setMinimoUnidadesPorReserva(e.target.value)}
            required
          />
          <span className="text-xs text-muted-foreground">
            Configure por caixa — caixas pequenas (ex: 10un no total) costumam precisar de mínimo
            menor. Sem máximo: alguém pode reservar o restante todo, se quiser.
          </span>

          <Label>Taxa de serviço (%)</Label>
          <Input
            type="number"
            min="0"
            max="100"
            value={taxaServicoPercentual}
            onChange={(e) => setTaxaServicoPercentual(e.target.value)}
            required
          />

          {produto ? (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex justify-between"><span>Custo (atacado)</span><span>{formatBRL(custoUnitario)}</span></div>
              {reservadasLoja > 0 && metaColetivo > 0 ? (
                <>
                  <div className="flex justify-between"><span>Suas unidades (grátis)</span><span>{reservadasLoja}un</span></div>
                  <div className="flex justify-between"><span>Coletivo compra</span><span>{metaColetivo}un</span></div>
                  <div className="flex justify-between text-xs text-muted-foreground"><span>Custo diluído/un</span><span>{formatBRL(custoEfetivo)}</span></div>
                </>
              ) : null}
              <div className="flex justify-between font-bold"><span>Preço final ao comprador</span><span>{formatBRL(precoFinalUnitario)}</span></div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 rounded-lg border border-border p-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="loopAtivo" 
                checked={loopAtivo} 
                onChange={(e) => setLoopAtivo(e.target.checked)}
                className="size-4"
              />
              <Label htmlFor="loopAtivo" className="cursor-pointer">Ativar repostagem automática (Loop)</Label>
            </div>
            
            {loopAtivo && (
              <div className="pl-6 flex flex-col gap-1">
                <Label>Intervalo de Repostagem</Label>
                <select
                  value={loopIntervaloMinutos}
                  onChange={(e) => setLoopIntervaloMinutos(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm mt-1"
                >
                  <optgroup label="Minutos">
                    <option value="5">5 minutos (teste)</option>
                    <option value="10">10 minutos (teste)</option>
                    <option value="15">15 minutos (teste)</option>
                    <option value="30">30 minutos</option>
                  </optgroup>
                  <optgroup label="Horas">
                    <option value="60">1 hora</option>
                    <option value="120">2 horas</option>
                    <option value="240">4 horas</option>
                    <option value="360">6 horas</option>
                    <option value="720">12 horas</option>
                    <option value="1440">1 dia (24h)</option>
                  </optgroup>
                  <optgroup label="Dias">
                    <option value="2880">2 dias</option>
                    <option value="4320">3 dias</option>
                    <option value="10080">7 dias</option>
                  </optgroup>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  A caixa será reenviada ao grupo automaticamente no intervalo selecionado até ser fechada.
                </p>
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading || !produtoAtacadoId}>
            {loading ? "Criando..." : "Criar rodada"}
          </Button>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
