"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

// Renderiza o PDF na tela em resolução interna 2.5× maior que o tamanho visual
// (supersampling) pra o recorte da foto sair nítido, não pixelado.
const FATOR_QUALIDADE = 2.5;

export type PdfViewerRef = {
  buscarNoPdf: (termo: string) => Promise<number[]>;
  extrairPagina: (pagina: number, scale?: number) => Promise<Blob>;
};

export const PdfPageViewer = forwardRef<PdfViewerRef, {
  url: string;
  pagina: number;
  onPaginaChange: (pagina: number) => void;
  onTotalPaginas?: (total: number) => void;
  selecionando?: boolean;
  onRecorte?: (blob: Blob) => void;
}>(function PdfPageViewer({
  url,
  pagina,
  onPaginaChange,
  onTotalPaginas,
  selecionando = false,
  onRecorte,
}, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const arrastandoRef = useRef<{ x: number; y: number } | null>(null);
  const [retangulo, setRetangulo] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const docRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const taskRef = useRef<import("pdfjs-dist").PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<import("pdfjs-dist").RenderTask | null>(null);
  // Geração de render — cada disparo do efeito incrementa; runs obsoletos abortam
  // antes de chamar page.render() e evitam colisão no mesmo canvas quando o
  // ResizeObserver dispara vários renders concorrentes.
  const renderGenRef = useRef(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [dimensoes, setDimensoes] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);

  // Mede o tamanho real do container — não pode confiar no clientWidth/Height
  // na primeira renderização porque o diálogo ainda está animando a abertura.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect && rect.width > 0 && rect.height > 0) {
        setDimensoes({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    async buscarNoPdf(termo: string) {
      if (!docRef.current) return [];
      const doc = docRef.current;
      const paginas: number[] = [];
      const termLower = termo.toLowerCase();
      
      // Itera por todas as páginas buscando o termo
      for (let i = 1; i <= doc.numPages; i++) {
        try {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const text = textContent.items.map((s: any) => s.str).join(" ").toLowerCase();
          if (text.includes(termLower)) {
            paginas.push(i);
          }
        } catch (e) {
          console.error(`Erro ao ler página ${i} do PDF`, e);
        }
      }
      return paginas;
    },
    async extrairPagina(numeroDaPagina: number, scale = 1.5) {
      if (!docRef.current) throw new Error("Documento não carregado");
      const doc = docRef.current;
      const page = await doc.getPage(numeroDaPagina);
      const viewport = page.getViewport({ scale }); // Escala maior = melhor leitura de miniaturas pequenas
      
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const canvasContext = canvas.getContext("2d");
      if (!canvasContext) throw new Error("Falha ao criar canvas context");
      
      // Força visibilidade das camadas
      const optionalContentConfig = await doc.getOptionalContentConfig();
      for (const [groupId] of optionalContentConfig) {
        optionalContentConfig.setVisibility(groupId, true);
      }
      
      await page.render({ canvas, viewport, optionalContentConfigPromise: Promise.resolve(optionalContentConfig) }).promise;
      
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Falha ao converter canvas para blob"));
        }, "image/png");
      });
    }
  }));

  // Carrega o documento uma vez por URL.
  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    import("pdfjs-dist").then(async (pdfjs) => {
      // Servidos pelo próprio domínio (copiados de node_modules em
      // postinstall) — evita depender de CDN externo e garante que o worker
      // encontre os .wasm do OpenJPEG (necessário pra imagens JPEG2000/JPX,
      // comuns em catálogos exportados do Illustrator/InDesign).
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
      try {
        const task = pdfjs.getDocument({ url, wasmUrl: "/pdfjs/wasm/" });
        taskRef.current = task;
        const doc = await task.promise;
        if (cancelado) return;
        docRef.current = doc;
        setTotalPaginas(doc.numPages);
        onTotalPaginas?.(doc.numPages);
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : "Não foi possível abrir o PDF.");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    });

    return () => {
      cancelado = true;
      taskRef.current?.destroy();
      taskRef.current = null;
      docRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Renderiza a página atual sempre que ela muda, o doc termina de carregar
  // ou a largura disponível é conhecida.
  useEffect(() => {
    if (!docRef.current || carregando || dimensoes.width === 0) return;
    let cancelado = false;
    const myGen = ++renderGenRef.current;
    const obsoleto = () => cancelado || myGen !== renderGenRef.current;

    (async () => {
      const doc = docRef.current;
      if (!doc) return;
      try {
        // Cancela o render() anterior e espera ele de fato encerrar antes de
        // reusar o mesmo canvas — só chamar cancel() não basta, o cleanup é
        // assíncrono e desenhar de novo antes disso gera "Cannot use the
        // same canvas during multiple render() operations".
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          await renderTaskRef.current.promise.catch(() => {});
        }
        if (obsoleto()) return;

        const paginaValida = Math.min(Math.max(1, pagina), doc.numPages);
        const page = await doc.getPage(paginaValida);
        if (obsoleto()) return;

        const viewportBase = page.getViewport({ scale: 1 });
        // Encaixa a página inteira na área visível (sem precisar rolar pra
        // ver o resto) — usa a menor proporção entre largura e altura.
        const margem = 16;
        const escalaLargura = (dimensoes.width - margem) / viewportBase.width;
        const escalaAltura = (dimensoes.height - margem) / viewportBase.height;
        const scaleExibicao = Math.min(escalaLargura, escalaAltura) * zoom;
        // Supersampling: renderiza numa resolução interna maior (×FATOR) e
        // exibe no tamanho normal via CSS — assim o recorte sai nítido em vez de
        // copiar da resolução pequena da tela.
        const scale = scaleExibicao * FATOR_QUALIDADE;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        // Mantém o tamanho VISUAL igual ao de antes (resolução interna é maior).
        canvas.style.width = `${viewport.width / FATOR_QUALIDADE}px`;
        canvas.style.height = `${viewport.height / FATOR_QUALIDADE}px`;

        // Alguns catálogos exportados do Illustrator/InDesign trazem as fotos
        // numa camada opcional (OCG) marcada como invisível por padrão — o
        // pdf.js respeita isso e some com a imagem, mesmo o texto/vetor
        // aparecendo normal. Força todas as camadas como visíveis.
        const optionalContentConfig = await doc.getOptionalContentConfig();
        if (obsoleto()) return;
        for (const [groupId] of optionalContentConfig) {
          optionalContentConfig.setVisibility(groupId, true);
        }

        // pdfjs-dist v6: "canvas" é o parâmetro recomendado; não pode ser
        // passado junto com "canvasContext" (a API exige que canvasContext só
        // seja usado quando canvas é null) — passar os dois faz o render()
        // resolver sem desenhar nada e sem lançar erro.
        const renderTask = page.render({ canvas, viewport, optionalContentConfigPromise: Promise.resolve(optionalContentConfig) });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (e) {
        const cancelled = e instanceof Error && e.name === "RenderingCancelledException";
        if (!cancelado && !cancelled) setErro(e instanceof Error ? e.message : "Erro ao renderizar a página.");
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [pagina, carregando, dimensoes, zoom]);

  // Zoom é por página — volta pro padrão ao navegar, senão o usuário fica
  // "perdido" ampliado num canto da próxima página.
  useEffect(() => {
    setZoom(1);
  }, [pagina]);

  function pontoRelativoAoCanvas(e: React.MouseEvent): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!selecionando) return;
    const ponto = pontoRelativoAoCanvas(e);
    if (!ponto) return;
    arrastandoRef.current = ponto;
    setRetangulo({ x: ponto.x, y: ponto.y, w: 0, h: 0 });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!selecionando || !arrastandoRef.current) return;
    const ponto = pontoRelativoAoCanvas(e);
    if (!ponto) return;
    const inicio = arrastandoRef.current;
    setRetangulo({
      x: Math.min(inicio.x, ponto.x),
      y: Math.min(inicio.y, ponto.y),
      w: Math.abs(ponto.x - inicio.x),
      h: Math.abs(ponto.y - inicio.y),
    });
  }

  function handleMouseUp() {
    if (!selecionando || !arrastandoRef.current) return;
    arrastandoRef.current = null;
    const canvas = canvasRef.current;
    if (!canvas || !retangulo || retangulo.w < 10 || retangulo.h < 10) {
      setRetangulo(null);
      return;
    }

    // O retângulo está em px de tela (CSS); o canvas tem resolução interna
    // FATOR_QUALIDADE× maior. Multiplica pra recortar na resolução cheia.
    const f = FATOR_QUALIDADE;
    const recorte = document.createElement("canvas");
    recorte.width = retangulo.w * f;
    recorte.height = retangulo.h * f;
    const ctx = recorte.getContext("2d");
    if (ctx) {
      ctx.drawImage(
        canvas,
        retangulo.x * f, retangulo.y * f, retangulo.w * f, retangulo.h * f,
        0, 0, retangulo.w * f, retangulo.h * f
      );
      recorte.toBlob((blob) => {
        if (blob) onRecorte?.(blob);
      }, "image/png");
    }
    setRetangulo(null);
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      <div
        ref={containerRef}
        className={`relative flex min-h-0 min-w-0 flex-1 rounded-lg border border-border bg-muted ${
          zoom > 1 ? "items-start justify-start overflow-auto" : "items-center justify-center overflow-hidden"
        }`}
      >
        {carregando ? (
          <p className="text-sm text-muted-foreground">Carregando PDF...</p>
        ) : erro ? (
          <p className="p-4 text-center text-sm text-destructive">{erro}</p>
        ) : (
          <div className="relative" style={{ width: "fit-content" }}>
            <canvas
              ref={canvasRef}
              className={`block ${selecionando ? "cursor-crosshair" : ""}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            />
            {retangulo ? (
              <div
                className="pointer-events-none absolute border-2 border-primary bg-primary/20"
                style={{ left: retangulo.x, top: retangulo.y, width: retangulo.w, height: retangulo.h }}
              />
            ) : null}
          </div>
        )}
      </div>
      {selecionando ? (
        <p className="shrink-0 text-center text-xs text-muted-foreground">
          Arraste um quadrado sobre a foto do produto na página pra usar como foto do pré-cadastro.
        </p>
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pagina <= 1}
          onClick={() => onPaginaChange(pagina - 1)}
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Página {Math.min(pagina, totalPaginas || pagina)} / {totalPaginas || "..."}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={totalPaginas > 0 && pagina >= totalPaginas}
          onClick={() => onPaginaChange(pagina + 1)}
        >
          Próxima
          <ChevronRight className="size-4" />
        </Button>

        <div className="flex items-center gap-1 border-l border-border pl-3">
          <Button type="button" variant="outline" size="sm" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>
            <ZoomOut className="size-4" />
          </Button>
          <span className="w-10 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button type="button" variant="outline" size="sm" disabled={zoom >= 4} onClick={() => setZoom((z) => Math.min(4, z + 0.5))}>
            <ZoomIn className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});
