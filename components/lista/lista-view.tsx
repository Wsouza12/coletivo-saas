"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Phone, MapPin, User, Clock, FileText, Search, ScrollText, Users, X, Package, MessageCircle, Download, Loader2 } from "lucide-react";

type Catalogo = { id: string; nome: string | null; arquivoUrl: string | null };
type Fornecedor = {
  id: string; nome: string; telefone: string | null; endereco: string | null;
  vendedorNome: string | null; horarioAtendimento: string | null; pedidoMinimo: string | null;
  catalogos: Catalogo[];
};

// Gradientes premium determinísticos por nome (capa estilo streaming)
const GRADS = [
  ["#F5A524", "#B45309"], ["#22C55E", "#065F46"], ["#3B82F6", "#1E3A8A"],
  ["#EC4899", "#831843"], ["#8B5CF6", "#4C1D95"], ["#EF4444", "#7F1D1D"],
  ["#14B8A6", "#134E4A"], ["#F97316", "#7C2D12"],
];
function gradDe(nome: string) {
  let h = 0; for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADS[h % GRADS.length];
}
function iniciais(nome: string) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
// Link de conversa no WhatsApp (assume Brasil, DDI 55)
function waLink(telefone: string) {
  const d = telefone.replace(/\D/g, "");
  const num = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${num}`;
}

// Cache das capas já renderizadas (por URL do PDF) — evita re-render ao filtrar
const capaCache = new Map<string, string>();

// Capa do pôster = 1ª página do PDF (geralmente a logo/capa do catálogo),
// renderizada lazy via pdf.js só quando o tile entra na viewport. Fallback = gradiente.
function PosterCapa({ url, nome, c1, c2 }: { url: string | null; nome: string; c1: string; c2: string }) {
  const [img, setImg] = useState<string | null>(url ? capaCache.get(url) ?? null : null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!url || img) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(async (entries) => {
      if (!entries[0]?.isIntersecting) return;
      io.disconnect();
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
        const doc = await pdfjs.getDocument({ url, wasmUrl: "/pdfjs/wasm/" }).promise;
        const page = await doc.getPage(1);
        const base = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: 380 / base.width });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        const occ = await doc.getOptionalContentConfig();
        for (const [g] of occ) occ.setVisibility(g, true);
        await page.render({ canvas, viewport: vp, optionalContentConfigPromise: Promise.resolve(occ) }).promise;
        const data = canvas.toDataURL("image/jpeg", 0.8);
        capaCache.set(url, data);
        setImg(data);
        void (doc as { destroy?: () => void }).destroy?.();
      } catch { /* mantém o gradiente */ }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [url, img]);

  return (
    <div ref={ref} className="absolute inset-0">
      <div className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${c1}, ${c2})` }} />
      {!img && <span className="absolute inset-0 flex items-center justify-center text-5xl font-black text-white/25">{iniciais(nome)}</span>}
      {img && <img src={img} alt={nome} className="absolute inset-0 w-full h-full object-cover" />}
    </div>
  );
}

export function ListaView({ nome, fornecedores, soCatalogos, incluiComunidade, linkComunidade }: {
  nome: string; fornecedores: Fornecedor[]; soCatalogos: boolean;
  incluiComunidade: boolean; linkComunidade: string | null;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Fornecedor | null>(null);
  const [pdf, setPdf] = useState<{ url: string; nome: string } | null>(null);
  const totalCatalogos = useMemo(() => fornecedores.reduce((s, f) => s + f.catalogos.length, 0), [fornecedores]);
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return fornecedores;
    return fornecedores.filter((f) =>
      f.nome.toLowerCase().includes(t) ||
      (f.vendedorNome ?? "").toLowerCase().includes(t) ||
      f.catalogos.some((c) => (c.nome ?? "").toLowerCase().includes(t))
    );
  }, [q, fornecedores]);

  return (
    <div className="min-h-screen bg-[#0B0906] text-[#F5F1EA]">
      {/* Top bar */}
      <div className="border-b border-white/10 bg-[#0e0a05]/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-[#F5A524] text-[#0B0906]"><ScrollText className="size-4" /></span>
            <span className="font-bold text-sm">Área do Membro</span>
          </div>
          <span className="text-xs text-[#B7AFA2]">Olá, {nome.split(" ")[0]} 👋</span>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold">Catálogos & Fornecedores</h1>
            <p className="text-sm text-[#B7AFA2]">{fornecedores.length} fornecedores · {totalCatalogos} catálogos · sempre atualizado</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8a8071]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
              className="w-full h-10 rounded-lg bg-[#141009] border border-white/12 pl-9 pr-3 text-sm placeholder:text-[#8a8071] focus:outline-none focus:border-[#F5A524]" />
          </div>
        </div>

        {incluiComunidade && (
          <div className="rounded-xl border border-[#F5A524]/40 bg-[#F5A524]/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <Users className="size-7 text-[#F5A524] shrink-0" />
            <div className="flex-1"><p className="font-bold">Você tem acesso à comunidade!</p><p className="text-xs text-[#B7AFA2]">Compre no rateio, preço de atacado.</p></div>
            {linkComunidade ? (
              <a href={linkComunidade} target="_blank" rel="noopener noreferrer" className="shrink-0 inline-flex items-center justify-center rounded-lg bg-[#F5A524] hover:bg-[#FF8A1E] text-[#0B0906] font-bold h-10 px-4 text-sm">Entrar na comunidade →</a>
            ) : <span className="text-xs text-[#F5A524]">Link no seu WhatsApp.</span>}
          </div>
        )}

        {/* GRID estilo streaming */}
        {filtrados.length === 0 ? (
          <p className="text-center text-sm text-[#8a8071] py-10">Nada encontrado pra “{q}”.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtrados.map((f) => {
              const [c1, c2] = gradDe(f.nome);
              const capaUrl = f.catalogos.find((c) => c.arquivoUrl)?.arquivoUrl ?? null;
              return (
                <button key={f.id} onClick={() => setSel(f)}
                  className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-white/10 text-left hover:scale-[1.03] hover:border-white/25 transition-all">
                  <PosterCapa url={capaUrl} nome={f.nome} c1={c1} c2={c2} />
                  <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                    <p className="font-bold text-sm leading-tight line-clamp-2 text-white">{f.nome}</p>
                    <p className="text-[11px] text-white/70 mt-0.5 flex items-center gap-1"><FileText className="size-3" /> {f.catalogos.length} catálogo{f.catalogos.length !== 1 ? "s" : ""}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-[#8a8071] pt-2 pb-8">Lista exclusiva — uso pessoal. Não compartilhe seu acesso.</p>
      </div>

      {/* MODAL de detalhe do fornecedor */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4" onClick={() => setSel(null)}>
          <div className="relative bg-[#141009] w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl border border-white/10 overflow-hidden max-h-[88vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="h-28 relative" style={{ background: `linear-gradient(150deg, ${gradDe(sel.nome)[0]}, ${gradDe(sel.nome)[1]})` }}>
              <span className="absolute inset-0 flex items-center justify-center text-4xl font-black text-white/25">{iniciais(sel.nome)}</span>
              <button onClick={() => setSel(null)} className="absolute top-3 right-3 size-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60"><X className="size-4" /></button>
            </div>
            <div className="p-5 flex flex-col gap-3 overflow-auto">
              <h2 className="text-xl font-extrabold">{sel.nome}</h2>

              {!soCatalogos && (
                <>
                  {/* Botão principal: falar no WhatsApp */}
                  {sel.telefone && (
                    <a href={waLink(sel.telefone)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 rounded-lg bg-[#22C55E] text-[#08150C] font-bold h-11 hover:bg-[#16A34A]">
                      <MessageCircle className="size-5" /> Falar no WhatsApp
                    </a>
                  )}
                  {/* Menu de contatos */}
                  <div className="flex flex-col divide-y divide-white/8 rounded-lg border border-white/10 bg-[#0e0a05]">
                    {sel.telefone && <a href={`tel:${sel.telefone.replace(/\D/g, "")}`} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#D9D2C6] hover:bg-white/5"><Phone className="size-4 text-[#22C55E]" /> {sel.telefone}</a>}
                    {sel.vendedorNome && <span className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#D9D2C6]"><User className="size-4 text-[#22C55E]" /> {sel.vendedorNome}</span>}
                    {sel.endereco && <a href={`https://www.google.com/maps/search/${encodeURIComponent(sel.endereco)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#D9D2C6] hover:bg-white/5"><MapPin className="size-4 text-[#22C55E]" /> {sel.endereco}</a>}
                    {sel.horarioAtendimento && <span className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#D9D2C6]"><Clock className="size-4 text-[#22C55E]" /> {sel.horarioAtendimento}</span>}
                    {sel.pedidoMinimo && <span className="px-3 py-2 text-xs text-[#8a8071]">Pedido mínimo: {sel.pedidoMinimo}</span>}
                  </div>
                </>
              )}

              <div className="border-t border-white/10 pt-3">
                <p className="text-xs font-semibold text-[#B7AFA2] mb-2 flex items-center gap-1"><Package className="size-3.5" /> Catálogos</p>
                <div className="flex flex-col gap-2">
                  {sel.catalogos.length === 0 && <p className="text-sm text-[#8a8071]">Sem catálogo cadastrado.</p>}
                  {sel.catalogos.map((c) => (
                    c.arquivoUrl ? (
                      <button key={c.id} onClick={() => setPdf({ url: c.arquivoUrl!, nome: c.nome || sel.nome })}
                        className="flex items-center gap-2 rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E] px-3 py-2.5 text-sm font-semibold hover:bg-[#22C55E]/20 text-left">
                        <FileText className="size-4" /> {c.nome || "Catálogo"} <span className="ml-auto text-xs">Abrir →</span>
                      </button>
                    ) : (
                      <span key={c.id} className="flex items-center gap-2 rounded-lg border border-white/10 text-[#8a8071] px-3 py-2.5 text-sm">
                        <FileText className="size-4" /> {c.nome || "Catálogo"} (sem arquivo)
                      </span>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL do PDF do catálogo (contido, não tela cheia) */}
      {pdf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 sm:p-6" onClick={() => setPdf(null)}>
          <div className="relative bg-[#141009] w-full max-w-3xl h-[85vh] rounded-2xl border border-white/10 overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 shrink-0">
              <p className="text-sm font-semibold truncate">{pdf.nome}</p>
              <div className="flex items-center gap-2 shrink-0">
                <BaixarCatalogoBtn url={pdf.url} nome={pdf.nome} />
                <button onClick={() => setPdf(null)} className="size-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"><X className="size-4" /></button>
              </div>
            </div>
            <iframe src={pdf.url} title={pdf.nome} className="flex-1 w-full bg-white" />
          </div>
        </div>
      )}
    </div>
  );
}

// Baixa o PDF de fato (fetch blob → download), já que o R2 é outro domínio e o
// atributo download nativo é ignorado cross-origin.
function BaixarCatalogoBtn({ url, nome }: { url: string; nome: string }) {
  const [baixando, setBaixando] = useState(false);
  async function baixar() {
    setBaixando(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `${nome.replace(/[^\w\s-]/g, "").trim() || "catalogo"}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank");
    } finally {
      setBaixando(false);
    }
  }
  return (
    <button onClick={baixar} disabled={baixando}
      className="inline-flex items-center gap-1.5 rounded-lg bg-[#22C55E] text-[#08150C] font-bold px-3 h-8 text-xs hover:bg-[#16A34A] disabled:opacity-60">
      {baixando ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />} Baixar
    </button>
  );
}
