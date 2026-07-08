"use client";

import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Sparkles, Upload, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type IgFormato = "POST" | "STORY" | "REELS";

type Props = {
  // se passado, pula upload e usa direto
  fotoBlob?: Blob | null;
  // nome/preco pré-preenchidos
  nomePadrao?: string;
  precoPadrao?: string;
  // callback: quando o usuário clica "Usar esta arte"
  onArte: (blob: Blob, legenda: string, formato: IgFormato) => void;
};

export function InstagramArtePanel({ fotoBlob, nomePadrao = "", precoPadrao = "", onArte }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [formato, setFormato] = useState<IgFormato>("POST");
  const [nome, setNome] = useState(nomePadrao);
  const [preco, setPreco] = useState(precoPadrao);
  const [precoAnterior, setPrecoAnterior] = useState("");
  const [features, setFeatures] = useState("");
  const [badge, setBadge] = useState("NOVIDADE!");
  const [cor, setCor] = useState("#CC0000");
  const [legenda, setLegenda] = useState("");

  const [fotoLocal, setFotoLocal] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [renderUrl, setRenderUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [gerandoLegenda, setGerandoLegenda] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  async function uploadFoto(blob: Blob, nome: string) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("imagem", blob, nome);
      const res = await fetch("/api/instagram/gerar-arte/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Erro no upload");
      setFotoUrl(json.data.url);
      return json.data.url as string;
    } finally {
      setUploading(false);
    }
  }

  function buildRenderUrl(foto: string) {
    const params = new URLSearchParams({
      nome,
      formato,
      cor,
      badge,
      ...(preco && { preco }),
      ...(precoAnterior && { precoAnterior }),
      ...(features.trim() && { features: features.split("\n").filter(Boolean).join("|") }),
      ...(foto && { fotoUrl: foto }),
    });
    return `/api/instagram/gerar-arte/render?${params}&t=${Date.now()}`;
  }

  async function gerarArte() {
    if (!nome.trim()) { toast.error("Informe o nome do produto"); return; }

    setGerando(true);
    try {
      let foto = fotoUrl;

      // Upload da foto se ainda não foi feito
      if (!foto) {
        const src = fotoLocal ?? fotoBlob ?? null;
        if (src) {
          foto = await uploadFoto(src, fotoLocal?.name ?? "foto.jpg");
        }
      }

      setRenderUrl(buildRenderUrl(foto ?? ""));
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao gerar arte");
    } finally {
      setGerando(false);
    }
  }

  async function gerarLegendaIA() {
    setGerandoLegenda(true);
    try {
      const res = await fetch("/api/instagram/gerar-conteudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome || "Produto atacado", descricao: features || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message);
      const d = json.data;
      setLegenda(formato === "POST" ? `${d.legendaPost}\n\n${d.hashtags}` : d.legendaStory);
      toast.success("Legenda gerada");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao gerar legenda");
    } finally {
      setGerandoLegenda(false);
    }
  }

  async function aplicarArte() {
    if (!renderUrl) { toast.error("Gere a arte primeiro"); return; }
    setAplicando(true);
    try {
      const res = await fetch(renderUrl);
      if (!res.ok) throw new Error("Erro ao baixar arte");
      const blob = await res.blob();
      onArte(blob, legenda, formato);
      toast.success("Arte aplicada! Ajuste a legenda e publique.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao aplicar arte");
    } finally {
      setAplicando(false);
    }
  }

  const [blobPreviewUrl, setBlobPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!fotoBlob || fotoLocal) { setBlobPreviewUrl(null); return; }
    const url = URL.createObjectURL(fotoBlob);
    setBlobPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [fotoBlob, fotoLocal]);

  const fotoPreview = fotoLocal ? URL.createObjectURL(fotoLocal) : blobPreviewUrl;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-purple-200 bg-purple-50/30 dark:bg-purple-950/10 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-purple-500" />
        <span className="font-semibold text-sm">Gerador de Arte</span>
        <span className="text-xs text-muted-foreground ml-auto">template automático</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Coluna esquerda: formulário */}
        <div className="flex flex-col gap-3">
          {/* Formato */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Formato</Label>
            <div className="flex gap-2">
              {(["POST", "STORY", "REELS"] as IgFormato[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => { setFormato(f); setRenderUrl(null); }}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${formato === f ? "bg-purple-600 text-white border-purple-600" : "border-border text-muted-foreground"}`}
                >
                  {f === "POST" ? "Post 1:1" : f === "STORY" ? "Story 9:16" : "Reels 9:16"}
                </button>
              ))}
            </div>
          </div>

          {/* Foto */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Foto do produto</Label>
            <input ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { setFotoLocal(e.target.files?.[0] ?? null); setFotoUrl(null); setRenderUrl(null); }}
            />
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={uploading}>
                <Upload className="size-3.5" />
                {fotoLocal ? "Trocar" : fotoBlob ? "Trocar recorte" : "Anexar foto"}
              </Button>
              {fotoLocal && (
                <button type="button" onClick={() => { setFotoLocal(null); setFotoUrl(null); setRenderUrl(null); }} className="text-xs text-destructive">
                  <X className="inline size-3" />
                </button>
              )}
              {!fotoLocal && fotoBlob && (
                <span className="text-xs text-green-600 font-medium">✓ recorte selecionado</span>
              )}
            </div>
            {fotoPreview && (
              <img src={fotoPreview} className="mt-1 h-16 w-16 object-contain rounded border" alt="" />
            )}
          </div>

          {/* Nome e preço */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Nome do produto *</Label>
            <Input value={nome} onChange={(e) => { setNome(e.target.value); setRenderUrl(null); }} placeholder="Ex: Guarda Roupa Grande" className="h-8 text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Preço (R$)</Label>
              <Input value={preco} onChange={(e) => { setPreco(e.target.value); setRenderUrl(null); }} placeholder="60,00" className="h-8 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">De (riscado)</Label>
              <Input value={precoAnterior} onChange={(e) => { setPrecoAnterior(e.target.value); setRenderUrl(null); }} placeholder="75,00" className="h-8 text-sm" />
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Features (1 por linha, máx 4)</Label>
            <Textarea
              value={features}
              onChange={(e) => { setFeatures(e.target.value); setRenderUrl(null); }}
              rows={3}
              placeholder={"Antiaderente\nFácil de limpar\nAlças laterais"}
              className="text-xs"
            />
          </div>

          {/* Badge e cor */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Badge</Label>
              <Input value={badge} onChange={(e) => { setBadge(e.target.value); setRenderUrl(null); }} placeholder="NOVIDADE!" className="h-8 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Cor destaque</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={cor} onChange={(e) => { setCor(e.target.value); setRenderUrl(null); }} className="h-8 w-12 cursor-pointer rounded border" />
                <span className="text-xs text-muted-foreground">{cor}</span>
              </div>
            </div>
          </div>

          <Button type="button" onClick={gerarArte} disabled={gerando || uploading || !nome.trim()} className="w-full bg-purple-600 hover:bg-purple-700 text-white">
            {gerando || uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
            {uploading ? "Enviando foto..." : gerando ? "Gerando arte..." : "Gerar Arte"}
          </Button>
        </div>

        {/* Coluna direita: preview + legenda */}
        <div className="flex flex-col gap-3">
          <Label className="text-xs">Prévia</Label>
          <div className={`relative overflow-hidden rounded-lg bg-black border border-border ${formato === "POST" ? "aspect-square w-full" : "aspect-[9/16] w-40 mx-auto"}`}>
            {renderUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img key={renderUrl} src={renderUrl} className="w-full h-full object-contain" alt="arte gerada" />
                <button
                  type="button"
                  onClick={() => { setRenderUrl(null); gerarArte(); }}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-black/80"
                  title="Regenerar"
                >
                  <RefreshCw className="size-3" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/30">
                <Sparkles className="size-6" />
                <span className="text-xs text-center px-4">Preencha os campos e clique em Gerar Arte</span>
              </div>
            )}
          </div>

          {/* Legenda */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Legenda para o post</Label>
              <button
                type="button"
                disabled={gerandoLegenda}
                onClick={gerarLegendaIA}
                className="flex items-center gap-1 text-xs text-purple-600 hover:underline"
              >
                {gerandoLegenda ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                Gerar com IA
              </button>
            </div>
            <Textarea
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              rows={4}
              placeholder="Legenda do post com emojis e hashtags..."
              className="text-xs"
            />
          </div>

          <Button
            type="button"
            disabled={!renderUrl || aplicando}
            onClick={aplicarArte}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-90 text-white"
          >
            {aplicando ? <Loader2 className="mr-2 size-4 animate-spin" /> : "✓ Usar esta arte & Publicar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
