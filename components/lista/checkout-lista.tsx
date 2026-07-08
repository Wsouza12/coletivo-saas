"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Copy, QrCode, ArrowLeft, Check } from "lucide-react";

type Pix = { compraId: string; qrCode: string | null; qrCodeBase64: string | null; valor: number };
type Etapa = "oferta" | "dados" | "pix";
const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

const inputCls = "w-full h-11 rounded-lg bg-[#0e0a05] border border-white/12 px-3 text-[#F5F1EA] placeholder:text-[#8a8071] text-sm focus:outline-none focus:border-[#F5A524] transition-colors";

export function CheckoutLista({ precoCompleta, precoCatalogos, precoUpsell }: { precoCompleta: number; precoCatalogos: number; precoUpsell: number }) {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>("oferta");
  const [tipo, setTipo] = useState<"COMPLETA" | "CATALOGOS">("COMPLETA");
  const [comunidade, setComunidade] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pix, setPix] = useState<Pix | null>(null);
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  const [telefone, setTelefone] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const precoBase = tipo === "CATALOGOS" ? precoCatalogos : precoCompleta;
  const total = precoBase + (comunidade ? precoUpsell : 0);

  function escolher(t: "COMPLETA" | "CATALOGOS") { setTipo(t); setEtapa("dados"); }

  async function gerarPix() {
    if (nome.trim().length < 2) return toast.error("Digite seu nome");
    if (doc.replace(/\D/g, "").length < 11) return toast.error("CPF inválido");
    if (telefone.replace(/\D/g, "").length < 10) return toast.error("WhatsApp inválido");
    setLoading(true);
    try {
      const r = await fetch("/api/lista-fornecedores", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compradorNome: nome, compradorDoc: doc, compradorTelefone: telefone, tipo, incluiComunidade: comunidade }),
      }).then((x) => x.json());
      if (r.error) { toast.error(r.error.message ?? "Erro ao gerar Pix"); return; }
      setPix(r.data);
      setEtapa("pix");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (etapa !== "pix" || !pix) return;
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/lista-fornecedores/status/${pix.compraId}`).then((x) => x.json()).catch(() => null);
      if (r?.data?.status === "PAGO") {
        if (pollRef.current) clearInterval(pollRef.current);
        toast.success("Pagamento confirmado! Entrando…");
        await fetch("/api/lista-fornecedores/login", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ compradorDoc: doc, compradorTelefone: telefone }),
        }).catch(() => {});
        router.push("/fornecedores/minha-lista");
      }
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [etapa, pix, doc, telefone, router]);

  async function copiar() {
    if (!pix?.qrCode) return;
    try { await navigator.clipboard.writeText(pix.qrCode); toast.success("Código Pix copiado"); }
    catch { toast.error("Não consegui copiar"); }
  }

  // ── OFERTAS (2 cards) ──
  if (etapa === "oferta") {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/12 bg-[#141009] p-5 flex flex-col gap-2 text-center">
          <p className="text-sm font-bold text-[#F5F1EA]">Só os catálogos</p>
          <p className="text-xs text-[#B7AFA2]">PDFs, sem contatos dos vendedores</p>
          <p className="text-3xl font-extrabold text-[#22C55E] my-2">{brl(precoCatalogos)}</p>
          <button onClick={() => escolher("CATALOGOS")} className="h-11 rounded-lg border border-[#22C55E] text-[#22C55E] font-bold hover:bg-[#22C55E]/10 transition-colors">Quero esse</button>
        </div>
        <div className="rounded-2xl border-2 border-[#22C55E] bg-[#122016] p-5 flex flex-col gap-2 text-center relative shadow-[0_0_30px_rgba(34,197,94,0.15)]">
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#22C55E] text-[#08150C] text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide">MAIS COMPLETO</span>
          <p className="text-sm font-bold text-[#F5F1EA]">Lista completa</p>
          <p className="text-xs text-[#B7AFA2]">contatos + catálogos</p>
          <p className="text-3xl font-extrabold text-[#22C55E] my-2">{brl(precoCompleta)}</p>
          <button onClick={() => escolher("COMPLETA")} className="h-11 rounded-lg bg-[#22C55E] text-[#08150C] font-extrabold hover:bg-[#16A34A] transition-colors">Quero esse</button>
        </div>
      </div>
    );
  }

  // ── DADOS + UPSELL ──
  if (etapa === "dados") {
    return (
      <div className="rounded-2xl border-2 border-[#22C55E] bg-[#141009] p-5 shadow-[0_0_30px_rgba(34,197,94,0.12)] flex flex-col gap-3">
        <button onClick={() => setEtapa("oferta")} className="flex items-center gap-1 text-xs text-[#B7AFA2] hover:text-[#F5F1EA]"><ArrowLeft className="size-3.5" /> Trocar plano</button>
        <p className="text-center text-sm text-[#B7AFA2]">Plano: <b className="text-[#F5F1EA]">{tipo === "CATALOGOS" ? "Só catálogos" : "Lista completa"}</b></p>

        <button type="button" onClick={() => setComunidade((v) => !v)}
          className={`flex items-start gap-2 rounded-xl border-2 border-dashed p-3 text-left transition-colors ${comunidade ? "border-[#F5A524] bg-[#F5A524]/10" : "border-[#F5A524]/40 bg-[#F5A524]/5"}`}>
          <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border-2 ${comunidade ? "border-[#F5A524] bg-[#F5A524] text-[#0B0906]" : "border-[#F5A524]/60"}`}>{comunidade ? <Check className="size-3.5" /> : null}</span>
          <span className="text-sm text-[#F5F1EA]">
            <b className="text-[#F5A524]">➕ SIM! Quero acesso à comunidade</b> por +{brl(precoUpsell)}
            <br /><span className="text-xs text-[#B7AFA2]">Compre no rateio, preço de atacado, sem caixa fechada sozinho.</span>
          </span>
        </button>

        <input className={inputCls} placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input className={inputCls} placeholder="Seu CPF (será seu login de acesso)" value={doc} onChange={(e) => setDoc(e.target.value)} />
        <input className={inputCls} placeholder="Seu WhatsApp (com DDD)" value={telefone} onChange={(e) => setTelefone(e.target.value)} />

        <div className="text-center">
          <p className="text-4xl font-extrabold text-[#22C55E]">{brl(total)}</p>
          <p className="text-xs text-[#8a8071]">pagamento único · via Pix</p>
        </div>
        <button onClick={gerarPix} disabled={loading} className="h-12 rounded-lg bg-[#22C55E] text-[#08150C] font-extrabold uppercase tracking-wide hover:bg-[#16A34A] transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="size-5 animate-spin" /> : null} Gerar Pix
        </button>
      </div>
    );
  }

  // ── PIX ──
  return (
    <div className="rounded-2xl border border-white/12 bg-[#141009] p-5 flex flex-col items-center gap-4 text-center">
      <h2 className="font-bold text-[#F5F1EA]">Pague com Pix pra liberar o acesso</h2>
      {pix?.qrCodeBase64 ? (
        <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix" className="w-56 h-56 rounded-lg bg-white p-1" />
      ) : (
        <div className="w-56 h-56 flex items-center justify-center text-[#8a8071]"><QrCode className="size-10" /></div>
      )}
      {pix && <p className="text-2xl font-extrabold text-[#22C55E]">{brl(pix.valor)}</p>}
      {pix?.qrCode && (
        <div className="w-full flex items-center gap-2 rounded-lg border border-white/12 bg-[#0e0a05] p-2">
          <code className="text-[11px] flex-1 break-all text-left text-[#B7AFA2]">{pix.qrCode}</code>
          <button onClick={copiar} className="shrink-0 inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-[#F5F1EA] hover:border-[#F5A524]"><Copy className="size-3.5" /> Copiar</button>
        </div>
      )}
      <div className="flex items-center gap-2 text-sm text-[#B7AFA2]"><Loader2 className="size-4 animate-spin" /> Aguardando pagamento… o acesso abre sozinho.</div>
    </div>
  );
}
