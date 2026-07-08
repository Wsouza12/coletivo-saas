"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Send, Upload, Wand2, Plus, Sparkles, Loader2 } from "lucide-react";

function IgIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { PdfPageViewer, type PdfViewerRef } from "@/components/admin/pdf-page-viewer";

type Catalogo = { id: string; nome: string; arquivoUrl: string };
type GrupoWhatsapp = { categoria: string; grupoId: string; grupoNome: string; linkConvite?: string | null };
type IgFormato = "POST" | "STORY" | "REELS";

// Redimensiona blob para proporção correta do Instagram (fundo preto)
async function prepararParaInstagram(blob: Blob, formato: IgFormato): Promise<Blob> {
  const isVertical = formato === "STORY" || formato === "REELS";
  const canvasW = isVertical ? 1080 : 1080;
  const canvasH = isVertical ? 1920 : 1080;

  const img = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvasW, canvasH);

  const scale = Math.min(canvasW / img.width, canvasH / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (canvasW - dw) / 2, (canvasH - dh) / 2, dw, dh);

  return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92));
}

export function CatalogoBroadcasterDialog({
  catalogoId,
  nome,
  fornecedorId,
}: {
  catalogoId: string;
  nome: string;
  fornecedorId: string;
}) {
  const [open, setOpen] = useState(false);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [grupos, setGrupos] = useState<GrupoWhatsapp[]>([]);
  const [pagina, setPagina] = useState(1);
  const [lendoIa, setLendoIa] = useState(false);
  const [salvando, setSalvando] = useState(false);
  
  const [fotoBlob, setFotoBlob] = useState<Blob | null>(null);
  const [fotoUrlPreview, setFotoUrlPreview] = useState<string | null>(null);
  
  // Formulário
  const [nomeProduto, setNomeProduto] = useState("");
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidadesPorCaixa, setUnidadesPorCaixa] = useState("");
  const [pedidoMinimo, setPedidoMinimo] = useState("");
  const [precoUnitario, setPrecoUnitario] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [comprimentoCm, setComprimentoCm] = useState("");
  const [larguraCm, setLarguraCm] = useState("");
  const [alturaCm, setAlturaCm] = useState("");
  const [sugerindoMedidas, setSugerindoMedidas] = useState(false);

  const [gruposSelecionados, setGruposSelecionados] = useState<string[]>([]);
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState("");

  // Instagram
  const [igConectado, setIgConectado] = useState(false);
  const [igUsername, setIgUsername] = useState("");
  const [igLegenda, setIgLegenda] = useState("");
  const [igFormato, setIgFormato] = useState<IgFormato>("POST");
  const [igFonte, setIgFonte] = useState<"recorte" | "pagina">("recorte");
  const [igPreviewUrl, setIgPreviewUrl] = useState<string | null>(null);
  const [igArquivo, setIgArquivo] = useState<File | null>(null);
  const [igGerando, setIgGerando] = useState(false);
  const [igPublicando, setIgPublicando] = useState(false);

  const pdfViewerRef = useRef<PdfViewerRef>(null);

  async function sugerirMedidas() {
    if (!nomeProduto.trim()) {
      toast.error("Preencha o nome antes de pedir a sugestão");
      return;
    }
    setSugerindoMedidas(true);
    try {
      const res = await fetch("/api/admin/atacado/produtos/sugerir-peso-dimensoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nomeProduto, categoria: categoria || undefined }),
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

  async function carregar() {
    const res = await fetch(`/api/admin/atacado/catalogos/${catalogoId}`);
    const json = await res.json();
    if (res.ok) setCatalogo(json.data);

    const resIg = await fetch("/api/instagram/status");
    const jsonIg = await resIg.json();
    if (resIg.ok && jsonIg.data?.conectado) {
      setIgConectado(true);
      setIgUsername(jsonIg.data.username ?? "");
    }
    
    // Buscar grupos que aceitam solicitação
    const resGrupos = await fetch(`/api/admin/atacado/whatsapp/grupos`);
    const jsonGrupos = await resGrupos.json();
    if (resGrupos.ok && jsonGrupos.data?.vinculos) {
      const destinos = jsonGrupos.data.vinculos.filter(
        (v: any) => v.categoria === "SOLICITACOES" || v.categoria === "AVISOS_COMUNIDADE"
      );
      setGrupos(destinos);
      // Já marca todos os grupos de destino por padrão — o disparo normalmente vai
      // pros dois (Pedidos + Avisos da Comunidade). Admin pode desmarcar se quiser.
      setGruposSelecionados(destinos.map((v: { grupoId: string }) => v.grupoId));
    }
  }

  useEffect(() => {
    if (open) carregar();
  }, [open]);

  // Limpa a URL local pra não vazar memória
  useEffect(() => {
    if (fotoBlob) {
      const url = URL.createObjectURL(fotoBlob);
      setFotoUrlPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [fotoBlob]);

  // Atualiza preview do Instagram quando muda fonte/recorte
  useEffect(() => {
    if (igFonte === "recorte" && fotoUrlPreview) {
      setIgPreviewUrl(fotoUrlPreview);
    }
  }, [fotoBlob, igFonte, fotoUrlPreview]);

  function limparParaProximoProduto() {
    setFotoBlob(null);
    setFotoUrlPreview(null);
    setNomeProduto("");
    setCodigo("");
    setCategoria("");
    setPrecoUnitario("");
    setUnidadesPorCaixa("");
    setPedidoMinimo("");
    setPesoKg("");
    setComprimentoCm("");
    setLarguraCm("");
    setAlturaCm("");
    setIgLegenda("");
    setIgArquivo(null);
    setIgPreviewUrl(null);
    setMensagemPersonalizada("");
  }

  async function handleRecorteIa(blob: Blob) {
    setFotoBlob(blob);
    setLendoIa(true);
    try {
      const formData = new FormData();
      formData.append("imagem", blob, "recorte.jpg");
      const res = await fetch("/api/admin/atacado/catalogos/extrair-dados", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "A IA não conseguiu ler");
        return;
      }
      const d = json.data;
      if (d.nome) setNomeProduto(d.nome);
      if (d.codigo) setCodigo(d.codigo);
      if (d.categoria) setCategoria(d.categoria);
      if (d.preco) setPrecoUnitario(d.preco.toString());
      if (d.unidadesPorCaixa) setUnidadesPorCaixa(d.unidadesPorCaixa.toString());
      if (typeof d.pesoKg === "number") setPesoKg(String(d.pesoKg));
      if (typeof d.comprimentoCm === "number") setComprimentoCm(String(d.comprimentoCm));
      if (typeof d.larguraCm === "number") setLarguraCm(String(d.larguraCm));
      if (typeof d.alturaCm === "number") setAlturaCm(String(d.alturaCm));
      toast.success("Dados lidos com sucesso!");
    } catch (err) {
      toast.error("Erro ao ler com IA");
    } finally {
      setLendoIa(false);
    }
  }

  // Gera a mensagem base (com o código). O link do grupo de Pedidos é adicionado
  // automaticamente no servidor SÓ pra mensagem que vai pro Avisos da Comunidade
  // (no grupo de Pedidos a pessoa já está lá, não precisa do link).
  useEffect(() => {
    if (!nomeProduto && !codigo && !precoUnitario) return;
    const txt = `📦 *${nomeProduto || "Novo Produto"}*

💰 Preço Unidade: R$ ${precoUnitario || "---"}
📦 Caixa com: ${unidadesPorCaixa || "---"} und.
🛒 Pedido Mínimo: ${pedidoMinimo || "1 caixa"}

🔥 Para abrir a caixa deste produto, envie o código:
*${codigo || "CÓDIGO"}*`;
    setMensagemPersonalizada(txt);
  }, [nomeProduto, codigo, precoUnitario, unidadesPorCaixa, pedidoMinimo]);

  async function handleEnviarWhatsApp(e: React.FormEvent) {
    e.preventDefault();
    if (!fotoBlob) {
      toast.error("Recorte uma imagem do PDF primeiro!");
      return;
    }
    if (gruposSelecionados.length === 0) {
      toast.error("Selecione pelo menos um grupo de WhatsApp destino");
      return;
    }
    
    setSalvando(true);
    try {
      // 1. Faz upload da imagem (reaproveitando a rota de fornecedor para simplicidade, ou enviando base64 pro Broadcaster)
      // Como o broadcaster vai precisar salvar o Produto Rascunho de qualquer jeito, 
      // vou mandar o File via FormData.
      const formData = new FormData();
      formData.append("imagem", fotoBlob, "recorte.jpg");
      formData.append("fornecedorId", fornecedorId);
      formData.append("catalogoId", catalogoId);
      formData.append("grupoJids", JSON.stringify(gruposSelecionados));
      formData.append("texto", mensagemPersonalizada);
      formData.append("dados", JSON.stringify({
        nome: nomeProduto,
        codigo,
        categoria: categoria || "Outros",
        precoUnitario: precoUnitario ? Number(String(precoUnitario).replace(",", ".").replace(/[^0-9.]/g, "")) || 0 : 0,
        unidadesPorCaixa: unidadesPorCaixa ? Number(String(unidadesPorCaixa).replace(/[^0-9]/g, "")) || 1 : 1,
        pesoKg: Number(pesoKg),
        comprimentoCm: Number(comprimentoCm),
        larguraCm: Number(larguraCm),
        alturaCm: Number(alturaCm),
      }));

      const res = await fetch("/api/admin/atacado/whatsapp/broadcaster", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao enviar mensagem");
        return;
      }
      
      toast.success("Enviado com sucesso e salvo como rascunho!");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro inesperado");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="w-full text-xs truncate">
        <Send className="size-3.5 mr-1.5 text-primary shrink-0" />
        <span className="truncate">Extrair & Enviar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-6xl h-[95vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 border-b shrink-0">
            <DialogTitle>Envio Direto: {nome}</DialogTitle>
          </DialogHeader>

          {catalogo ? (
            <div className="flex-1 flex overflow-hidden">
              {/* Esquerda: PDF */}
              <div className="w-[60%] flex flex-col border-r bg-muted/20">
                <PdfPageViewer
                  ref={pdfViewerRef}
                  url={catalogo.arquivoUrl}
                  pagina={pagina}
                  onPaginaChange={setPagina}
                  selecionando={true}
                  onRecorte={handleRecorteIa}
                />
              </div>

              {/* Direita: Formulário & Preview WhatsApp */}
              <div className="w-[40%] flex flex-col bg-card overflow-y-auto">
                <form onSubmit={handleEnviarWhatsApp} className="p-6 flex flex-col gap-5">
                  <div className="flex items-center justify-between border-b pb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Wand2 className="size-4 text-primary" />
                      1. Extração de Dados
                    </h3>
                    {lendoIa && <span className="text-xs text-primary animate-pulse">Lendo com IA...</span>}
                  </div>
                  
                  {fotoUrlPreview && (
                    <div className="aspect-video w-full relative bg-muted rounded-lg overflow-hidden flex items-center justify-center border">
                      <img src={fotoUrlPreview} className="max-w-full max-h-full object-contain" alt="Recorte" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Nome do Produto</Label>
                      <Input value={nomeProduto} onChange={e => setNomeProduto(e.target.value)} required />
                    </div>
                    <div>
                      <Label>Código</Label>
                      <Input value={codigo} onChange={e => setCodigo(e.target.value)} required />
                    </div>
                    <div>
                      <Label>Preço Unidade (R$)</Label>
                      <Input value={precoUnitario} onChange={e => setPrecoUnitario(e.target.value)} required />
                    </div>
                    <div>
                      <Label>Unidades na Caixa</Label>
                      <Input type="number" value={unidadesPorCaixa} onChange={e => setUnidadesPorCaixa(e.target.value)} required />
                    </div>
                    <div>
                      <Label>Pedido Mínimo (texto livre)</Label>
                      <Input value={pedidoMinimo} onChange={e => setPedidoMinimo(e.target.value)} placeholder="Ex: 1 caixa" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Peso e dimensões da embalagem (obrigatório)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7"
                      disabled={sugerindoMedidas || !nomeProduto.trim()}
                      onClick={sugerirMedidas}
                    >
                      <Sparkles className={`size-3.5 ${sugerindoMedidas ? "animate-pulse" : ""}`} />
                      {sugerindoMedidas ? "Sugerindo..." : "Sugerir com IA"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Input type="number" step="0.01" min="0.01" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} placeholder="Kg" required />
                    <Input type="number" min="1" value={comprimentoCm} onChange={(e) => setComprimentoCm(e.target.value)} placeholder="Compr." required />
                    <Input type="number" min="1" value={larguraCm} onChange={(e) => setLarguraCm(e.target.value)} placeholder="Larg." required />
                    <Input type="number" min="1" value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)} placeholder="Alt." required />
                  </div>

                  <div className="flex items-center justify-between border-b pb-4 mt-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Send className="size-4 text-emerald-600" />
                      2. Disparo WhatsApp
                    </h3>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Label>Grupo de Destino</Label>
                    <div className="flex flex-col gap-2">
                      {grupos.map((g) => (
                        <Label key={g.grupoId} className="flex items-center gap-2 font-normal">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                            checked={gruposSelecionados.includes(g.grupoId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGruposSelecionados([...gruposSelecionados, g.grupoId]);
                              } else {
                                setGruposSelecionados(gruposSelecionados.filter(id => id !== g.grupoId));
                              }
                            }}
                          />
                          {g.grupoNome} ({g.categoria === "AVISOS_COMUNIDADE" ? "Avisos" : "Solicitações"})
                        </Label>
                      ))}
                    </div>
                    {grupos.length === 0 && (
                      <p className="text-xs text-destructive">Nenhum grupo configurado para Solicitações ou Avisos.</p>
                    )}

                    <Label>Mensagem a ser enviada</Label>
                    <Textarea 
                      className="h-48 font-mono text-xs whitespace-pre-wrap resize-none bg-emerald-50 dark:bg-emerald-950/20"
                      value={mensagemPersonalizada}
                      onChange={e => setMensagemPersonalizada(e.target.value)}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 mt-2"
                    disabled={salvando || lendoIa || !fotoBlob || !pesoKg || !comprimentoCm || !larguraCm || !alturaCm}
                  >
                    {salvando ? "Enviando..." : "Salvar Rascunho & Enviar pro WhatsApp"}
                  </Button>
                </form>


              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Carregando catálogo...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
