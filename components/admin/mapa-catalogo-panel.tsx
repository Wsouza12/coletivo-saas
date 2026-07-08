"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Search, ImageUp, Loader2, Package, X, MapPin, BookOpen,
  RefreshCw, CheckCircle2, AlertCircle, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";
import { cn } from "@/lib/utils";

// ─── tipos ───────────────────────────────────────────────────────────────────
type CatalogoStat = {
  id: string; nome: string; gridCrops: string;
  totalItens: number; comProduto: number; semProduto: number; paginasIndexadas: number; cropsIndexados: number; cropsComEmbedding: number; naoIndexadas: number;
};
type FornecedorStat = { id: string; nome: string; catalogos: CatalogoStat[] };
type Stats = { stats: FornecedorStat[]; totalItens: number; totalComProduto: number; totalSemProduto: number; totalPaginasIndexadas: number; comEmbedding: number };
type ProdutoVisual = ProdutoInfo & { similaridade: number };

type ProdutoInfo = {
  id: string; nome: string; codigo?: string | null; categoria: string; marca?: string | null;
  unidadesPorCaixa: number; pesoKg?: any;
  imagemUrl?: string | null; custoUnitario?: any; precoVendaSugerido?: any;
  voltagem?: string | null; codigoAnatel?: string | null;
  fornecedor?: { id: string; nome: string } | null;
};
type ItemMapeado = {
  id: string; pagina: number; codigo?: string | null; nomeProduto: string;
  catalogo: { id: string; nome: string; fornecedor: { id: string; nome: string } };
  produtoAtacado: ProdutoInfo | null;
};
type PaginaIndexada = {
  id: string; pagina: number; textoTrecho: string; nomeOcr?: string | null;
  thumbUrl?: string | null; similaridade?: number;
  catalogoId: string; catalogoNome: string;
  fornecedor: { id: string; nome: string };
  itemMapeado: { pagina: number; nomeProduto: string; codigo?: string | null; produtoAtacado: ProdutoInfo | null } | null;
};
type PaginaCrop = {
  cropId: string; pagina: number; cropIndex: number; imagemUrl?: string | null;
  catalogoId: string; catalogoNome: string;
  fornecedor: { id: string; nome: string };
  similaridade: number;
};
type Resultados = { itensMapeados: ItemMapeado[]; paginasIndexadas: PaginaIndexada[]; produtosSemItem: ProdutoInfo[]; produtosVisuais: ProdutoVisual[]; paginasCrop: PaginaCrop[] };

// ─── botão de indexação de fotos de produto ───────────────────────────────────
function IndexarProdutosButton({ onConcluido }: { onConcluido: () => void }) {
  const [info, setInfo] = useState<{ semEmbedding: number; comEmbedding: number } | null>(null);
  const [indexando, setIndexando] = useState(false);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/admin/atacado/mapeamento/indexar-produtos").then((r) => r.json());
    setInfo(r.data);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function indexar() {
    if (!info || info.semEmbedding === 0) return;
    setIndexando(true);
    try {
      let pendentes = info.semEmbedding;
      while (pendentes > 0) {
        const r = await fetch("/api/admin/atacado/mapeamento/indexar-produtos", { method: "POST" }).then((r) => r.json());
        const proc = r.data?.processados ?? 0;
        pendentes = r.data?.pendentes ?? 0;
        if (r.data?.erros?.length > 0) console.error("Erros indexação fotos:", r.data.erros);
        setInfo((prev) => prev ? { ...prev, semEmbedding: pendentes, comEmbedding: prev.comEmbedding + proc } : prev);
        // Rate limit da Jina (100k tokens/min) → aguarda 60s e continua
        if (r.data?.rateLimited) {
          toast.info("Limite da Jina atingido — aguardando 60s para continuar...");
          await new Promise((res) => setTimeout(res, 60000));
          continue;
        }
        if (proc === 0) {
          if (r.data?.erros?.length > 0) toast.error(`Erro: ${r.data.erros[0]}`);
          break;
        }
        // Pausa curta entre lotes para não estourar o rate limit
        await new Promise((res) => setTimeout(res, 2000));
      }
      toast.success("Fotos indexadas!");
      onConcluido();
    } finally {
      setIndexando(false);
    }
  }

  if (!info) return null;
  if (info.semEmbedding === 0) return (
    <div className="flex items-center gap-1.5 text-xs text-emerald-600">
      <CheckCircle2 className="size-3.5" /> {info.comEmbedding} fotos indexadas
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{info.comEmbedding}/{info.comEmbedding + info.semEmbedding} fotos</span>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={indexar} disabled={indexando}>
        {indexando ? <Loader2 className="size-3 mr-1 animate-spin" /> : <RefreshCw className="size-3 mr-1" />}
        Indexar {info.semEmbedding} fotos
      </Button>
    </div>
  );
}

// ─── card de resultado ────────────────────────────────────────────────────────
function ResultCard({ item, pagina, produto: produtoAvulso, similaridade: simDireta }: {
  item?: ItemMapeado; pagina?: PaginaIndexada; produto?: ProdutoInfo; similaridade?: number
}) {
  const produto = item?.produtoAtacado ?? pagina?.itemMapeado?.produtoAtacado ?? produtoAvulso ?? null;
  const nomePrincipal = produto?.nome ?? item?.nomeProduto ?? pagina?.itemMapeado?.nomeProduto ?? pagina?.nomeOcr ?? `Pág. ${pagina?.pagina}`;
  const codigo = produto?.codigo ?? item?.codigo ?? pagina?.itemMapeado?.codigo;
  const foto = produto?.imagemUrl ?? pagina?.thumbUrl;
  const qtd = produto?.unidadesPorCaixa;
  const peso = produto?.pesoKg ? `${Number(produto.pesoKg).toFixed(2)} kg` : null;
  const fornecedorNome = item?.catalogo?.fornecedor?.nome ?? pagina?.fornecedor?.nome ?? produto?.fornecedor?.nome;
  const catalogoNome = item?.catalogo?.nome ?? pagina?.catalogoNome;
  const paginaNum = item?.pagina ?? pagina?.pagina;
  const temCadastro = !!(item?.produtoAtacado || pagina?.itemMapeado?.produtoAtacado || produtoAvulso);
  const eIndexo = !!pagina && !item;

  return (
    <div className={cn(
      "flex gap-3 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow",
      temCadastro ? "border-emerald-200" : eIndexo ? "border-blue-100" : "border-border"
    )}>
      <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden border border-border">
        {foto ? (
          <Image src={foto} alt={nomePrincipal} width={56} height={56} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {eIndexo ? <FileText className="size-5 text-blue-300" /> : <Package className="size-5 text-muted-foreground/40" />}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold text-sm text-foreground leading-tight line-clamp-2">{nomePrincipal}</span>
          <div className="flex gap-1 shrink-0">
            {temCadastro && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">cadastrado</Badge>}
            {eIndexo && !temCadastro && <Badge className="bg-blue-100 text-blue-700 text-[10px]">no índice</Badge>}
            {(simDireta != null || pagina?.similaridade != null) && (
              <Badge className="bg-purple-100 text-purple-700 text-[10px]">{simDireta ?? pagina?.similaridade}% similar</Badge>
            )}
          </div>
        </div>

        {codigo && <span className="text-xs font-mono text-muted-foreground">#{codigo}</span>}

        {pagina?.textoTrecho && !temCadastro && (
          <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2 mt-0.5 italic">
            "{pagina.textoTrecho}..."
          </p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
          {qtd && <span><strong className="text-foreground">{qtd}</strong> un/cx</span>}
          {peso && <span>{peso}</span>}
          {produto?.voltagem && <span>{produto.voltagem}</span>}
        </div>

        <div className="flex flex-wrap gap-1 mt-1">
          {fornecedorNome && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-100">
              <MapPin className="size-2.5" />{fornecedorNome}
            </span>
          )}
          {catalogoNome && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full border border-orange-100">
              <BookOpen className="size-2.5" />{catalogoNome}{paginaNum ? ` · pág. ${paginaNum}` : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Divide canvas em células de acordo com o grid configurado e retorna base64 de cada célula
function recortarGrid(canvas: HTMLCanvasElement, grid: string): string[] {
  const [cols, rows] = grid.split("x").map(Number);
  const cw = Math.floor(canvas.width / cols);
  const ch = Math.floor(canvas.height / rows);
  const crops: string[] = [];
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = cw;
  tmpCanvas.height = ch;
  const tmpCtx = tmpCanvas.getContext("2d")!;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tmpCtx.clearRect(0, 0, cw, ch);
      tmpCtx.drawImage(canvas, c * cw, r * ch, cw, ch, 0, 0, cw, ch);
      crops.push(tmpCanvas.toDataURL("image/jpeg", 0.80).split(",")[1]);
    }
  }
  tmpCanvas.remove();
  return crops;
}

// ─── botão de indexação por catálogo ─────────────────────────────────────────
function IndexarCatalogoButton({ catalogo, onConcluido }: {
  catalogo: { id: string; nome: string; paginasIndexadas: number; gridCrops: string };
  onConcluido: () => void;
}) {
  const [estado, setEstado] = useState<"idle" | "baixando" | "indexando" | "ok" | "erro">("idle");
  const [progresso, setProgresso] = useState(0);
  const [totalPags, setTotalPags] = useState(0);

  async function indexar() {
    setEstado("baixando");
    setProgresso(0);
    try {
      // 1. Busca URL do PDF
      const res = await fetch(`/api/admin/atacado/catalogos/${catalogo.id}`);
      const json = await res.json();
      const pdfUrl: string = json.data?.arquivoUrl;
      if (!pdfUrl) throw new Error("URL do PDF não encontrada");

      setEstado("indexando");

      // 2. Carrega PDF via pdf.js no browser (dynamic import evita SSR crash)
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
      const loadingTask = pdfjs.getDocument({ url: pdfUrl, disableStream: false });
      const pdf = await loadingTask.promise;
      const numPaginas = pdf.numPages;
      setTotalPags(numPaginas);

      // 3. Renderiza cada página, extrai texto + recorta crops por grid
      const LOTE = 1; // 1 página por lote (cada página gera N crops via Jina — cabe em 10s)
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const grid = catalogo.gridCrops || "2x3";

      for (let inicio = 1; inicio <= numPaginas; inicio += LOTE) {
        const fim = Math.min(inicio + LOTE - 1, numPaginas);
        const lote: { pagina: number; texto: string; thumbBase64?: string; crops?: { cropIndex: number; base64: string }[] }[] = [];

        for (let i = inicio; i <= fim; i++) {
          const page = await pdf.getPage(i);

          // Texto OCR
          const content = await page.getTextContent();
          const texto = content.items
            .map((it: any) => it.str ?? "")
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          // Renderiza a 768px de largura (maior para crops mais nítidos)
          const viewport = page.getViewport({ scale: 1 });
          const scale = 768 / viewport.width;
          const vp = page.getViewport({ scale });
          canvas.width = vp.width;
          canvas.height = vp.height;
          await (page.render as any)({ canvasContext: ctx, viewport: vp }).promise;

          // Recorta cada célula do grid — máx 6 crops/página para caber no timeout Vercel (10s)
          const cropsBases = recortarGrid(canvas, grid).slice(0, 6);
          const crops = cropsBases.map((base64, cropIndex) => ({ cropIndex, base64 }));

          // Thumb da página inteira (para fallback / OCR)
          const thumbBase64 = canvas.toDataURL("image/jpeg", 0.70).split(",")[1];

          lote.push({ pagina: i, texto: texto || " ", thumbBase64, crops });
        }

        await fetch("/api/admin/atacado/mapeamento/indexar-paginas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ catalogoId: catalogo.id, paginas: lote }),
        });

        setProgresso(Math.round((fim / numPaginas) * 100));
      }
      canvas.remove();

      setEstado("ok");
      onConcluido();
    } catch (err: any) {
      console.error(err);
      setEstado("erro");
      toast.error(`Erro ao indexar ${catalogo.nome}: ${err.message}`);
    }
  }

  if (estado === "ok") return (
    <div className="flex items-center gap-1 text-xs text-emerald-600">
      <CheckCircle2 className="size-3.5" /> Indexado
    </div>
  );

  if (estado === "indexando" || estado === "baixando") return (
    <div className="flex flex-col gap-1 w-32">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        {estado === "baixando" ? "Baixando..." : `${progresso}% (${totalPags > 0 ? totalPags : "?"} págs)`}
      </div>
      <Progress value={progresso} className="h-1" />
    </div>
  );

  return (
    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={indexar}>
      <RefreshCw className="size-3 mr-1" />
      {catalogo.paginasIndexadas > 0 ? "Reindexar" : "Indexar"}
    </Button>
  );
}

// ─── modal da página do catálogo ─────────────────────────────────────────────
function PaginaCatalogoModal({ catalogoId, pagina, catalogoNome, onClose }: {
  catalogoId: string; pagina: number; catalogoNome: string; onClose: () => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/atacado/catalogos/${catalogoId}`);
        const json = await res.json();
        const pdfUrl: string = json.data?.arquivoUrl;
        if (!pdfUrl) throw new Error("PDF não encontrado");

        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
        const pdf = await pdfjs.getDocument({ url: pdfUrl }).promise;
        const page = await pdf.getPage(pagina);

        // Renderiza em alta resolução (1400px) para leitura confortável
        const vp0 = page.getViewport({ scale: 1 });
        const scale = 1400 / vp0.width;
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width;
        canvas.height = vp.height;
        await (page.render as any)({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
        if (!cancelado) setImgUrl(canvas.toDataURL("image/jpeg", 0.85));
        canvas.remove();
      } catch (e: any) {
        if (!cancelado) setErro(e?.message ?? "Erro ao carregar página");
      }
    })();
    return () => { cancelado = true; };
  }, [catalogoId, pagina]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="text-sm font-semibold">{catalogoNome} — página {pagina}</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-auto p-2 flex items-center justify-center min-h-[300px]">
          {erro ? (
            <p className="text-sm text-destructive p-8">{erro}</p>
          ) : imgUrl ? (
            <img src={imgUrl} alt={`Página ${pagina}`} className="max-w-full h-auto rounded" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-12 text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-xs">Renderizando página {pagina}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── painel principal ─────────────────────────────────────────────────────────
export function MapaCatalogoPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [query, setQuery] = useState("");
  const [loadingTexto, setLoadingTexto] = useState(false);
  const [resultados, setResultados] = useState<Resultados | null>(null);

  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [loadingFoto, setLoadingFoto] = useState(false);
  const [extraido, setExtraido] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [paginaModal, setPaginaModal] = useState<{ catalogoId: string; pagina: number; catalogoNome: string } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregarStats = useCallback(() => {
    setLoadingStats(true);
    fetch("/api/admin/atacado/mapeamento/buscar")
      .then((r) => r.json())
      .then((j) => setStats(j.data))
      .catch(() => toast.error("Erro ao carregar stats"))
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => { carregarStats(); }, [carregarStats]);

  useEffect(() => {
    if (!query.trim()) { setResultados(null); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoadingTexto(true);
      fetch(`/api/admin/atacado/mapeamento/buscar?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((j) => setResultados(j.data))
        .catch(() => toast.error("Erro na busca"))
        .finally(() => setLoadingTexto(false));
    }, 400);
  }, [query]);

  const buscarPorFoto = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    setFotoPreview(url);
    setExtraido(null);
    setResultados(null);
    setQuery("");
    setLoadingFoto(true);
    try {
      const fd = new FormData();
      fd.append("foto", file);
      const res = await fetch("/api/admin/atacado/mapeamento/buscar-foto", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Erro na análise da foto"); return; }
      setExtraido(json.data.extraido);
      setResultados({ itensMapeados: json.data.itens, paginasIndexadas: json.data.paginasIndexadas ?? [], produtosSemItem: json.data.produtosSemItem, produtosVisuais: json.data.produtosVisuais ?? [], paginasCrop: json.data.paginasCrop ?? [] });
    } finally {
      setLoadingFoto(false);
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) buscarPorFoto(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) buscarPorFoto(file);
  }

  function limparFoto() { setFotoPreview(null); setExtraido(null); setResultados(null); }

  const totalResultados =
    (resultados?.produtosVisuais.length ?? 0) +
    (resultados?.paginasCrop.length ?? 0) +
    (resultados?.itensMapeados.length ?? 0) +
    (resultados?.paginasIndexadas.length ?? 0) +
    (resultados?.produtosSemItem.length ?? 0);
  const buscando = loadingTexto || loadingFoto;

  return (
    <div className="flex flex-col gap-6">

      {/* Drop de foto */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-2xl border-2 border-dashed transition-all cursor-pointer",
          dragOver ? "border-emerald-500 bg-emerald-50" : "border-border bg-muted/30 hover:border-emerald-400 hover:bg-emerald-50/30"
        )}
        onClick={() => !fotoPreview && fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        {fotoPreview ? (
          <div className="flex gap-6 p-5 items-start">
            <div className="relative flex-shrink-0">
              <img src={fotoPreview} alt="foto" className="w-36 h-36 object-contain rounded-xl border bg-white shadow" />
              <button onClick={(e) => { e.stopPropagation(); limparFoto(); }}
                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 shadow">
                <X className="size-3.5" />
              </button>
            </div>
            <div className="flex flex-col gap-2 flex-1 min-w-0">
              {loadingFoto ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="size-4 animate-spin" /> Analisando com IA...
                </div>
              ) : extraido ? (
                <>
                  <p className="text-xs text-muted-foreground">IA identificou:</p>
                  <p className="font-semibold text-foreground">{extraido.nome}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {extraido.codigo && <Badge variant="outline" className="text-xs">#{extraido.codigo}</Badge>}
                    {extraido.categoria && <Badge variant="outline" className="text-xs">{extraido.categoria}</Badge>}
                    {extraido.marca && <Badge variant="outline" className="text-xs">{extraido.marca}</Badge>}
                    {extraido.palavrasChave?.map((p: string) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totalResultados > 0 ? `${totalResultados} resultado(s) nos catálogos` : "Não encontrado nos catálogos indexados"}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
              <ImageUp className="size-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Arraste a foto do cliente aqui</p>
              <p className="text-sm text-muted-foreground mt-0.5">IA identifica e busca em todos os catálogos indexados</p>
            </div>
          </div>
        )}
      </div>

      {/* Busca texto */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); limparFoto(); }}
          placeholder="Buscar por nome, código ou qualquer texto do catálogo..."
          className="pl-9 h-11"
        />
        {buscando && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Resultados */}
      {resultados && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium">{totalResultados === 0 ? "Nenhum resultado" : `${totalResultados} resultado(s)`}</p>
            {(resultados.paginasIndexadas.length > 0) && (
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {resultados.paginasIndexadas.length} no índice de páginas
              </span>
            )}
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {/* Visuais primeiro — foto vs foto, mais preciso */}
            {resultados.produtosVisuais.map((p) => (
              <ResultCard key={`v-${p.id}`} produto={p} similaridade={p.similaridade} />
            ))}
            {/* Crops do catálogo — encontrado em página não cadastrada */}
            {resultados.paginasCrop.map((c) => (
              <button
                key={c.cropId}
                type="button"
                onClick={() => setPaginaModal({ catalogoId: c.catalogoId, pagina: c.pagina, catalogoNome: c.catalogoNome })}
                className="flex gap-3 rounded-xl border border-purple-200 bg-card p-4 shadow-sm text-left hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
              >
                <div className="w-14 h-14 rounded-lg bg-muted flex-shrink-0 overflow-hidden border border-border">
                  {c.imagemUrl ? (
                    <Image src={c.imagemUrl} alt={`Pág ${c.pagina}`} width={56} height={56} className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="size-5 text-purple-300" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm leading-tight line-clamp-1">{c.catalogoNome}</span>
                    <Badge className="bg-purple-100 text-purple-700 text-[10px] shrink-0">{c.similaridade}% crop</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.fornecedor.nome} · pág. {c.pagina} · produto {c.cropIndex + 1}</p>
                  <p className="text-xs text-purple-600 font-medium">Clique para ver a página {c.pagina}</p>
                </div>
              </button>
            ))}
            {resultados.paginasIndexadas.map((p) => <ResultCard key={p.id} pagina={p} />)}
            {resultados.itensMapeados.map((item) => <ResultCard key={item.id} item={item} />)}
            {resultados.produtosSemItem.map((p) => <ResultCard key={p.id} produto={p} />)}
          </div>
        </div>
      )}

      {/* Stats + indexação */}
      {!resultados && (
        <div className="flex flex-col gap-4">
          {loadingStats ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin" /> Carregando catálogos...
            </div>
          ) : stats ? (
            <>
              {/* Indexar fotos dos produtos cadastrados */}
              <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-medium">Busca visual por foto</p>
                  <p className="text-xs text-muted-foreground">Indexa embedding CLIP das fotos reais de cada produto</p>
                </div>
                <IndexarProdutosButton onConcluido={carregarStats} />
              </div>

              {/* Resumo global */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border bg-card p-4 text-center">
                  <p className="text-2xl font-bold">{stats.totalItens}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">itens no catálogo</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{stats.totalComProduto}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">com cadastro</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.totalPaginasIndexadas}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">págs indexadas</p>
                </div>
                <div className="rounded-xl border bg-card p-4 text-center">
                  <p className="text-2xl font-bold text-orange-500">{stats.totalSemProduto}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">sem cadastro</p>
                </div>
              </div>

              {/* Por fornecedor */}
              {stats.stats.map((f) => {
                const aberto = expandidos.has(f.id);
                const totalPags = f.catalogos.reduce((s, c) => s + c.paginasIndexadas, 0);
                return (
                  <div key={f.id} className="rounded-xl border bg-card overflow-hidden">
                    <button
                      className="w-full px-4 py-3 bg-muted/40 border-b flex items-center gap-2 hover:bg-muted/60 transition-colors text-left"
                      onClick={() => setExpandidos((s) => { const n = new Set(s); aberto ? n.delete(f.id) : n.add(f.id); return n; })}
                    >
                      <MapPin className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-sm flex-1">{f.nome}</span>
                      <span className="text-xs text-blue-600 mr-2">{totalPags} págs indexadas</span>
                      {aberto ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                    </button>

                    {aberto && (
                      <div className="divide-y">
                        {f.catalogos.length === 0 ? (
                          <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum catálogo</p>
                        ) : f.catalogos.map((c) => {
                          const pct = c.totalItens === 0 ? 0 : Math.round((c.comProduto / c.totalItens) * 100);
                          return (
                            <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                              <BookOpen className="size-4 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{c.nome}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className={cn("h-full rounded-full", pct === 100 ? "bg-emerald-500" : pct > 50 ? "bg-amber-400" : "bg-orange-400")}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground shrink-0">
                                      <span className="text-emerald-600 font-medium">{c.comProduto}</span> cad. / <span className="text-amber-500">{c.semProduto}</span> ref. / {c.paginasIndexadas} págs
                                      {c.cropsIndexados > 0 && <span className="text-purple-600"> / {c.cropsComEmbedding}/{c.cropsIndexados} crops✦</span>}
                                    </span>
                                  </div>
                                  {c.paginasIndexadas > 0 ? (
                                    <span className="text-xs text-blue-600 flex items-center gap-1 shrink-0">
                                      <CheckCircle2 className="size-3" />{c.paginasIndexadas} págs
                                    </span>
                                  ) : (
                                    <span className="text-xs text-orange-500 flex items-center gap-1 shrink-0">
                                      <AlertCircle className="size-3" />sem índice
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Seletor de grid — configura o layout de produtos da página */}
                              <select
                                className="h-7 text-xs border border-border rounded px-1 bg-background text-foreground"
                                value={c.gridCrops || "2x3"}
                                onChange={async (e) => {
                                  await fetch(`/api/admin/atacado/catalogos/${c.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ gridCrops: e.target.value }),
                                  });
                                  carregarStats();
                                }}
                                title="Grid de produtos por página"
                              >
                                <option value="2x2">2×2 (4/pág)</option>
                                <option value="2x3">2×3 (6/pág)</option>
                                <option value="3x3">3×3 (9/pág)</option>
                                <option value="3x4">3×4 (12/pág)</option>
                              </select>
                              <IndexarCatalogoButton
                                catalogo={{ id: c.id, nome: c.nome, paginasIndexadas: c.paginasIndexadas, gridCrops: c.gridCrops || "2x3" }}
                                onConcluido={carregarStats}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ) : null}
        </div>
      )}

      {paginaModal && (
        <PaginaCatalogoModal
          catalogoId={paginaModal.catalogoId}
          pagina={paginaModal.pagina}
          catalogoNome={paginaModal.catalogoNome}
          onClose={() => setPaginaModal(null)}
        />
      )}
    </div>
  );
}
