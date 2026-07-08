"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, MousePointerClick, ShoppingCart, CheckCircle2, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Linha = { origem: string; rotulo: string; cliques: number; reservas: number; pagas: number };
type Caixa = { slug: string | null; nome: string };
type Origem = { grupoNome: string; codigo: string };
type Dados = { linhas: Linha[]; caixas: Caixa[]; origens: Origem[] };

export function OrigensPanel() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [caixaSlug, setCaixaSlug] = useState("");
  const [origemCod, setOrigemCod] = useState("");
  const [origemCom, setOrigemCom] = useState("");

  useEffect(() => {
    fetch("/api/admin/atacado/origens").then((r) => r.json()).then((j) => setDados(j.data)).catch(() => toast.error("Erro ao carregar"));
  }, []);

  const app = typeof window !== "undefined" ? window.location.origin : "";
  const linkGerado = caixaSlug && origemCod ? `${app}/r/${caixaSlug}?o=${encodeURIComponent(origemCod)}` : "";
  const linkComunidade = origemCom ? `${app}/r/comunidade?o=${encodeURIComponent(origemCom)}` : "";

  async function copiar(txt: string) {
    try { await navigator.clipboard.writeText(txt); toast.success("Link copiado"); }
    catch { toast.error("Não consegui copiar"); }
  }

  if (!dados) return <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>;

  return (
    <div className="flex flex-col gap-6">
      {/* Gerador de link da COMUNIDADE por origem (o principal — tudo leva pra comunidade) */}
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5"><Link2 className="size-4 text-primary" /> Link da COMUNIDADE por origem</h2>
        <p className="text-xs text-muted-foreground">Link fixo que leva direto pro convite do grupo da comunidade no WhatsApp. Use nas redes sociais — mede de qual canal cada pessoa entrou.</p>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={origemCom} onChange={(e) => setOrigemCom(e.target.value)} className="h-9 rounded-md border border-border bg-card text-sm px-2 flex-1 min-w-[200px]">
            <option value="">Escolha a rede/origem…</option>
            {dados.origens.map((o) => <option key={o.codigo} value={o.codigo}>{o.grupoNome}</option>)}
          </select>
        </div>
        {linkComunidade && (
          <div className="flex items-center gap-2 rounded-md border bg-card p-2">
            <code className="text-xs flex-1 break-all">{linkComunidade}</code>
            <Button size="sm" onClick={() => copiar(linkComunidade)}><Copy className="size-3.5 mr-1" /> Copiar</Button>
          </div>
        )}
      </div>

      {/* Gerador de link por CAIXA + origem */}
      <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5"><Link2 className="size-4" /> Link de uma caixa por origem</h2>
        <p className="text-xs text-muted-foreground">Escolha a caixa e a origem — copie o link e cole onde quiser. Toda venda por esse link é atribuída à origem.</p>
        <div className="flex flex-wrap gap-2">
          <select value={caixaSlug} onChange={(e) => setCaixaSlug(e.target.value)} className="h-9 rounded-md border border-border bg-card text-sm px-2 flex-1 min-w-[200px]">
            <option value="">Caixa aberta…</option>
            {dados.caixas.map((c) => c.slug && <option key={c.slug} value={c.slug}>{c.nome}</option>)}
          </select>
          <select value={origemCod} onChange={(e) => setOrigemCod(e.target.value)} className="h-9 rounded-md border border-border bg-card text-sm px-2 flex-1 min-w-[160px]">
            <option value="">Origem…</option>
            {dados.origens.map((o) => <option key={o.codigo} value={o.codigo}>{o.grupoNome}</option>)}
          </select>
        </div>
        {linkGerado && (
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
            <code className="text-xs flex-1 break-all">{linkGerado}</code>
            <Button size="sm" variant="outline" onClick={() => copiar(linkGerado)}><Copy className="size-3.5 mr-1" /> Copiar</Button>
          </div>
        )}
      </div>

      {/* Tabela de desempenho por origem */}
      <div className="rounded-xl border bg-card p-4 flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Desempenho por origem</h2>
        {dados.linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Ainda sem dados. Compartilhe links marcados pra começar a medir.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left font-medium py-2">Origem</th>
                  <th className="text-right font-medium py-2"><MousePointerClick className="size-3.5 inline" /> Cliques</th>
                  <th className="text-right font-medium py-2"><ShoppingCart className="size-3.5 inline" /> Reservas</th>
                  <th className="text-right font-medium py-2"><CheckCircle2 className="size-3.5 inline" /> Pagas</th>
                  <th className="text-right font-medium py-2">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {dados.linhas.map((l) => {
                  const conv = l.cliques > 0 ? Math.round((l.pagas / l.cliques) * 100) : null;
                  return (
                    <tr key={l.origem} className="border-b last:border-0">
                      <td className="py-2">{l.rotulo}</td>
                      <td className="text-right py-2">{l.cliques}</td>
                      <td className="text-right py-2">{l.reservas}</td>
                      <td className="text-right py-2 font-semibold text-emerald-600">{l.pagas}</td>
                      <td className="text-right py-2 text-muted-foreground">{conv != null ? `${conv}%` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
