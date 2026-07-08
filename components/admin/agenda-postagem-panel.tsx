"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CalendarClock, Send, Trash2, Image as ImageIcon, Video, Type, BookOpen,
  Loader2, X, Package, TrendingUp, MessageSquare, CheckCircle2, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PdfPageViewer } from "@/components/admin/pdf-page-viewer";

// ─── tipos ────────────────────────────────────────────────────────────────────
type Vinculo = { categoria: string; grupoId: string; grupoNome: string };
type Catalogo = { id: string; nome: string; fornecedor?: { nome: string } | null };
type Bloco = { tipo: "TEXTO" | "IMAGEM" | "VIDEO"; url?: string; legenda?: string };
type Postagem = {
  id: string; tipo: string; status: string; titulo?: string | null;
  agendadoPara: string; gruposJids: string[]; blocos: Bloco[]; erro?: string | null; enviadoEm?: string | null;
};

// ─── helpers ──────────────────────────────────────────────────────────────────
async function uploadArquivo(arquivo: File | Blob, nome = "print.jpg"): Promise<string> {
  const file = arquivo instanceof File ? arquivo : new File([arquivo], nome, { type: (arquivo as Blob).type || "image/jpeg" });
  const fd = new FormData();
  fd.append("arquivo", file);
  const r = await fetch("/api/admin/atacado/agenda/upload", { method: "POST", body: fd }).then((x) => x.json());
  if (!r.data?.url) throw new Error(r.error?.message ?? "Falha no upload");
  return r.data.url;
}

// ─── seletor de grupos (máx 2) ─────────────────────────────────────────────────
function SeletorGrupos({ vinculos, selecionados, onChange, max = 2 }: {
  vinculos: Vinculo[]; selecionados: string[]; onChange: (jids: string[]) => void; max?: number;
}) {
  // Deduplica por grupoId (a mesma categoria pode repetir grupo)
  const grupos = Array.from(new Map(vinculos.map((v) => [v.grupoId, v])).values());
  function toggle(jid: string) {
    if (selecionados.includes(jid)) onChange(selecionados.filter((j) => j !== jid));
    else if (selecionados.length < max) onChange([...selecionados, jid]);
    else toast.info(`Máximo ${max} grupos`);
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">Enviar para (máx {max} grupos)</label>
      <div className="flex flex-wrap gap-2">
        {grupos.map((g) => {
          const on = selecionados.includes(g.grupoId);
          return (
            <button key={g.grupoId} type="button" onClick={() => toggle(g.grupoId)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${on ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-border"}`}>
              {g.grupoNome || g.categoria}
            </button>
          );
        })}
        {grupos.length === 0 && <span className="text-xs text-muted-foreground">Nenhum grupo vinculado — vincule no painel WhatsApp.</span>}
      </div>
    </div>
  );
}

// ─── controle de agendamento ───────────────────────────────────────────────────
function AgendamentoControle({ agora, setAgora, quando, setQuando }: {
  agora: boolean; setAgora: (b: boolean) => void; quando: string; setQuando: (s: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">Quando enviar</label>
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setAgora(true)}
          className={`text-xs px-3 py-1.5 rounded-md border ${agora ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
          <Send className="size-3 inline mr-1" /> Enviar agora
        </button>
        <button type="button" onClick={() => setAgora(false)}
          className={`text-xs px-3 py-1.5 rounded-md border ${!agora ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border"}`}>
          <CalendarClock className="size-3 inline mr-1" /> Agendar
        </button>
        {!agora && (
          <Input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} className="h-8 w-auto text-xs" />
        )}
      </div>
    </div>
  );
}

// ─── recorte de catálogo (reusa PdfPageViewer) ─────────────────────────────────
function CatalogoRecorte({ catalogos, onRecorte, label = "Recortar do catálogo" }: {
  catalogos: Catalogo[]; onRecorte: (url: string, catalogoId: string) => void; label?: string;
}) {
  const [catalogoId, setCatalogoId] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pagina, setPagina] = useState(1);
  const [carregandoPdf, setCarregandoPdf] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [irPara, setIrPara] = useState("");

  async function abrir(id: string) {
    setCatalogoId(id);
    setPdfUrl(null);
    if (!id) return;
    setCarregandoPdf(true);
    setModalAberto(true);
    try {
      const r = await fetch(`/api/admin/atacado/catalogos/${id}`).then((x) => x.json());
      if (!r.data?.arquivoUrl) throw new Error("PDF não encontrado");
      setPdfUrl(r.data.arquivoUrl);
      setPagina(1);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao abrir catálogo");
      setModalAberto(false);
    } finally {
      setCarregandoPdf(false);
    }
  }

  function fechar() {
    setModalAberto(false);
    setPdfUrl(null);
    setCatalogoId("");
  }

  async function handleRecorte(blob: Blob) {
    setEnviando(true);
    try {
      const url = await uploadArquivo(blob, "recorte.jpg");
      onRecorte(url, catalogoId);
      toast.success("Recorte capturado");
      fechar();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao salvar recorte");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
        <BookOpen className="size-4 text-muted-foreground" />
        <select value={catalogoId} onChange={(e) => abrir(e.target.value)}
          className="flex-1 h-8 rounded-md border border-border bg-card text-xs px-2">
          <option value="">{label} — escolha um catálogo…</option>
          {catalogos.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.fornecedor?.nome ? ` (${c.fornecedor.nome})` : ""}</option>)}
        </select>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 p-3" onClick={fechar}>
          <div className="relative bg-card rounded-xl shadow-2xl w-full h-full max-w-6xl mx-auto flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b shrink-0">
              <p className="text-sm font-semibold hidden sm:block">Arraste um quadrado sobre o produto pra recortar</p>
              <div className="flex items-center gap-2">
                <form onSubmit={(e) => { e.preventDefault(); const n = parseInt(irPara, 10); if (n >= 1 && n <= (totalPaginas || n)) setPagina(n); }} className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Ir p/ pág.</span>
                  <Input value={irPara} onChange={(e) => setIrPara(e.target.value.replace(/\D/g, ""))} placeholder={String(pagina)} className="h-7 w-16 text-xs text-center" />
                  {totalPaginas > 0 && <span className="text-xs text-muted-foreground">/ {totalPaginas}</span>}
                  <Button type="submit" size="sm" variant="outline" className="h-7 text-xs">Ir</Button>
                </form>
                <button onClick={fechar} className="text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
              </div>
            </div>
            <div className="flex-1 min-h-0 relative">
              {carregandoPdf && <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" /> Carregando PDF…</div>}
              {pdfUrl && (
                <PdfPageViewer url={pdfUrl} pagina={pagina} onPaginaChange={setPagina} onTotalPaginas={setTotalPaginas} selecionando onRecorte={handleRecorte} />
              )}
              {enviando && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="size-6 animate-spin" /></div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── preview de blocos ─────────────────────────────────────────────────────────
function PreviewBlocos({ blocos }: { blocos: Bloco[] }) {
  if (blocos.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">Prévia ({blocos.length} mensagem{blocos.length > 1 ? "s" : ""})</label>
      <div className="flex flex-col gap-2">
        {blocos.map((b, i) => (
          <div key={i} className="flex gap-2 rounded-lg border bg-muted/30 p-2">
            {b.tipo === "IMAGEM" && b.url && <img src={b.url} alt="" className="w-16 h-16 object-cover rounded" />}
            {b.tipo === "VIDEO" && <div className="w-16 h-16 rounded bg-black/80 flex items-center justify-center"><Video className="size-6 text-white" /></div>}
            {b.tipo === "TEXTO" && <div className="w-16 h-16 rounded bg-card flex items-center justify-center"><Type className="size-6 text-muted-foreground" /></div>}
            <p className="text-xs text-foreground whitespace-pre-wrap flex-1 min-w-0">{b.legenda || <span className="text-muted-foreground">(sem legenda)</span>}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ABA PRODUTOS ───────────────────────────────────────────────────────────────
function AbaProdutos({ catalogos, vinculos, onAgendado }: {
  catalogos: Catalogo[]; vinculos: Vinculo[]; onAgendado: () => void;
}) {
  const [printUrl, setPrintUrl] = useState<string | null>(null);
  const [catalogoId, setCatalogoId] = useState("");
  const [lendo, setLendo] = useState(false);
  const [form, setForm] = useState({ codigo: "", nome: "", categoria: "", marca: "", custoUnitario: "", precoCatalogo: "", unidadesPorCaixa: "" });
  const [legenda, setLegenda] = useState("");
  const [grupos, setGrupos] = useState<string[]>([]);
  const [agora, setAgora] = useState(true);
  const [quando, setQuando] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Ao recortar: guarda print + roda IA pra autopreencher
  async function aoRecortar(url: string, catId: string) {
    setPrintUrl(url);
    setCatalogoId(catId);
    setLendo(true);
    try {
      // Baixa o print e manda pra IA de visão (rota existente)
      const blob = await fetch(url).then((r) => r.blob());
      const fd = new FormData();
      fd.append("imagem", new File([blob], "recorte.jpg", { type: "image/jpeg" }));
      const r = await fetch("/api/admin/atacado/catalogos/extrair-dados", { method: "POST", body: fd }).then((x) => x.json());
      if (r.data) {
        const d = r.data;
        setForm({
          codigo: d.codigo ?? "", nome: d.nome ?? "", categoria: d.categoria ?? "", marca: d.marca ?? "",
          custoUnitario: d.custoUnitario != null ? String(d.custoUnitario) : "",
          precoCatalogo: d.precoCatalogo != null ? String(d.precoCatalogo) : "",
          unidadesPorCaixa: d.unidadesPorCaixa != null ? String(d.unidadesPorCaixa) : "",
        });
        setLegenda(`🔥 ${d.nome ?? "Novo produto"}${d.codigo ? ` (${d.codigo})` : ""}\n\nJá disponível pra compra coletiva! Chama no pedido 📦`);
        toast.success("IA leu o produto");
      }
    } catch {
      toast.info("IA não conseguiu ler — preencha manual");
    } finally {
      setLendo(false);
    }
  }

  async function salvar() {
    if (!printUrl || !catalogoId) return toast.error("Recorte um produto do catálogo primeiro");
    if (!form.nome.trim()) return toast.error("Nome do produto é obrigatório");
    if (grupos.length === 0) return toast.error("Escolha ao menos 1 grupo");
    setSalvando(true);
    try {
      // 1. Pré-cadastra OU atualiza só preço
      const prodResp = await fetch("/api/admin/atacado/agenda/produto", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catalogoId, imagemUrl: printUrl,
          codigo: form.codigo || undefined, nome: form.nome, categoria: form.categoria || undefined, marca: form.marca || undefined,
          custoUnitario: form.custoUnitario ? Number(form.custoUnitario) : undefined,
          precoCatalogo: form.precoCatalogo ? Number(form.precoCatalogo) : undefined,
          unidadesPorCaixa: form.unidadesPorCaixa ? Number(form.unidadesPorCaixa) : undefined,
        }),
      }).then((x) => x.json());
      if (prodResp.data?.acao) toast.success(`Produto ${prodResp.data.acao === "criado" ? "pré-cadastrado" : "preço atualizado"}`);

      // 2. Agenda a postagem (imagem do print + legenda)
      await agendarPostagem({
        tipo: "PRODUTO", titulo: form.nome, grupos, agora, quando,
        blocos: [{ tipo: "IMAGEM", url: printUrl, legenda }],
      });
      // reset
      setPrintUrl(null); setForm({ codigo: "", nome: "", categoria: "", marca: "", custoUnitario: "", precoCatalogo: "", unidadesPorCaixa: "" }); setLegenda("");
      onAgendado();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao agendar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CatalogoRecorte catalogos={catalogos} onRecorte={aoRecortar} label="Abrir catálogo e recortar o produto" />
      {lendo && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> IA lendo o produto…</div>}
      {printUrl && (
        <div className="flex gap-4 flex-col sm:flex-row">
          <img src={printUrl} alt="print" className="w-32 h-32 object-contain rounded-lg border shrink-0" />
          <div className="grid grid-cols-2 gap-2 flex-1">
            <Input placeholder="Código" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Marca" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Custo (R$)" value={form.custoUnitario} onChange={(e) => setForm({ ...form, custoUnitario: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Preço catálogo (R$)" value={form.precoCatalogo} onChange={(e) => setForm({ ...form, precoCatalogo: e.target.value })} className="h-8 text-xs" />
            <Input placeholder="Un/caixa" value={form.unidadesPorCaixa} onChange={(e) => setForm({ ...form, unidadesPorCaixa: e.target.value })} className="h-8 text-xs" />
          </div>
        </div>
      )}
      {printUrl && (
        <>
          <Textarea placeholder="Legenda da postagem" value={legenda} onChange={(e) => setLegenda(e.target.value)} rows={4} className="text-sm" />
          <p className="text-[11px] text-muted-foreground">Se o código já existir no fornecedor, só o preço é atualizado (imagem e variação ficam intactas).</p>
          <SeletorGrupos vinculos={vinculos} selecionados={grupos} onChange={setGrupos} />
          <AgendamentoControle agora={agora} setAgora={setAgora} quando={quando} setQuando={setQuando} />
          <Button onClick={salvar} disabled={salvando} className="self-start">
            {salvando ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Send className="size-4 mr-1" />}
            {agora ? "Enviar agora" : "Agendar postagem"}
          </Button>
        </>
      )}
    </div>
  );
}

// ─── ABA CATÁLOGOS (quebra de objeção) ──────────────────────────────────────────
function AbaCatalogos({ catalogos, vinculos, onAgendado }: {
  catalogos: Catalogo[]; vinculos: Vinculo[]; onAgendado: () => void;
}) {
  const [mlUrl, setMlUrl] = useState<string | null>(null); // print do anúncio no ML
  const [link, setLink] = useState("");
  const [nossoUrl, setNossoUrl] = useState<string | null>(null); // print do nosso catálogo
  const [codigo, setCodigo] = useState("");
  const [legenda1, setLegenda1] = useState("👀 Olha o quanto estão VENDENDO esse produto no Mercado Livre:");
  const [legenda2, setLegenda2] = useState("🤯 E olha o NOSSO preço no atacado!\n\nÉ MUITO dinheiro que você tá deixando de ganhar.\n\n📦 Pra fazer seu pedido, chama com o código: ");
  const [grupos, setGrupos] = useState<string[]>([]);
  const [agora, setAgora] = useState(true);
  const [quando, setQuando] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function uploadInput(file: File | undefined, setter: (u: string) => void) {
    if (!file) return;
    try { setter(await uploadArquivo(file, file.name)); } catch (e: any) { toast.error(e?.message ?? "Falha no upload"); }
  }

  async function salvar() {
    if (!mlUrl) return toast.error("Envie o print do anúncio no Mercado Livre");
    if (!nossoUrl) return toast.error("Recorte ou envie o print do nosso catálogo");
    if (grupos.length === 0) return toast.error("Escolha ao menos 1 grupo");
    setSalvando(true);
    try {
      const legendaML = link ? `${legenda1}\n${link}` : legenda1;
      const legendaNosso = codigo ? `${legenda2}${codigo}` : legenda2;
      await agendarPostagem({
        tipo: "CATALOGO", titulo: `Comparação ${codigo || ""}`.trim(), grupos, agora, quando,
        blocos: [
          { tipo: "IMAGEM", url: mlUrl, legenda: legendaML },
          { tipo: "IMAGEM", url: nossoUrl, legenda: legendaNosso },
        ],
      });
      setMlUrl(null); setNossoUrl(null); setLink(""); setCodigo("");
      onAgendado();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao agendar");
    } finally {
      setSalvando(false);
    }
  }

  const preview: Bloco[] = [
    ...(mlUrl ? [{ tipo: "IMAGEM" as const, url: mlUrl, legenda: link ? `${legenda1}\n${link}` : legenda1 }] : []),
    ...(nossoUrl ? [{ tipo: "IMAGEM" as const, url: nossoUrl, legenda: codigo ? `${legenda2}${codigo}` : legenda2 }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-3 flex flex-col gap-2">
        <span className="text-xs font-semibold flex items-center gap-1"><TrendingUp className="size-3.5 text-amber-500" /> 1ª imagem — preço caro no Mercado Livre</span>
        <div className="flex gap-3 items-start">
          {mlUrl ? <img src={mlUrl} alt="" className="w-24 h-24 object-contain rounded border" /> : (
            <label className="w-24 h-24 rounded border border-dashed flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-accent">
              <ImageIcon className="size-6" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadInput(e.target.files?.[0], setMlUrl)} />
            </label>
          )}
          <div className="flex-1 flex flex-col gap-2">
            <Input placeholder="Link do anúncio no ML" value={link} onChange={(e) => setLink(e.target.value)} className="h-8 text-xs" />
            <Textarea value={legenda1} onChange={(e) => setLegenda1(e.target.value)} rows={2} className="text-xs" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-3 flex flex-col gap-2">
        <span className="text-xs font-semibold flex items-center gap-1"><Package className="size-3.5 text-primary" /> 2ª imagem — nosso preço no catálogo</span>
        {nossoUrl ? (
          <div className="flex gap-3 items-start">
            <img src={nossoUrl} alt="" className="w-24 h-24 object-contain rounded border" />
            <Button size="sm" variant="outline" onClick={() => setNossoUrl(null)}>Trocar</Button>
          </div>
        ) : (
          <>
            <CatalogoRecorte catalogos={catalogos} onRecorte={setNossoUrl} label="Recortar do nosso catálogo" />
            <label className="text-xs text-primary cursor-pointer">
              ou envie uma imagem pronta
              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadInput(e.target.files?.[0], setNossoUrl)} />
            </label>
          </>
        )}
        <Input placeholder="Código pro pedido (CTA)" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="h-8 text-xs" />
        <Textarea value={legenda2} onChange={(e) => setLegenda2(e.target.value)} rows={4} className="text-xs" />
      </div>

      <PreviewBlocos blocos={preview} />
      <SeletorGrupos vinculos={vinculos} selecionados={grupos} onChange={setGrupos} />
      <AgendamentoControle agora={agora} setAgora={setAgora} quando={quando} setQuando={setQuando} />
      <Button onClick={salvar} disabled={salvando} className="self-start">
        {salvando ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Send className="size-4 mr-1" />}
        {agora ? "Enviar agora" : "Agendar postagem"}
      </Button>
    </div>
  );
}

// ─── ABA MENSAGENS (livre) ──────────────────────────────────────────────────────
function AbaMensagens({ catalogos, vinculos, onAgendado }: {
  catalogos: Catalogo[]; vinculos: Vinculo[]; onAgendado: () => void;
}) {
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [agora, setAgora] = useState(true);
  const [quando, setQuando] = useState("");
  const [salvando, setSalvando] = useState(false);

  function addBloco(b: Bloco) { setBlocos((prev) => [...prev, b]); }
  function removeBloco(i: number) { setBlocos((prev) => prev.filter((_, idx) => idx !== i)); }
  function setLegenda(i: number, legenda: string) { setBlocos((prev) => prev.map((b, idx) => idx === i ? { ...b, legenda } : b)); }

  async function uploadMidia(file: File | undefined, tipo: "IMAGEM" | "VIDEO") {
    if (!file) return;
    try { addBloco({ tipo, url: await uploadArquivo(file, file.name), legenda: "" }); }
    catch (e: any) { toast.error(e?.message ?? "Falha no upload"); }
  }

  async function salvar() {
    if (blocos.length === 0) return toast.error("Adicione ao menos 1 mensagem");
    if (grupos.length === 0) return toast.error("Escolha ao menos 1 grupo");
    setSalvando(true);
    try {
      await agendarPostagem({ tipo: "MENSAGEM", titulo: "Mensagem", grupos, agora, quando, blocos });
      setBlocos([]);
      onAgendado();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao agendar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => addBloco({ tipo: "TEXTO", legenda: "" })}><Type className="size-3.5 mr-1" /> Texto</Button>
        <label className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border bg-card text-xs font-medium cursor-pointer hover:bg-accent">
          <ImageIcon className="size-3.5" /> Imagem
          <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadMidia(e.target.files?.[0], "IMAGEM")} />
        </label>
        <label className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border bg-card text-xs font-medium cursor-pointer hover:bg-accent">
          <Video className="size-3.5" /> Vídeo
          <input type="file" accept="video/*" className="hidden" onChange={(e) => uploadMidia(e.target.files?.[0], "VIDEO")} />
        </label>
      </div>

      <CatalogoRecorte catalogos={catalogos} onRecorte={(url) => addBloco({ tipo: "IMAGEM", url, legenda: "" })} label="Printar página/produto do catálogo" />

      {blocos.length > 0 && (
        <div className="flex flex-col gap-2">
          {blocos.map((b, i) => (
            <div key={i} className="flex gap-2 rounded-lg border p-2 items-start">
              {b.tipo === "IMAGEM" && b.url && <img src={b.url} alt="" className="w-14 h-14 object-cover rounded shrink-0" />}
              {b.tipo === "VIDEO" && <div className="w-14 h-14 rounded bg-black/80 flex items-center justify-center shrink-0"><Video className="size-5 text-white" /></div>}
              {b.tipo === "TEXTO" && <div className="w-14 h-14 rounded bg-muted flex items-center justify-center shrink-0"><Type className="size-5 text-muted-foreground" /></div>}
              <Textarea placeholder={b.tipo === "TEXTO" ? "Texto da mensagem" : "Legenda (opcional)"} value={b.legenda ?? ""} onChange={(e) => setLegenda(i, e.target.value)} rows={2} className="text-xs flex-1" />
              <button onClick={() => removeBloco(i)} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
            </div>
          ))}
        </div>
      )}

      <SeletorGrupos vinculos={vinculos} selecionados={grupos} onChange={setGrupos} />
      <AgendamentoControle agora={agora} setAgora={setAgora} quando={quando} setQuando={setQuando} />
      <Button onClick={salvar} disabled={salvando} className="self-start">
        {salvando ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Send className="size-4 mr-1" />}
        {agora ? "Enviar agora" : "Agendar postagem"}
      </Button>
    </div>
  );
}

// ─── ABA IA (gatilhos gerados + agendados) ──────────────────────────────────────
type GatilhoGerado = { texto: string; quando: string; imagemUrl?: string | null };

function AbaIA({ vinculos, onAgendado }: { vinculos: Vinculo[]; onAgendado: () => void }) {
  const [tema, setTema] = useState("");
  const [busca, setBusca] = useState("");
  const [quantidade, setQuantidade] = useState("3");
  const [grupos, setGrupos] = useState<string[]>([]);
  const [caixasAbertas, setCaixasAbertas] = useState(true);
  const [novidades, setNovidades] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerados, setGerados] = useState<GatilhoGerado[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Horário sugerido: espaça os posts de ~2h a partir de 1h no futuro
  function horarioSugerido(i: number): string {
    const d = new Date(Date.now() + (1 + i * 2) * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 16);
  }

  async function gerar() {
    if (tema.trim().length < 3) return toast.error("Descreva o tema/contexto");
    setGerando(true);
    try {
      const r = await fetch("/api/admin/atacado/agenda/gerar-ia", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema: tema.trim(), quantidade: Number(quantidade), caixasAbertas, novidades, busca: busca.trim() || undefined }),
      }).then((x) => x.json());
      if (r.error) { toast.error(r.error.message ?? "Erro na IA"); return; }
      if (r.data?.naoEncontrado) { toast.error(`Não achei "${r.data.termo}" nas caixas/produtos cadastrados`); return; }
      const msgs: string[] = r.data?.mensagens ?? [];
      const img: string | null = r.data?.imagemSugerida ?? null;
      setGerados(msgs.map((texto, i) => ({ texto, quando: horarioSugerido(i), imagemUrl: img })));
      toast.success(`${msgs.length} mensagens geradas${img ? " (com imagem do produto)" : ""} — ajuste e agende`);
    } finally {
      setGerando(false);
    }
  }

  function setTexto(i: number, texto: string) { setGerados((p) => p.map((g, idx) => idx === i ? { ...g, texto } : g)); }
  function setQuando(i: number, quando: string) { setGerados((p) => p.map((g, idx) => idx === i ? { ...g, quando } : g)); }
  function setImagem(i: number, imagemUrl: string | null) { setGerados((p) => p.map((g, idx) => idx === i ? { ...g, imagemUrl } : g)); }
  function remover(i: number) { setGerados((p) => p.filter((_, idx) => idx !== i)); }

  async function trocarImagem(i: number, file: File | undefined) {
    if (!file) return;
    try { setImagem(i, await uploadArquivo(file, file.name)); } catch (e: any) { toast.error(e?.message ?? "Falha no upload"); }
  }

  async function agendarTodas() {
    if (grupos.length === 0) return toast.error("Escolha ao menos 1 grupo");
    const validos = gerados.filter((g) => g.texto.trim() && g.quando);
    if (validos.length === 0) return toast.error("Nenhuma mensagem válida (texto + horário)");
    setSalvando(true);
    try {
      for (const g of validos) {
        const bloco: Bloco = g.imagemUrl
          ? { tipo: "IMAGEM", url: g.imagemUrl, legenda: g.texto }
          : { tipo: "TEXTO", legenda: g.texto };
        await agendarPostagem({
          tipo: "MENSAGEM", titulo: g.texto.slice(0, 40), grupos, agora: false, quando: g.quando,
          blocos: [bloco],
        });
      }
      toast.success(`${validos.length} postagens agendadas`);
      setGerados([]);
      onAgendado();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao agendar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border p-3 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          A IA gera várias mensagens no tema que você der, como se fosse você. Marque abaixo pra ela
          usar seus dados reais (caixas abertas, produtos novos). Você ajusta o horário e agenda —
          postam sozinhas, sem responder ninguém.
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={caixasAbertas} onChange={(e) => setCaixasAbertas(e.target.checked)} className="size-3.5" />
            Falar das caixas abertas (nome, preço, progresso, link)
          </label>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={novidades} onChange={(e) => setNovidades(e.target.checked)} className="size-3.5" />
            Falar de produtos/catálogo novos
          </label>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Puxar produto ou caixa específica (opcional)</label>
          <Input value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex: varal, tapete, fone… — busca pelo nome nos seus produtos/caixas" className="h-8 text-xs" />
          <p className="text-[11px] text-muted-foreground mt-0.5">Se preencher, a IA foca só nesse item (com preço/progresso/link reais). Vazio = usa os checkboxes acima.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tema / estilo</label>
          <Textarea value={tema} onChange={(e) => setTema(e.target.value)} rows={2}
            placeholder="Ex: gatilhos de urgência, tom animado, chamando pra garantir a unidade antes de fechar" className="text-sm" />
        </div>
        <div className="flex items-end gap-2">
          <div className="w-24">
            <label className="text-xs font-medium text-muted-foreground">Quantas</label>
            <Input type="number" min="1" max="10" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="h-8 text-xs" />
          </div>
          <Button size="sm" onClick={gerar} disabled={gerando}>
            {gerando ? <Loader2 className="size-4 mr-1 animate-spin" /> : <MessageSquare className="size-4 mr-1" />}
            Gerar com IA
          </Button>
        </div>
      </div>

      {gerados.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">{gerados.length} mensagens — edite o texto e o horário</label>
          {gerados.map((g, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border p-2">
              <div className="flex gap-2">
                {/* Imagem anexada (produto/caixa) */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  {g.imagemUrl ? (
                    <div className="relative">
                      <img src={g.imagemUrl} alt="" className="w-14 h-14 object-cover rounded border" />
                      <button onClick={() => setImagem(i, null)} className="absolute -top-1.5 -right-1.5 bg-background border rounded-full p-0.5 text-muted-foreground hover:text-destructive" title="Remover imagem"><X className="size-3" /></button>
                    </div>
                  ) : (
                    <label className="w-14 h-14 rounded border border-dashed flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-accent" title="Anexar imagem">
                      <ImageIcon className="size-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => trocarImagem(i, e.target.files?.[0])} />
                    </label>
                  )}
                  {g.imagemUrl && (
                    <label className="text-[10px] text-primary cursor-pointer">trocar
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => trocarImagem(i, e.target.files?.[0])} />
                    </label>
                  )}
                </div>
                <Textarea value={g.texto} onChange={(e) => setTexto(i, e.target.value)} rows={3} className="text-xs flex-1" />
                <button onClick={() => remover(i)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="size-4" /></button>
              </div>
              <Input type="datetime-local" value={g.quando} onChange={(e) => setQuando(i, e.target.value)} className="h-8 w-auto text-xs" />
            </div>
          ))}
          <SeletorGrupos vinculos={vinculos} selecionados={grupos} onChange={setGrupos} max={3} />
          <Button onClick={agendarTodas} disabled={salvando} className="self-start">
            {salvando ? <Loader2 className="size-4 mr-1 animate-spin" /> : <CalendarClock className="size-4 mr-1" />}
            Agendar todas ({gerados.length})
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── helper de agendamento (compartilhado) ─────────────────────────────────────
async function agendarPostagem(p: {
  tipo: "PRODUTO" | "CATALOGO" | "MENSAGEM"; titulo?: string; grupos: string[];
  agora: boolean; quando: string; blocos: Bloco[];
}) {
  const body: any = { tipo: p.tipo, titulo: p.titulo, gruposJids: p.grupos, blocos: p.blocos };
  if (!p.agora) {
    if (!p.quando) throw new Error("Defina a data/hora do agendamento");
    body.agendadoPara = new Date(p.quando).toISOString();
  }
  const r = await fetch("/api/admin/atacado/agenda", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }).then((x) => x.json());
  if (r.error) throw new Error(r.error.message ?? "Erro ao agendar");
  toast.success(p.agora ? "Enviando agora…" : "Postagem agendada!");
}

// ─── lista de postagens ─────────────────────────────────────────────────────────
function ListaPostagens({ postagens, onMudou }: { postagens: Postagem[]; onMudou: () => void }) {
  async function cancelar(id: string) {
    if (!confirm("Cancelar esta postagem?")) return;
    await fetch(`/api/admin/atacado/agenda?id=${id}`, { method: "DELETE" });
    onMudou();
  }
  const cor: Record<string, string> = {
    PENDENTE: "bg-blue-100 text-blue-700", ENVIANDO: "bg-amber-100 text-amber-700",
    ENVIADA: "bg-emerald-100 text-emerald-700", ERRO: "bg-red-100 text-red-700", CANCELADA: "bg-muted text-muted-foreground",
  };
  if (postagens.length === 0) return <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma postagem ainda.</p>;
  return (
    <div className="flex flex-col gap-2">
      {postagens.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge className={cor[p.status] ?? ""}>{p.status}</Badge>
              <span className="text-xs text-muted-foreground">{p.tipo}</span>
              <span className="text-sm font-medium truncate">{p.titulo || "(sem título)"}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {p.status === "ENVIADA" && p.enviadoEm ? `Enviada ${new Date(p.enviadoEm).toLocaleString("pt-BR")}` : `Agendada ${new Date(p.agendadoPara).toLocaleString("pt-BR")}`}
              {" · "}{p.gruposJids.length} grupo(s) · {p.blocos.length} msg
              {p.erro ? ` · ⚠️ ${p.erro.slice(0, 60)}` : ""}
            </p>
          </div>
          {(p.status === "PENDENTE" || p.status === "ERRO") && (
            <button onClick={() => cancelar(p.id)} className="text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="size-4" /></button>
          )}
          {p.status === "ENVIADA" && <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// ─── painel principal ─────────────────────────────────────────────────────────
export function AgendaPostagemPanel() {
  const [aba, setAba] = useState<"PRODUTO" | "CATALOGO" | "MENSAGEM" | "IA">("PRODUTO");
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [catalogos, setCatalogos] = useState<Catalogo[]>([]);
  const [postagens, setPostagens] = useState<Postagem[]>([]);

  const carregarPostagens = useCallback(() => {
    fetch("/api/admin/atacado/agenda").then((r) => r.json()).then((j) => setPostagens(j.data?.postagens ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/atacado/whatsapp/vinculos").then((r) => r.json()).then((j) => setVinculos(j.data?.vinculos ?? [])).catch(() => {});
    fetch("/api/admin/atacado/catalogos").then((r) => r.json()).then((j) => setCatalogos(j.data ?? [])).catch(() => {});
    carregarPostagens();
  }, [carregarPostagens]);

  const abas = [
    { id: "PRODUTO" as const, label: "Produtos", icon: Package },
    { id: "CATALOGO" as const, label: "Catálogos", icon: TrendingUp },
    { id: "MENSAGEM" as const, label: "Mensagens", icon: MessageSquare },
    { id: "IA" as const, label: "IA / Gatilhos", icon: Sparkles },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 border-b">
        {abas.map((a) => {
          const Icon = a.icon;
          return (
            <button key={a.id} onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${aba === a.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="size-4" /> {a.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-4">
        {aba === "PRODUTO" && <AbaProdutos catalogos={catalogos} vinculos={vinculos} onAgendado={carregarPostagens} />}
        {aba === "CATALOGO" && <AbaCatalogos catalogos={catalogos} vinculos={vinculos} onAgendado={carregarPostagens} />}
        {aba === "MENSAGEM" && <AbaMensagens catalogos={catalogos} vinculos={vinculos} onAgendado={carregarPostagens} />}
        {aba === "IA" && <AbaIA vinculos={vinculos} onAgendado={carregarPostagens} />}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Postagens agendadas</h2>
          <Button size="sm" variant="ghost" onClick={carregarPostagens}>Atualizar</Button>
        </div>
        <ListaPostagens postagens={postagens} onMudou={carregarPostagens} />
      </div>
    </div>
  );
}
