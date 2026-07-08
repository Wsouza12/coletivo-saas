"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Upload, Send, X, Megaphone, Save, Trash2, FileText, Image as ImageIcon, Copy, Users, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InstagramArtePanel } from "@/components/admin/instagram-arte-panel";

type Vinculo = { categoria: string; grupoId: string; grupoNome: string };
type Modelo = { id: string; titulo: string; texto: string };
type GrupoComunidade = { id: string; nome: string; linkConvite: string | null };
type IgFormato = "POST" | "STORY" | "REELS";

function IgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

async function prepararParaInstagram(blob: Blob, formato: IgFormato): Promise<Blob> {
  const isVertical = formato !== "POST";
  const canvasW = 1080, canvasH = isVertical ? 1920 : 1080;
  const img = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = canvasW; canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasW, canvasH);
  const scale = Math.min(canvasW / img.width, canvasH / img.height);
  ctx.drawImage(img, (canvasW - img.width * scale) / 2, (canvasH - img.height * scale) / 2, img.width * scale, img.height * scale);
  return new Promise<Blob>((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.92));
}

export function AvisosComposer() {
  const [grupos, setGrupos] = useState<Vinculo[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [gerandoPrompt, setGerandoPrompt] = useState(false);
  const [promptImagem, setPromptImagem] = useState<string | null>(null);
  const [painelGruposAberto, setPainelGruposAberto] = useState(false);
  const [carregandoGrupos, setCarregandoGrupos] = useState(false);
  const [gruposComunidade, setGruposComunidade] = useState<GrupoComunidade[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const igInputRef = useRef<HTMLInputElement>(null);

  // Instagram
  const [igConectado, setIgConectado] = useState(false);
  const [igUsername, setIgUsername] = useState("");
  const [igFormato, setIgFormato] = useState<IgFormato>("POST");
  const [igLegenda, setIgLegenda] = useState("");
  const [igArquivo, setIgArquivo] = useState<File | null>(null);
  const [igPreviewUrl, setIgPreviewUrl] = useState<string | null>(null);
  const [igGerando, setIgGerando] = useState(false);
  const [igPublicando, setIgPublicando] = useState(false);

  useEffect(() => {
    fetch("/api/instagram/status").then(r => r.json()).then(j => {
      if (j.data?.conectado) { setIgConectado(true); setIgUsername(j.data.username ?? ""); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!igArquivo) { setIgPreviewUrl(null); return; }
    const url = URL.createObjectURL(igArquivo);
    setIgPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [igArquivo]);

  async function carregarModelos() {
    const res = await fetch("/api/admin/atacado/whatsapp/aviso/modelos", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setModelos(json.data);
  }

  useEffect(() => {
    carregarModelos();
  }, []);

  async function salvarModelo() {
    if (!texto.trim()) {
      toast.error("Escreva o texto antes de salvar como modelo");
      return;
    }
    const titulo = window.prompt("Nome do modelo (ex: 'Caixa nova', 'Bom dia'):");
    if (!titulo?.trim()) return;
    const res = await fetch("/api/admin/atacado/whatsapp/aviso/modelos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: titulo.trim(), texto }),
    });
    if (!res.ok) {
      toast.error("Erro ao salvar modelo");
      return;
    }
    toast.success("Modelo salvo");
    carregarModelos();
  }

  async function excluirModelo(id: string) {
    const res = await fetch(`/api/admin/atacado/whatsapp/aviso/modelos?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Erro ao excluir modelo");
      return;
    }
    carregarModelos();
  }

  useEffect(() => {
    fetch("/api/admin/atacado/whatsapp/grupos", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        const vs: Vinculo[] = (j.data?.vinculos ?? []).filter(
          (v: Vinculo) => v.categoria === "AVISOS_COMUNIDADE" || v.categoria === "SOLICITACOES"
        );
        setGrupos(vs);
        // Avisos da Comunidade já vem marcado por padrão.
        const aviso = vs.find((v) => v.categoria === "AVISOS_COMUNIDADE");
        if (aviso) setSelecionados([aviso.grupoId]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!arquivo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(arquivo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  async function gerarComIa() {
    if (!texto.trim()) {
      toast.error("Escreva a ideia do aviso primeiro (ex: 'chegou caixa nova de fones')");
      return;
    }
    setGerando(true);
    try {
      const res = await fetch("/api/admin/atacado/whatsapp/aviso/gerar-texto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideia: texto }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao gerar texto");
        return;
      }
      setTexto(json.data.texto);
      toast.success("Texto gerado — ajuste se quiser");
    } finally {
      setGerando(false);
    }
  }

  async function enviar() {
    if (selecionados.length === 0) {
      toast.error("Selecione ao menos um grupo");
      return;
    }
    if (!texto.trim() && !arquivo) {
      toast.error("Escreva um texto ou anexe uma mídia");
      return;
    }
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("texto", texto);
      formData.append("grupoJids", JSON.stringify(selecionados));
      if (arquivo) formData.append("media", arquivo);

      const res = await fetch("/api/admin/atacado/whatsapp/aviso", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao enviar aviso");
        return;
      }
      const { enviados, falhas } = json.data;
      toast.success(falhas > 0 ? `Enviado em ${enviados} grupo(s), ${falhas} falhou(aram)` : `Aviso enviado em ${enviados} grupo(s)!`);
      setTexto("");
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setEnviando(false);
    }
  }

  async function gerarPromptImagem() {
    if (!texto.trim()) {
      toast.error("Escreva a ideia/texto do aviso primeiro");
      return;
    }
    setGerandoPrompt(true);
    try {
      const res = await fetch("/api/admin/atacado/whatsapp/aviso/gerar-prompt-imagem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideia: texto }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao gerar prompt");
        return;
      }
      setPromptImagem(json.data.prompt);
      toast.success("Prompt gerado (em inglês — funciona melhor nos geradores de imagem)");
    } finally {
      setGerandoPrompt(false);
    }
  }

  function copiarPrompt() {
    if (!promptImagem) return;
    navigator.clipboard.writeText(promptImagem);
    toast.success("Prompt copiado");
  }

  async function abrirPainelGrupos() {
    setPainelGruposAberto((atual) => !atual);
    if (gruposComunidade !== null) return;
    setCarregandoGrupos(true);
    try {
      const res = await fetch("/api/admin/atacado/whatsapp/grupos-comunidade", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao buscar grupos");
        setGruposComunidade([]);
        return;
      }
      setGruposComunidade(json.data);
    } catch {
      toast.error("Erro ao buscar grupos da comunidade");
      setGruposComunidade([]);
    } finally {
      setCarregandoGrupos(false);
    }
  }

  function copiarLinkGrupo(link: string) {
    navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  }

  function toggleGrupo(grupoId: string) {
    setSelecionados((atual) =>
      atual.includes(grupoId) ? atual.filter((g) => g !== grupoId) : [...atual, grupoId]
    );
  }

  const ehVideo = arquivo?.type.startsWith("video/");

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Composer */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div>
          <Label>Grupos de destino</Label>
          <div className="mt-1.5 flex flex-col gap-1.5">
            {grupos.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum grupo configurado (Avisos/Solicitações).</p>
            ) : (
              grupos.map((g) => (
                <label key={g.grupoId} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selecionados.includes(g.grupoId)}
                    onChange={() => toggleGrupo(g.grupoId)}
                    className="size-4"
                  />
                  {g.grupoNome}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({g.categoria === "AVISOS_COMUNIDADE" ? "Avisos" : "Pedidos"})
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div>
          {/* Modelos salvos (mensagens pré-definidas) */}
          {modelos.length > 0 ? (
            <div className="mb-2 flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <FileText className="size-3" /> Modelos salvos (clique pra usar)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {modelos.map((m) => (
                  <span key={m.id} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    <button type="button" onClick={() => setTexto(m.texto)} className="font-medium text-foreground hover:text-primary" title={m.texto}>
                      {m.titulo}
                    </button>
                    <button type="button" onClick={() => excluirModelo(m.id)} title="Excluir modelo">
                      <Trash2 className="size-3 text-destructive" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between">
            <Label>Mensagem</Label>
            <div className="flex items-center gap-1.5">
              <Button type="button" size="sm" variant="ghost" className="h-7" onClick={salvarModelo}>
                <Save className="size-3.5" />
                Salvar modelo
              </Button>
              <Button type="button" size="sm" variant="outline" className="h-7" disabled={gerando} onClick={gerarComIa}>
                <Sparkles className={`size-3.5 ${gerando ? "animate-pulse" : ""}`} />
                {gerando ? "Gerando..." : "IA"}
              </Button>
            </div>
          </div>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={7}
            placeholder="Escreva o aviso, ou digite a ideia e clique em 'Escrever com IA'..."
            className="mt-1.5 w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <Label>Imagem, print ou vídeo (opcional)</Label>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
          <div className="mt-1.5 flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
              <Upload className="size-3.5" />
              {arquivo ? "Trocar arquivo" : "Anexar mídia"}
            </Button>
            {arquivo ? (
              <button type="button" onClick={() => setArquivo(null)} className="text-xs text-destructive">
                <X className="inline size-3" /> remover
              </button>
            ) : null}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">Vídeo até ~50MB.</p>
        </div>

        <div>
          <Button type="button" size="sm" variant="outline" disabled={gerandoPrompt} onClick={gerarPromptImagem}>
            <ImageIcon className={`size-3.5 ${gerandoPrompt ? "animate-pulse" : ""}`} />
            {gerandoPrompt ? "Gerando prompt..." : "Gerar prompt de imagem (IA)"}
          </Button>
          {promptImagem ? (
            <div className="mt-2 rounded-lg border border-border bg-muted/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Prompt em inglês — cole num gerador de imagem (Midjourney, DALL-E, etc) e anexe o resultado acima
                </span>
                <button type="button" onClick={copiarPrompt} title="Copiar prompt" className="shrink-0">
                  <Copy className="size-3.5 text-muted-foreground hover:text-primary" />
                </button>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-foreground">{promptImagem}</p>
            </div>
          ) : null}
        </div>

        <Button onClick={enviar} disabled={enviando || selecionados.length === 0}>
          <Send className="size-4" />
          {enviando ? "Enviando..." : "Enviar aviso"}
        </Button>

        <div className="rounded-lg border border-border">
          <button
            type="button"
            onClick={abrirPainelGrupos}
            className="flex w-full items-center justify-between gap-2 p-2.5 text-sm font-medium"
          >
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              Grupos da comunidade (links rápidos)
            </span>
            {painelGruposAberto ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>
          {painelGruposAberto ? (
            <div className="flex flex-col gap-1.5 border-t border-border p-2.5">
              {carregandoGrupos ? (
                <p className="text-xs text-muted-foreground">Carregando grupos...</p>
              ) : !gruposComunidade || gruposComunidade.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum grupo de comunidade encontrado.</p>
              ) : (
                gruposComunidade.map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{g.nome}</span>
                    {g.linkConvite ? (
                      <button
                        type="button"
                        onClick={() => copiarLinkGrupo(g.linkConvite!)}
                        className="flex shrink-0 items-center gap-1 text-primary hover:underline"
                      >
                        <Copy className="size-3" /> copiar link
                      </button>
                    ) : (
                      <span className="shrink-0 text-muted-foreground">sem link</span>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Preview WhatsApp */}
      <div className="flex flex-col gap-2">
        <Label>Pré-visualização</Label>
        <div className="rounded-xl border border-border bg-[#e5ddd5] p-4">
          <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-none bg-[#dcf8c6] p-2 shadow-sm">
            {previewUrl ? (
              ehVideo ? (
                <video src={previewUrl} controls className="mb-1.5 w-full rounded-md" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="prévia" className="mb-1.5 w-full rounded-md" />
              )
            ) : null}
            <p className="whitespace-pre-wrap text-sm text-[#111b21]">
              {texto || <span className="text-muted-foreground">Sua mensagem aparece aqui...</span>}
            </p>
          </div>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Megaphone className="size-3.5" />
          O aviso é postado pelo número da Evolution (admin da comunidade).
        </p>
      </div>
      </div>


    </div>
  );
}
