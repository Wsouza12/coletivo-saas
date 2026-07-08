"use client";

import { useState } from "react";
import Image from "next/image";
import { Boxes, Info, MessageCircle, ExternalLink, ShieldCheck, Handshake, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatBRL, mascararCep } from "@/lib/format";

type OpcaoFrete = { id: string; nome: string; descricao: string; preco: number; prazoDias: number; recomendado: boolean };

export type ProdutoAtacadoVitrine = {
  id: string;
  codigo: string | null;
  nome: string;
  categoria: string;
  descricao: string;
  imagemUrl: string | null;
  voltagem: string | null;
  codigoAnatel: string | null;
  unidadesPorCaixa: number;
  preco: number | null;
  // Link de convite do grupo de WhatsApp da categoria (pode não existir ainda).
  linkConvite: string | null;
  // Prova social: link da página "mais vendidos" do ML + posição no ranking.
  linkReferencia: string | null;
  posicaoMaisVendido: number | null;
  // Variações disponíveis (cor com foto / tamanho / voltagem). A vitrine é
  // só pra olhar — escolha real da variação da caixa acontece na rodada.
  cores: { id: string; tipo: "COR" | "TAMANHO" | "VOLTAGEM"; nome: string; imagemUrl: string | null }[];
};

// Abre o link do ML numa janela popup separada (não aba) — o ML bloqueia iframe/
// modal, mas janela separada é página real e funciona, mantendo o catálogo atrás.
// Largura precisa ser grande (~1100px) pra o ML renderizar no layout desktop e
// dar pra ver os produtos; numa janela estreita ele fica apertado/ilegível.
function abrirReferencia(url: string) {
  const largura = Math.min(1100, Math.round(window.screen.availWidth * 0.9));
  const altura = Math.min(850, Math.round(window.screen.availHeight * 0.9));
  const left = Math.max(0, Math.round((window.screen.availWidth - largura) / 2));
  const top = Math.max(0, Math.round((window.screen.availHeight - altura) / 2));
  // popup=yes força a janela minimalista (sem abas/barra de favoritos/botões) em
  // vez de uma aba/janela cheia. A barra de endereço NÃO pode ser ocultada — o
  // navegador sempre mostra a URL em popups (segurança/anti-phishing).
  window.open(
    url,
    "ml-mais-vendidos",
    `popup=yes,width=${largura},height=${altura},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=no,status=no`
  );
}

export function ProdutoAtacadoVitrineCard({ produto }: { produto: ProdutoAtacadoVitrine }) {
  const [detalhes, setDetalhes] = useState(false);
  // Foto exibida pode ser trocada ao clicar numa cor (volta pra principal se nada selecionado).
  const [fotoAtiva, setFotoAtiva] = useState<string | null>(null);
  const imagemExibida = fotoAtiva ?? produto.imagemUrl;

  const [cepFrete, setCepFrete] = useState("");
  const [quantidadeFrete, setQuantidadeFrete] = useState("1");
  const [calculandoFrete, setCalculandoFrete] = useState(false);
  const [opcoesFrete, setOpcoesFrete] = useState<OpcaoFrete[] | null>(null);

  async function calcularFrete() {
    const limpo = cepFrete.replace(/\D/g, "");
    if (limpo.length !== 8) {
      toast.error("Digite um CEP válido");
      return;
    }
    const quantidade = Number(quantidadeFrete) || 1;
    setCalculandoFrete(true);
    setOpcoesFrete(null);
    try {
      const res = await fetch("/api/atacado/frete-produto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produtoAtacadoId: produto.id, cep: limpo, quantidade }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao calcular frete pra esse CEP");
        return;
      }
      // Retirada é grátis e não faz sentido aqui (produto ainda nem tem caixa aberta) — mostra só transportadora.
      setOpcoesFrete(json.data.opcoes.filter((o: OpcaoFrete) => o.preco > 0));
    } finally {
      setCalculandoFrete(false);
    }
  }

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:shadow-md">
        <div className="relative aspect-square bg-muted">
          {imagemExibida ? (
            <Image
              src={imagemExibida}
              alt={produto.nome}
              fill
              className="object-contain transition group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Boxes className="size-10" />
            </div>
          )}
          <span className="absolute top-2 left-2 rounded-full bg-background/90 px-2.5 py-0.5 text-xs font-medium text-foreground shadow-sm">
            {produto.categoria}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="flex flex-col">
            <p className="line-clamp-2 text-sm font-medium text-foreground">{produto.nome}</p>
            {produto.codigo ? (
              <span className="mt-1 w-fit rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-bold text-primary">
                Cód: {produto.codigo}
              </span>
            ) : null}
          </div>

          {produto.cores.filter((c) => c.tipo === "COR").length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {produto.cores
                .filter((c) => c.tipo === "COR")
                .slice(0, 5)
                .map((cor) => {
                  const ativa = (fotoAtiva ?? produto.imagemUrl) === cor.imagemUrl && cor.imagemUrl !== null;
                  return (
                    <button
                      key={cor.id}
                      type="button"
                      onClick={() => setFotoAtiva(cor.imagemUrl)}
                      title={cor.nome}
                      className={`size-5 overflow-hidden rounded-full border bg-muted transition ${
                        ativa ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground"
                      }`}
                    >
                      {cor.imagemUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cor.imagemUrl} alt={cor.nome} className="size-full object-cover" />
                      ) : null}
                    </button>
                  );
                })}
            </div>
          ) : null}

          {/* Tamanhos e voltagens como pílulas (sem foto) */}
          {produto.cores.filter((c) => c.tipo !== "COR").length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              {produto.cores
                .filter((c) => c.tipo !== "COR")
                .slice(0, 4)
                .map((v) => (
                  <span
                    key={v.id}
                    className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                  >
                    {v.nome}
                  </span>
                ))}
            </div>
          ) : null}

          {produto.codigoAnatel ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                <ShieldCheck className="size-3" />
                Anatel
              </span>
            </div>
          ) : null}

          <div className="mt-auto flex flex-col gap-1 border-t border-border pt-2">
            {produto.preco !== null ? (
              <span className="text-base font-extrabold text-primary">{formatBRL(produto.preco)}</span>
            ) : (
              <span className="text-xs text-muted-foreground">Preço sob consulta</span>
            )}
            <span className="text-xs text-muted-foreground">{produto.unidadesPorCaixa} un/caixa</span>
          </div>

          {produto.linkReferencia && produto.posicaoMaisVendido ? (
            <button
              type="button"
              onClick={() => abrirReferencia(produto.linkReferencia!)}
              title="Ver no ranking de mais vendidos do Mercado Livre"
              className="group/ml flex w-full min-w-0 items-center gap-1.5 rounded-md bg-[#FFE600] px-2 py-1.5 text-left shadow-sm transition hover:brightness-95"
            >
              <Handshake className="size-4 shrink-0 text-[#2D3277]" />
              <span className="shrink-0 rounded bg-[#FF5A1F] px-1.5 py-0.5 text-[9px] font-extrabold uppercase leading-none text-white">
                Mais vendido
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#2D3277]">
                {produto.posicaoMaisVendido}º em {produto.categoria}
              </span>
              <ExternalLink className="size-3 shrink-0 text-[#2D3277] transition group-hover/ml:translate-x-0.5" />
            </button>
          ) : null}

          <div className="mt-1 flex flex-col gap-1.5">
            <Button type="button" size="sm" className="w-full" onClick={() => {
              if (produto.codigo) {
                // Copia o código pra área de transferência pra facilitar o envio na comunidade
                navigator.clipboard.writeText(produto.codigo).catch(() => {});
                
                // Redireciona pro link da comunidade do WhatsApp
                const wppUrl = `https://chat.whatsapp.com/BaOrOZa2Doq8hsOS1lMTlP`;
                window.open(wppUrl, "_blank");
              }
            }}>
              <MessageCircle className="size-3.5" />
              Quero! (Pedir no WhatsApp)
            </Button>
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setDetalhes(true)}>
              <Info className="size-3.5" />
              Detalhes
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={detalhes} onOpenChange={setDetalhes}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md sm:max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>{produto.nome}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="relative aspect-square w-full rounded-lg bg-muted">
              {imagemExibida ? (
                <Image src={imagemExibida} alt={produto.nome} fill className="object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Boxes className="size-12" />
                </div>
              )}
            </div>

            {produto.cores.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-lg bg-muted p-2.5">
                <span className="text-xs font-medium text-foreground">Variações disponíveis:</span>
                {(["COR", "TAMANHO", "VOLTAGEM"] as const).map((tipo) => {
                  const itens = produto.cores.filter((c) => c.tipo === tipo);
                  if (itens.length === 0) return null;
                  const rotulo = tipo === "COR" ? "Cores" : tipo === "TAMANHO" ? "Tamanhos" : "Voltagens";
                  return (
                    <div key={tipo} className="flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {rotulo}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {itens.map((v) => {
                          const ativa =
                            tipo === "COR" &&
                            (fotoAtiva ?? produto.imagemUrl) === v.imagemUrl &&
                            v.imagemUrl !== null;
                          return tipo === "COR" ? (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setFotoAtiva(v.imagemUrl)}
                              className={`flex items-center gap-1.5 rounded-full border bg-background px-1.5 py-0.5 text-xs transition ${
                                ativa ? "border-primary ring-1 ring-primary" : "border-border hover:border-foreground"
                              }`}
                              title={`Ver foto da cor ${v.nome}`}
                            >
                              {v.imagemUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={v.imagemUrl} alt={v.nome} className="size-5 rounded-full object-cover" />
                              ) : (
                                <span className="size-5 rounded-full bg-muted" />
                              )}
                              <span className="font-medium text-foreground">{v.nome}</span>
                            </button>
                          ) : (
                            <span
                              key={v.id}
                              className="rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground"
                            >
                              {v.nome}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-1.5">
              {produto.codigoAnatel ? (
                <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                  <ShieldCheck className="size-3.5" />
                  Homologado Anatel
                </span>
              ) : null}
              {produto.voltagem ? (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                  {produto.voltagem}
                </span>
              ) : null}
            </div>

            {produto.descricao ? (
              <p className="text-sm text-muted-foreground">{produto.descricao}</p>
            ) : null}

            <div className="flex flex-col gap-1 rounded-lg bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categoria</span>
                <span className="font-medium text-foreground">{produto.categoria}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unidades por caixa</span>
                <span className="font-medium text-foreground">{produto.unidadesPorCaixa}</span>
              </div>
              {produto.preco !== null ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Preço</span>
                  <span className="font-bold text-primary">{formatBRL(produto.preco)}</span>
                </div>
              ) : null}
              {produto.codigoAnatel ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Código Anatel</span>
                  <span className="font-medium text-foreground">{produto.codigoAnatel}</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Truck className="size-4" />
                Calcular frete
              </span>
              <div className="flex gap-2">
                <Input
                  value={cepFrete}
                  onChange={(e) => setCepFrete(mascararCep(e.target.value))}
                  placeholder="Seu CEP"
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="1"
                  value={quantidadeFrete}
                  onChange={(e) => setQuantidadeFrete(e.target.value)}
                  placeholder="Qtd."
                  className="w-20"
                  title="Quantidade de unidades"
                />
                <Button type="button" size="sm" disabled={calculandoFrete} onClick={calcularFrete}>
                  {calculandoFrete ? "Calculando..." : "Calcular"}
                </Button>
              </div>
              {opcoesFrete ? (
                opcoesFrete.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma opção de frete encontrada pra esse CEP.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      Frete pra {quantidadeFrete || 1} unidade(s):
                    </span>
                    {opcoesFrete.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5 text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{o.nome}</span>
                          <span className="text-muted-foreground">{o.descricao} — até {o.prazoDias} dia(s)</span>
                        </div>
                        <span className="font-bold text-foreground">{formatBRL(o.preco)}</span>
                      </div>
                    ))}
                  </div>
                )
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              {produto.linkConvite ? (
                <a href={produto.linkConvite} target="_blank" rel="noopener noreferrer" className="w-full">
                  <Button type="button" className="w-full">
                    <MessageCircle className="size-4" />
                    Entrar no grupo
                  </Button>
                </a>
              ) : (
                <Button type="button" className="w-full" disabled>
                  <MessageCircle className="size-4" />
                  Grupo em breve
                </Button>
              )}
              {produto.linkReferencia ? (
                <button
                  type="button"
                  onClick={() => abrirReferencia(produto.linkReferencia!)}
                  title="Ver no ranking de mais vendidos do Mercado Livre"
                  className="group/ml flex w-full items-center gap-2 rounded-lg bg-[#FFE600] px-3 py-2 text-left shadow transition hover:brightness-95"
                >
                  <Handshake className="size-5 shrink-0 text-[#2D3277]" />
                  <span className="rounded bg-[#FF5A1F] px-2 py-0.5 text-[11px] font-extrabold uppercase leading-none text-white">
                    Mais vendido
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#2D3277]">
                    {produto.posicaoMaisVendido
                      ? `${produto.posicaoMaisVendido}º em ${produto.categoria}`
                      : "no Mercado Livre"}
                  </span>
                  <ExternalLink className="size-3.5 shrink-0 text-[#2D3277] transition group-hover/ml:translate-x-0.5" />
                </button>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
