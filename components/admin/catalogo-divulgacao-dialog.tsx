"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Send, Plus, Trash2, Loader2, ImagePlus, CheckCheck, Sparkles, ExternalLink, Camera } from "lucide-react";

function IgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}
// Embaralha o nome do fornecedor de forma determinística (mesmo nome → mesmo
// resultado) pra não expor a marca de origem no grupo, mantendo um "codinome"
// estável. Privacidade do fornecedor (regra do projeto).
function embaralharNome(nome: string): string {
  const limpo = nome.replace(/\s+/g, "").toUpperCase();
  if (limpo.length <= 1) return limpo || "XX";
  // Seed determinística a partir dos char codes
  let seed = 0;
  for (const c of limpo) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const letras = limpo.split("");
  for (let i = letras.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [letras[i], letras[j]] = [letras[j], letras[i]];
  }
  const s = letras.join("");
  // Capitaliza só a 1ª letra pra parecer um codinome (ex: "Nemimin")
  return s.charAt(0) + s.slice(1).toLowerCase();
}

// Reduz a imagem da página (PNG grande do render) pra um JPEG leve antes de
// enviar — o limite de body da Vercel é ~4,5MB e o PNG estoura (erro 413
// "Request Entity Too Large"). WhatsApp reconverte no envio, então JPEG basta.
async function comprimirParaEnvio(blob: Blob, maxLargura = 1080, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const escala = Math.min(1, maxLargura / bitmap.width);
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b ?? blob), "image/jpeg", quality);
  });
}

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GrupoWhatsappSelect } from "@/components/admin/grupo-whatsapp-select";
import { PdfPageViewer, type PdfViewerRef } from "@/components/admin/pdf-page-viewer";
import { Badge } from "@/components/ui/badge";

type Catalogo = { id: string; nome: string; arquivoUrl: string };
type GrupoWhatsapp = { categoria: string; grupoId: string; grupoNome: string; linkConvite?: string; };
type StatusInstagram = { conectado: boolean; username?: string; expiry?: string } | null;
type IgFormato = "POST" | "STORY" | "REELS";

async function prepararParaInstagram(blob: Blob, formato: IgFormato): Promise<Blob> {
  const isVertical = formato === "STORY" || formato === "REELS";
  const canvasW = 1080, canvasH = isVertical ? 1920 : 1080;
  const img = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = canvasW; canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasW, canvasH);
  const scale = Math.min(canvasW / img.width, canvasH / img.height);
  ctx.drawImage(img, (canvasW - img.width * scale) / 2, (canvasH - img.height * scale) / 2, img.width * scale, img.height * scale);
  return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92));
}

export function CatalogoDivulgacaoDialog({
  catalogoId,
  nome,
  fornecedorNome,
}: {
  catalogoId: string;
  nome: string;
  fornecedorNome: string;
}) {
  const [open, setOpen] = useState(false);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [grupos, setGrupos] = useState<GrupoWhatsapp[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [salvando, setSalvando] = useState(false);

  // WhatsApp state
  const [paginasSelecionadas, setPaginasSelecionadas] = useState<number[]>([]);
  const [grupoAvisosId, setGrupoAvisosId] = useState<string>("none");
  const [grupoPedidosId, setGrupoPedidosId] = useState<string>("none");
  const [legendaBase, setLegendaBase] = useState(`📦 *Novo Catálogo Disponível!*\n\nFornecedor: *${fornecedorNome}*\n\nConfira as páginas a seguir.`);

  // Instagram state
  const [igStatus, setIgStatus] = useState<StatusInstagram>(null);
  const [igFormato, setIgFormato] = useState<IgFormato>("POST");
  const [igLegenda, setIgLegenda] = useState("");
  const [igHashtags, setIgHashtags] = useState("");
  const [igGerando, setIgGerando] = useState(false);
  const [igPublicando, setIgPublicando] = useState(false);
  const [igTokenManual, setIgTokenManual] = useState("");
  const [igSalvandoToken, setIgSalvandoToken] = useState(false);

  const pdfViewerRef = useRef<PdfViewerRef>(null);

  async function carregar() {
    const [resCatalogo, resGrupos, resIg] = await Promise.all([
      fetch(`/api/admin/atacado/catalogos/${catalogoId}`),
      fetch(`/api/admin/atacado/whatsapp/grupos`),
      fetch(`/api/instagram/status`),
    ]);

    const jsonCat = await resCatalogo.json();
    if (resCatalogo.ok) setCatalogo(jsonCat.data);

    const jsonGrupos = await resGrupos.json();
    if (resGrupos.ok && jsonGrupos.data?.vinculos) {
      // Mostra todos os grupos configurados no WhatsApp, não apenas algumas categorias.
      const unicos = Array.from(new Map(jsonGrupos.data.vinculos.map((v: any) => [v.grupoId, v])).values()) as GrupoWhatsapp[];
      setGrupos(unicos);
      const grupoAvisos = unicos.find(g => g.categoria === "AVISOS_COMUNIDADE")?.grupoId || "none";
      const grupoPedidos = unicos.find(g => g.categoria === "SOLICITACOES")?.grupoId || "none";
      setGrupoAvisosId(grupoAvisos);
      setGrupoPedidosId(grupoPedidos);
    }

    const jsonIg = await resIg.json();
    if (resIg.ok) setIgStatus(jsonIg.data);
  }

  useEffect(() => {
    if (open) {
      carregar();
      setPaginasSelecionadas([]);
    }
  }, [open]);

  function adicionarPaginaAtual() {
    if (!paginasSelecionadas.includes(pagina)) {
      setPaginasSelecionadas([...paginasSelecionadas, pagina].sort((a, b) => a - b));
    } else {
      toast.info(`A página ${pagina} já está na lista.`);
    }
  }

  function removerPagina(p: number) {
    setPaginasSelecionadas(paginasSelecionadas.filter((x) => x !== p));
  }

  function selecionarTodasPaginas() {
    if (totalPaginas === 0) return;
    setPaginasSelecionadas(Array.from({ length: totalPaginas }, (_, i) => i + 1));
  }

  async function handleEnviarWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    if (paginasSelecionadas.length === 0) {
      toast.error("Adicione pelo menos uma página para enviar.");
      return;
    }
    if (grupoAvisosId === "none" && grupoPedidosId === "none") {
      toast.error("Selecione pelo menos um grupo de WhatsApp destino.");
      return;
    }

    setSalvando(true);
    let successCount = 0;

    try {
      for (let i = 0; i < paginasSelecionadas.length; i++) {
        const p = paginasSelecionadas[i];
        toast.loading(`Extraindo página ${p}... (${i + 1}/${paginasSelecionadas.length})`, { id: "divulgacao" });

        const rawBlob = await pdfViewerRef.current!.extrairPagina(p);
        const blob = await comprimirParaEnvio(rawBlob);

        toast.loading(`Enviando página ${p}...`, { id: "divulgacao" });
        const formData = new FormData();
        formData.append("imagem", await comprimirParaEnvio(blob), "pagina.jpg");
        formData.append("grupoAvisosId", grupoAvisosId === "none" ? "" : grupoAvisosId);
        formData.append("grupoPedidosId", grupoPedidosId === "none" ? "" : grupoPedidosId);
        
        if (i === 0) {
          const link = grupos.find(g => g.grupoId === grupoPedidosId)?.linkConvite || "";
          formData.append("legenda", legendaBase);
          formData.append("linkPedidos", link);
        }

        const res = await fetch("/api/admin/atacado/whatsapp/divulgar-pagina", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          // Erro pode não ser JSON (ex: 413 "Request Entity Too Large" em texto puro)
          const txt = await res.text();
          let msg = `Erro ao enviar página ${p}`;
          try { msg = JSON.parse(txt).error?.message || msg; } catch { if (txt) msg = txt.slice(0, 120); }
          throw new Error(msg);
        }
        successCount++;
      }

      toast.success(`${successCount} página(s) enviada(s) com sucesso!`, { id: "divulgacao" });
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar páginas", { id: "divulgacao" });
    } finally {
      setSalvando(false);
    }
  }

  async function handleGerarConteudoIG() {
    setIgGerando(true);
    try {
      const res = await fetch("/api/instagram/gerar-conteudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao: null, categoria: null, marca: null }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao gerar conteúdo");
        return;
      }
      const d = json.data;
      setIgLegenda(igFormato !== "POST" ? d.legendaStory : `${d.legendaPost}\n\n${d.hashtags}`);
      setIgHashtags(d.hashtags);
      toast.success("Conteúdo gerado pela IA");
    } catch {
      toast.error("Falha ao gerar conteúdo");
    } finally {
      setIgGerando(false);
    }
  }

  async function handlePublicarInstagram(e: React.FormEvent) {
    e.preventDefault();
    if (!igStatus?.conectado) {
      toast.error("Conecte o Instagram primeiro");
      return;
    }

    const paginas = paginasSelecionadas.length > 0 ? paginasSelecionadas : [pagina];
    const isCarrossel = paginas.length > 1;
    // Instagram limita carrossel a 10 slides
    const paginasParaPublicar = paginas.slice(0, 10);
    if (paginas.length > 10) {
      toast.warning(`Instagram suporta até 10 slides por carrossel. Serão publicadas as primeiras 10 de ${paginas.length} páginas.`);
    }

    setIgPublicando(true);
    toast.loading(isCarrossel ? `Extraindo ${paginasParaPublicar.length} páginas...` : `Extraindo página ${pagina}...`, { id: "ig-pub" });

    try {
      if (isCarrossel && igFormato === "STORY") {
        // Stories múltiplos: publica cada página como Story individual
        for (let i = 0; i < paginasParaPublicar.length; i++) {
          const p = paginasParaPublicar[i];
          toast.loading(`Publicando Story ${i + 1}/${paginasParaPublicar.length} (pág. ${p})...`, { id: "ig-pub" });
          const raw = await pdfViewerRef.current!.extrairPagina(p);
          const blob = await prepararParaInstagram(raw, "STORY");
          const formData = new FormData();
          formData.append("imagem", blob, `story_${p}.jpg`);
          formData.append("caption", "");
          formData.append("formato", "STORY");
          const res = await fetch("/api/instagram/publicar", { method: "POST", body: formData });
          const json = await res.json();
          if (!res.ok) throw new Error(`Story ${i + 1} falhou: ${json.error?.message}`);
          // Pequena pausa entre stories para não sobrecarregar a API
          if (i < paginasParaPublicar.length - 1) await new Promise((r) => setTimeout(r, 1500));
        }
        toast.success(`${paginasParaPublicar.length} Stories publicados no Instagram!`, { id: "ig-pub" });
      } else if (isCarrossel) {
        // Carrossel (POST)
        const blobs = await Promise.all(
          paginasParaPublicar.map(async (p) => {
            const raw = await pdfViewerRef.current!.extrairPagina(p);
            return prepararParaInstagram(raw, "POST");
          })
        );
        toast.loading("Enviando carrossel...", { id: "ig-pub" });
        const formData = new FormData();
        formData.append("caption", igLegenda);
        blobs.forEach((b, i) => formData.append("imagens", b, `slide_${i + 1}.jpg`));
        const res = await fetch("/api/instagram/publicar-carrossel", { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Erro ao publicar carrossel");
        toast.success(`Carrossel com ${paginasParaPublicar.length} slides publicado no Instagram!`, { id: "ig-pub" });
      } else {
        const rawBlob = await pdfViewerRef.current!.extrairPagina(pagina);
        toast.loading("Preparando imagem...", { id: "ig-pub" });
        const blob = await prepararParaInstagram(rawBlob, igFormato);
        toast.loading("Publicando no Instagram...", { id: "ig-pub" });
        const formData = new FormData();
        formData.append("imagem", blob, `pagina_${pagina}.jpg`);
        formData.append("caption", igLegenda);
        formData.append("formato", igFormato);
        const res = await fetch("/api/instagram/publicar", { method: "POST", body: formData });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message ?? "Erro ao publicar");
        toast.success(`Publicado no Instagram! (${igFormato})`, { id: "ig-pub" });
      }
    } catch (err: any) {
      toast.error(err.message || "Falha ao publicar", { id: "ig-pub" });
    } finally {
      setIgPublicando(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className="w-full">
        <ImagePlus className="mr-2 size-4" />
        Disparar Páginas
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[95vw] sm:max-w-[95vw] xl:max-w-7xl h-[95vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="shrink-0 mb-2">
            <DialogTitle>Divulgar Catálogo: {nome}</DialogTitle>
          </DialogHeader>

          {!catalogo ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-6 overflow-hidden">
              {/* Esquerda: Visualizador de PDF */}
              <div className="flex-1 min-w-0 flex flex-col bg-muted/30 rounded-lg p-2 md:w-2/3 h-full overflow-hidden">
                <div className="flex items-center justify-between mb-2 px-2 shrink-0">
                  <span className="text-sm font-medium">Visualizador</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selecionarTodasPaginas} disabled={totalPaginas === 0}>
                      <CheckCheck className="mr-2 size-4" />
                      Selecionar todas ({totalPaginas || "..."})
                    </Button>
                    <Button variant="default" size="sm" onClick={adicionarPaginaAtual}>
                      <Plus className="mr-2 size-4" />
                      Selecionar Pág. {pagina}
                    </Button>
                  </div>
                </div>
                <div className="flex-1 min-h-0 relative">
                  <PdfPageViewer
                    ref={pdfViewerRef}
                    url={catalogo.arquivoUrl}
                    pagina={pagina}
                    onPaginaChange={setPagina}
                    onTotalPaginas={setTotalPaginas}
                  />
                </div>
              </div>

              {/* Direita: Ações */}
              <div className="flex-shrink-0 w-full md:w-[350px] lg:w-[400px] flex flex-col overflow-y-auto">
                <Tabs defaultValue="whatsapp" className="flex flex-col flex-1">
                  <TabsList className="shrink-0 w-full mb-3">
                    <TabsTrigger value="whatsapp" className="flex-1">
                      WhatsApp
                    </TabsTrigger>

                  </TabsList>

                  {/* ── WhatsApp ── */}
                  <TabsContent value="whatsapp">
                    <form onSubmit={handleEnviarWhatsApp} className="flex flex-col gap-6">
                      <div className="flex flex-col gap-2 p-3 bg-secondary/20 border border-border rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="font-semibold">Páginas Selecionadas ({paginasSelecionadas.length})</Label>
                          {paginasSelecionadas.length > 0 ? (
                            <button type="button" onClick={() => setPaginasSelecionadas([])} className="text-xs text-destructive hover:underline">
                              limpar
                            </button>
                          ) : null}
                        </div>
                        {paginasSelecionadas.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Nenhuma página adicionada.</span>
                        ) : (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {paginasSelecionadas.map((p) => (
                              <Badge key={p} variant="default" className="gap-1 px-2 py-1 flex items-center">
                                Pág. {p}
                                <button type="button" onClick={() => removerPagina(p)} className="hover:bg-primary-foreground/20 rounded-full p-0.5 ml-1">
                                  <Trash2 className="size-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                          <GrupoWhatsappSelect
                            label="Grupo de Divulgação (Avisos)"
                            value={grupoAvisosId}
                            onChange={(val) => setGrupoAvisosId(val)}
                            grupos={grupos}
                          />
                          <GrupoWhatsappSelect
                            label="Grupo de Pedidos (Extrai Link)"
                            value={grupoPedidosId}
                            onChange={(val) => setGrupoPedidosId(val)}
                            grupos={grupos}
                          />
                        </div>

                        <div className="flex flex-col gap-2 relative mt-2">
                          <Label>Legenda Base (Apenas na 1ª Imagem)</Label>
                          <Textarea
                            value={legendaBase}
                            onChange={(e) => setLegendaBase(e.target.value)}
                            rows={6}
                            className="text-xs font-mono"
                            placeholder="Escreva a mensagem..."
                          />
                          <div className="text-[10px] text-muted-foreground italic px-1">
                            * O link do grupo de pedidos será anexado automaticamente no final dessa mensagem apenas para o Grupo de Divulgação.
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={salvando || paginasSelecionadas.length === 0 || (grupoAvisosId === "none" && grupoPedidosId === "none")}
                          className="w-full h-12 mt-4 text-base"
                        >
                          {salvando ? (
                            <>
                              <Loader2 className="mr-2 size-5 animate-spin" />
                              Disparando...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 size-5" />
                              Disparar {paginasSelecionadas.length} Página{paginasSelecionadas.length !== 1 ? "s" : ""}
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>


                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
