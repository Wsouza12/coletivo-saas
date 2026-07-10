"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { BookOpen, Plus, Crop, Sparkles, ImagePlus, Search, Loader2, Wand2 } from "lucide-react";
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
import { PdfPageViewer, type PdfViewerRef } from "@/components/admin/pdf-page-viewer";
import { CATEGORIAS } from "@/lib/constants";
import { ReservaPreview } from "@/components/admin/criar-produto-atacado-dialog";
import { Palette, Trash2, Upload } from "lucide-react";

type VariacaoForm = { idLocal: string; idBanco?: string; tipo: "COR" | "TAMANHO" | "VOLTAGEM"; nome: string; arquivo: File | Blob | null; imagemUrl?: string };

type Item = { id: string; pagina: number; codigo: string | null; nomeProduto: string; produtoAtacadoId: string | null };
type Catalogo = { id: string; nome: string; arquivoUrl: string; itens: Item[] };

export function CatalogoFornecedorViewerDialog({
  catalogoId,
  nome,
  iconeApenas = false,
  isEstoqueProprio,
}: {
  catalogoId: string;
  nome: string;
  iconeApenas?: boolean;
  isEstoqueProprio?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [pagina, setPagina] = useState(1);

  const [codigo, setCodigo] = useState("");
  const [nomeProduto, setNomeProduto] = useState("");
  const [categoria, setCategoria] = useState("");
  // Começa com a lista fixa, mas a IA pode "criar" uma categoria nova que ainda
  // não existe (vira texto livre no produto e aparece na vitrine por agrupamento).
  const [categoriasOpcoes, setCategoriasOpcoes] = useState<string[]>([...CATEGORIAS]);
  const [marca, setMarca] = useState("");
  const [voltagem, setVoltagem] = useState("");
  const [codigoAnatel, setCodigoAnatel] = useState("");
  const [unidadesPorCaixa, setUnidadesPorCaixa] = useState("");
  const [reservaLojaPadrao, setReservaLojaPadrao] = useState("");
  const [custoUnitario, setCustoUnitario] = useState("");
  const [precoCatalogo, setPrecoCatalogo] = useState("");
  const [precoVendaSugerido, setPrecoVendaSugerido] = useState("");
  const [pesoKg, setPesoKg] = useState("");
  const [comprimentoCm, setComprimentoCm] = useState("");
  const [larguraCm, setLarguraCm] = useState("");
  const [alturaCm, setAlturaCm] = useState("");
  const [sugerindoMedidas, setSugerindoMedidas] = useState(false);

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
  const [variacoesForm, setVariacoesForm] = useState<VariacaoForm[]>([]);
  const [novaVarTipo, setNovaVarTipo] = useState<"COR" | "TAMANHO" | "VOLTAGEM">("COR");
  const [novaVarNome, setNovaVarNome] = useState("");
  const [novaVarArquivo, setNovaVarArquivo] = useState<File | null>(null);
  // Dois modos de recorte na página: "ia" (lê os campos com IA) e "foto" (só
  // define a imagem limpa do produto, sem IA).
  const [selecionandoFoto, setSelecionandoFoto] = useState(false);
  const [modoRecorte, setModoRecorte] = useState<"ia" | "foto">("ia");
  const [fotoRecorte, setFotoRecorte] = useState<Blob | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [lendoIa, setLendoIa] = useState(false);
  // Após pré-cadastrar/atualizar, expomos o editor de variações pro produto
  // recém-criado sem o admin precisar sair do diálogo.
  const [ultimoProdutoId, setUltimoProdutoId] = useState<string | null>(null);
  
  const varInputRef = useRef<HTMLInputElement>(null);
  const varCropResolve = useRef<((f: File) => void) | null>(null);
  const pdfViewerRef = useRef<PdfViewerRef>(null);
  const [buscandoNoPdf, setBuscandoNoPdf] = useState(false);
  const [resultadosPdf, setResultadosPdf] = useState<number[] | null>(null);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [buscandoComIa, setBuscandoComIa] = useState(false);
  const [progressoIa, setProgressoIa] = useState<{ atual: number; total: number } | null>(null);
  const [resultadosIa, setResultadosIa] = useState<number[] | null>(null);
  // Cache do texto já lido por IA nesta sessão do diálogo — evita reler a
  // mesma página de novo se o admin buscar outro termo depois.
  const textoCacheRef = useRef<Record<number, string>>({});

  const [imagemReferencia, setImagemReferencia] = useState<File | null>(null);
  const imagemReferenciaRef = useRef<HTMLInputElement>(null);
  const [buscandoPorImagem, setBuscandoPorImagem] = useState(false);
  const [progressoImagem, setProgressoImagem] = useState<{ atual: number; total: number } | null>(null);
  const [resultadosImagem, setResultadosImagem] = useState<number[] | null>(null);

  const [extraindoLote, setExtraindoLote] = useState(false);

  async function handleExtrairLote() {
    if (!pdfViewerRef.current) return;
    setExtraindoLote(true);
    try {
      const blob = await pdfViewerRef.current.extrairPagina(pagina);
      const file = new File([blob], "pagina.png", { type: "image/png" });
      
      const formData = new FormData();
      formData.append("imagem", file);
      formData.append("catalogoId", catalogoId);
      formData.append("pagina", pagina.toString());

      const toastId = toast.loading("Analisando página com IA. Isso pode levar alguns segundos...");

      const res = await fetch("/api/admin/atacado/catalogos/extrair-lote", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Erro ao extrair produtos");

      toast.success(
        json.count > 0 
          ? `${json.count} produtos extraídos e salvos como rascunhos!` 
          : "A IA não conseguiu identificar nenhum produto com confiança nesta página.", 
        { id: toastId }
      );
      
      if (json.count > 0) {
        carregar(); // Recarrega a lista lateral
      }
    } catch (err: any) {
      toast.error(err.message || "Erro na extração em lote");
    } finally {
      setExtraindoLote(false);
    }
  }

  const itensDaPagina = catalogo ? catalogo.itens.filter((i) => i.pagina === pagina) : [];

  async function editarRascunho(produtoId: string) {
    const toastId = toast.loading("Carregando...");
    try {
      const res = await fetch(`/api/admin/atacado/produtos/${produtoId}`);
      if (res.ok) {
        const { data: p } = await res.json();
        setCodigo(p.codigo || "");
        setNomeProduto(p.nome);
        setCategoria(p.categoria);
        setMarca(p.marca || "");
        setVoltagem(p.voltagem || "");
        setCodigoAnatel(p.codigoAnatel || "");
        setUnidadesPorCaixa(p.unidadesPorCaixa.toString());
        setCustoUnitario(p.custoUnitario.toString());
        setPrecoCatalogo(p.precoCatalogo?.toString() || "");
        setPrecoVendaSugerido(p.precoVendaSugerido?.toString() || "");
        setPesoKg(p.pesoKg.toString());
        setComprimentoCm(p.comprimentoCm.toString());
        setLarguraCm(p.larguraCm.toString());
        setAlturaCm(p.alturaCm.toString());
        setUltimoProdutoId(p.id);
        setVariacoesForm((p.cores || []).map((c: any) => ({
          idLocal: Math.random().toString(36).substring(2, 9),
          idBanco: c.id,
          tipo: c.tipo,
          nome: c.nome,
          arquivo: null,
          imagemUrl: c.imagemUrl
        })));
        toast.success("Dados carregados! Adicione a foto ou faça ajustes e salve.", { id: toastId });
      } else {
        throw new Error("Erro da API");
      }
    } catch {
      toast.error("Erro ao carregar produto para edição", { id: toastId });
    }
  }

  async function carregar() {
    const res = await fetch(`/api/admin/atacado/catalogos/${catalogoId}`);
    const json = await res.json();
    if (res.ok) setCatalogo(json.data);
  }

  useEffect(() => {
    if (open) {
      carregar();
      setResultadosPdf(null);
      setResultadosIa(null);
      setResultadosImagem(null);
      setImagemReferencia(null);
      setBuscaItem("");
      textoCacheRef.current = {};
    }
  }, [open]);

  async function handleBuscarNoPdf() {
    if (buscaItem.trim().length < 2 || !pdfViewerRef.current) return;
    setBuscandoNoPdf(true);
    setResultadosPdf(null);
    try {
      const paginas = await pdfViewerRef.current.buscarNoPdf(buscaItem);
      setResultadosPdf(paginas);
      if (paginas.length > 0) {
        setPagina(paginas[0]);
        toast.success(`Encontrado em ${paginas.length} página(s)`);
      } else {
        toast.error("Termo não encontrado no texto do PDF");
      }
    } catch (e) {
      toast.error("Erro ao buscar no PDF");
    } finally {
      setBuscandoNoPdf(false);
    }
  }

  const normTexto = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  // Busca por IA: varre página por página (OCR via visão, sem salvar nada no
  // banco) procurando o termo — pensada pra catálogos escaneados, onde a busca
  // por texto nativo do PDF (handleBuscarNoPdf) não acha nada por falta de
  // camada de texto selecionável.
  async function handleBuscarComIa() {
    if (buscaItem.trim().length < 2 || !pdfViewerRef.current || totalPaginas === 0) return;
    setBuscandoComIa(true);
    setResultadosIa(null);
    const termo = normTexto(buscaItem);
    const encontradas: number[] = [];
    try {
      for (let p = 1; p <= totalPaginas; p++) {
        setProgressoIa({ atual: p, total: totalPaginas });
        let texto = textoCacheRef.current[p];
        if (texto === undefined) {
          try {
            const blob = await pdfViewerRef.current.extrairPagina(p, 3);
            const formData = new FormData();
            formData.append("imagem", blob, `pagina_${p}.png`);
            const res = await fetch("/api/admin/atacado/catalogos/ler-texto-pagina", {
              method: "POST",
              body: formData,
            });
            const json = await res.json();
            texto = res.ok ? json.data.texto ?? "" : "";
          } catch {
            texto = "";
          }
          textoCacheRef.current[p] = texto;
        }
        if (normTexto(texto).includes(termo)) encontradas.push(p);
      }
      setResultadosIa(encontradas);
      if (encontradas.length > 0) {
        setPagina(encontradas[0]);
        toast.success(`Encontrado em ${encontradas.length} página(s)`);
      } else {
        toast.error("Termo não encontrado pela IA em nenhuma página");
      }
    } finally {
      setBuscandoComIa(false);
      setProgressoIa(null);
    }
  }

  // Busca visual: compara a foto de referência com cada página (IA de visão),
  // sem salvar nada — mesmo padrão de cache/loop da busca por texto.
  async function handleBuscarPorImagem() {
    if (!imagemReferencia || !pdfViewerRef.current || totalPaginas === 0) return;
    setBuscandoPorImagem(true);
    setResultadosImagem(null);
    const encontradas: number[] = [];
    try {
      for (let p = 1; p <= totalPaginas; p++) {
        setProgressoImagem({ atual: p, total: totalPaginas });
        try {
          const blob = await pdfViewerRef.current.extrairPagina(p, 3);
          const formData = new FormData();
          formData.append("referencia", imagemReferencia, imagemReferencia.name);
          formData.append("pagina", blob, `pagina_${p}.png`);
          const res = await fetch("/api/admin/atacado/catalogos/comparar-imagem-pagina", {
            method: "POST",
            body: formData,
          });
          const json = await res.json();
          if (res.ok && json.data.encontrado) encontradas.push(p);
        } catch {
          // página com falha na comparação — segue pras próximas
        }
      }
      setResultadosImagem(encontradas);
      if (encontradas.length > 0) {
        setPagina(encontradas[0]);
        toast.success(`Produto parecido encontrado em ${encontradas.length} página(s)`);
      } else {
        toast.error("Nenhuma página parecida com a imagem de referência");
      }
    } finally {
      setBuscandoPorImagem(false);
      setProgressoImagem(null);
    }
  }

  // Recorte da página: no modo "foto" só define a imagem do produto; no modo
  // "ia" lê os campos com a IA de visão (e, se ainda não houver foto, usa esse
  // recorte como foto provisória). Best-effort: se a IA falhar, preenche à mão.
  async function handleRecorte(blob: Blob) {
    setSelecionandoFoto(false);

    // Modo "foto": só define a imagem limpa do produto, sem IA.
    if (modoRecorte === "foto") {
      const file = new File([blob], "recorte.png", { type: "image/png" });
      if (varCropResolve.current) {
        varCropResolve.current(file);
        varCropResolve.current = null;
        toast.success("Foto da variação definida");
      } else {
        setFotoRecorte(blob);
        toast.success("Foto do produto definida");
      }
      return;
    }

    // Modo "ia": lê os campos. Usa esse recorte como foto provisória só se ainda
    // não houver uma (a foto limpa vem do outro botão).
    setFotoRecorte((atual) => atual ?? blob);
    setLendoIa(true);
    try {
      const formData = new FormData();
      formData.append("imagem", blob, "recorte.png");
      const res = await fetch(`/api/admin/atacado/catalogos/extrair-dados`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "IA não conseguiu ler — preencha manualmente");
        return;
      }
      const d = json.data;
      // Só preenche o que veio — não apaga o que o admin já tiver digitado à mão.
      if (d.codigo) setCodigo(d.codigo);
      if (d.nome) setNomeProduto(d.nome);
      if (d.marca) setMarca(d.marca);
      if (d.voltagem) setVoltagem(d.voltagem);
      if (d.codigoAnatel) setCodigoAnatel(d.codigoAnatel);
      if (typeof d.custoUnitario === "number") setCustoUnitario(String(d.custoUnitario));
      if (typeof d.precoCatalogo === "number") setPrecoCatalogo(String(d.precoCatalogo));
      if (typeof d.unidadesPorCaixa === "number") setUnidadesPorCaixa(String(d.unidadesPorCaixa));
      if (typeof d.pesoKg === "number") setPesoKg(String(d.pesoKg));
      if (typeof d.comprimentoCm === "number") setComprimentoCm(String(d.comprimentoCm));
      if (typeof d.larguraCm === "number") setLarguraCm(String(d.larguraCm));
      if (typeof d.alturaCm === "number") setAlturaCm(String(d.alturaCm));
      // Categoria: nunca deixa vazio. Casa com uma existente (sem acento,
      // case-insensitive), cria uma nova on-the-fly se a IA trouxer algo novo, ou
      // cai em "Outros" se a IA não conseguiu identificar nenhuma.
      if (d.categoria) {
        const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
        const existente = categoriasOpcoes.find((c) => norm(c) === norm(d.categoria));
        if (existente) {
          setCategoria(existente);
        } else {
          setCategoriasOpcoes((prev) => [...prev, d.categoria]);
          setCategoria(d.categoria);
        }
      } else if (!categoria) {
        setCategoria("Outros");
      }
      toast.success("Dados lidos pela IA — confira antes de salvar");
    } catch {
      toast.error("Erro ao ler a imagem com IA — preencha manualmente");
    } finally {
      setLendoIa(false);
    }
  }

  async function preCadastrar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const formData = new FormData();
      formData.append("pagina", String(pagina));
      if (ultimoProdutoId) formData.append("produtoIdBase", ultimoProdutoId);
      if (codigo) formData.append("codigo", codigo);
      formData.append("nomeProduto", nomeProduto);
      formData.append("categoria", categoria);
      if (marca) formData.append("marca", marca);
      if (voltagem) formData.append("voltagem", voltagem);
      if (codigoAnatel) formData.append("codigoAnatel", codigoAnatel);
      formData.append("unidadesPorCaixa", unidadesPorCaixa);
      if (reservaLojaPadrao) formData.append("reservaLojaPadrao", reservaLojaPadrao);
      formData.append("custoUnitario", custoUnitario);
      if (precoCatalogo) formData.append("precoCatalogo", precoCatalogo);
      if (precoVendaSugerido) formData.append("precoVendaSugerido", precoVendaSugerido);
      if (pesoKg) formData.append("pesoKg", pesoKg);
      if (comprimentoCm) formData.append("comprimentoCm", comprimentoCm);
      if (larguraCm) formData.append("larguraCm", larguraCm);
      if (alturaCm) formData.append("alturaCm", alturaCm);
      if (fotoRecorte) formData.append("imagem", fotoRecorte, "recorte.png");

      variacoesForm.forEach((v, index) => {
        if (v.idBanco) formData.append(`variacao_${index}_idBanco`, v.idBanco);
        formData.append(`variacao_${index}_tipo`, v.tipo);
        formData.append(`variacao_${index}_nome`, v.nome);
        if (v.imagemUrl) formData.append(`variacao_${index}_imagemUrl`, v.imagemUrl);
        if (v.arquivo) formData.append(`variacao_${index}_imagem`, v.arquivo, `var_${index}.png`);
      });
      formData.append("variacoesCount", variacoesForm.length.toString());

      async function enviar(confirmar: boolean) {
        const url = confirmar
          ? `/api/admin/atacado/catalogos/${catalogoId}/itens?confirmarAtualizacao=true`
          : `/api/admin/atacado/catalogos/${catalogoId}/itens`;
        return fetch(url, { method: "POST", body: formData });
      }

      let res = await enviar(false);
      let json = await res.json();

      // Código já existe neste catálogo — pergunta se quer atualizar o preço.
      if (res.status === 409 && json.error?.code === "JA_EXISTE") {
        const j = json.error.jaExiste;
        const fmt = (v: number | null) =>
          v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const msg = j.precoMudou
          ? `Produto ${codigo} já existe neste catálogo.\n\nPreço de custo:\n  Atual: ${fmt(j.custoAtual)}\n  Novo: ${fmt(j.custoNovo)}\n\nAtualizar com o novo preço?`
          : `Produto ${codigo} já existe neste catálogo com o mesmo preço.\n\nRegistrar mesmo assim (atualiza demais campos)?`;
        if (!window.confirm(msg)) return;
        res = await enviar(true);
        json = await res.json();
      }

      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao pré-cadastrar produto");
        return;
      }
      toast.success(
        json.data?.acao === "atualizado"
          ? "Preços atualizados no produto existente"
          : "Produto pré-cadastrado — agora você pode adicionar variações abaixo"
      );
      const novoProdutoId =
        json.data?.item?.produtoAtacadoId ?? json.data?.produtoAtacadoId ?? null;
      if (novoProdutoId) setUltimoProdutoId(novoProdutoId);
      setCodigo("");
      setNomeProduto("");
      setMarca("");
      setVoltagem("");
      setCodigoAnatel("");
      setUnidadesPorCaixa("");
      setReservaLojaPadrao("");
      setCustoUnitario("");
      setPrecoCatalogo("");
      setPrecoVendaSugerido("");
      setPesoKg("");
      setComprimentoCm("");
      setLarguraCm("");
      setAlturaCm("");
      setVariacoesForm([]);
      setFotoRecorte(null);
      carregar();
    } finally {
      setSalvando(false);
    }
  }

  const [buscaItem, setBuscaItem] = useState("");
  const itensFiltrados = catalogo ? catalogo.itens.filter((i) => {
    if (buscaItem.trim().length < 2) return false;
    const term = buscaItem.toLowerCase();
    return (
      (i.codigo && i.codigo.toLowerCase().includes(term)) ||
      i.nomeProduto.toLowerCase().includes(term)
    );
  }) : [];

  return (
    <>
      {iconeApenas ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded p-1 hover:bg-background"
          title="Ver catálogo"
        >
          <BookOpen className="size-3 text-primary" />
        </button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <BookOpen className="size-3.5" />
          Ver catálogo
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-full max-w-[calc(100%-1rem)] sm:max-w-6xl sm:max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{nome}</DialogTitle>
          </DialogHeader>

          {!catalogo ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="grid h-[75vh] gap-3 sm:grid-cols-[1fr_340px]">
              <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="shrink-0">Ir para página</Label>
                    <Input
                      type="number"
                      min="1"
                      value={pagina}
                      onChange={(e) => setPagina(Number(e.target.value) || 1)}
                      className="w-20"
                    />
                  </div>
                  {selecionandoFoto ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => setSelecionandoFoto(false)}>
                      Cancelar seleção
                    </Button>
                  ) : null}
                  <div className="flex-1 min-w-[20px]"></div>
                  {!isEstoqueProprio && (
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="secondary" 
                      className="gap-1.5 bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200 shadow-sm"
                      onClick={handleExtrairLote}
                      disabled={extraindoLote}
                    >
                      {extraindoLote ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />}
                      Extrair Todos (IA)
                    </Button>
                  )}
                </div>
                <PdfPageViewer
                  ref={pdfViewerRef}
                  url={catalogo.arquivoUrl}
                  pagina={pagina}
                  onPaginaChange={setPagina}
                  onTotalPaginas={setTotalPaginas}
                  selecionando={selecionandoFoto}
                  onRecorte={handleRecorte}
                />
              </div>

              <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
                <div className="shrink-0 flex flex-col gap-2">
                  <div className="flex flex-col gap-1.5">
                    <Input 
                      placeholder="Buscar no catálogo (nome ou código)..." 
                      value={buscaItem} 
                      onChange={(e) => setBuscaItem(e.target.value)} 
                      className="text-sm h-9"
                    />
                    
                    <Button 
                      type="button" 
                      variant="secondary" 
                      size="sm" 
                      className="w-full justify-start text-xs h-8"
                      disabled={buscandoNoPdf || buscaItem.trim().length < 2}
                      onClick={handleBuscarNoPdf}
                    >
                      {buscandoNoPdf ? (
                        <Loader2 className="mr-2 size-3 animate-spin" />
                      ) : (
                        <Search className="mr-2 size-3" />
                      )}
                      Buscar "{buscaItem}" no texto do PDF
                    </Button>
                    
                    {resultadosPdf !== null && (
                      <div className="text-xs text-muted-foreground px-1">
                        {resultadosPdf.length === 0
                          ? "Não encontrado no PDF."
                          : `Encontrado nas páginas: ${resultadosPdf.join(", ")}`}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full justify-start text-xs h-8 bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
                      disabled={buscandoComIa || buscaItem.trim().length < 2 || totalPaginas === 0}
                      onClick={handleBuscarComIa}
                      title="Lê o texto de cada página com IA — funciona mesmo em catálogos escaneados, sem salvar nada"
                    >
                      {buscandoComIa ? (
                        <Loader2 className="mr-2 size-3 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 size-3" />
                      )}
                      {buscandoComIa && progressoIa
                        ? `Lendo pág. ${progressoIa.atual}/${progressoIa.total}...`
                        : `Buscar "${buscaItem}" com IA (todas as páginas)`}
                    </Button>

                    {resultadosIa !== null && (
                      <div className="text-xs text-muted-foreground px-1">
                        {resultadosIa.length === 0
                          ? "Não encontrado pela IA em nenhuma página."
                          : `IA encontrou nas páginas: ${resultadosIa.join(", ")}`}
                      </div>
                    )}

                    <div className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
                      <span className="text-xs font-medium text-foreground">Buscar por imagem de referência</span>
                      <input
                        ref={imagemReferenciaRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setImagemReferencia(e.target.files?.[0] ?? null)}
                      />
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 flex-1 justify-start text-xs"
                          onClick={() => imagemReferenciaRef.current?.click()}
                        >
                          <Upload className="mr-1.5 size-3" />
                          {imagemReferencia ? imagemReferencia.name : "Subir foto..."}
                        </Button>
                        {imagemReferencia ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={URL.createObjectURL(imagemReferencia)}
                            alt="Referência"
                            className="size-8 shrink-0 rounded object-cover"
                          />
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-full justify-start text-xs h-8 bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-200"
                        disabled={buscandoPorImagem || !imagemReferencia || totalPaginas === 0}
                        onClick={handleBuscarPorImagem}
                        title="Compara a foto com cada página via IA — não salva nada"
                      >
                        {buscandoPorImagem ? (
                          <Loader2 className="mr-2 size-3 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 size-3" />
                        )}
                        {buscandoPorImagem && progressoImagem
                          ? `Comparando pág. ${progressoImagem.atual}/${progressoImagem.total}...`
                          : "Buscar por essa imagem (todas as páginas)"}
                      </Button>
                      {resultadosImagem !== null && (
                        <div className="text-xs text-muted-foreground px-1">
                          {resultadosImagem.length === 0
                            ? "Nenhuma página parecida encontrada."
                            : `Parecido nas páginas: ${resultadosImagem.join(", ")}`}
                        </div>
                      )}
                    </div>

                    {buscaItem.trim().length >= 2 && (
                      <div className="flex flex-col gap-1 max-h-32 overflow-y-auto rounded-md border border-border bg-background p-1 shadow-sm mt-1">
                        {itensFiltrados.length === 0 ? (
                          <span className="text-xs text-muted-foreground p-2 text-center">Nenhum produto pré-cadastrado.</span>
                        ) : (
                          itensFiltrados.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="flex items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                              onClick={() => {
                                setPagina(item.pagina);
                                setBuscaItem("");
                              }}
                            >
                              <span className="truncate max-w-[200px] font-medium" title={item.nomeProduto}>
                                {item.codigo ? `${item.codigo} - ` : ""}{item.nomeProduto}
                              </span>
                              <span className="shrink-0 text-muted-foreground">Pág {item.pagina}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg bg-muted px-2.5 py-1.5 text-xs">
                    <span className="font-medium text-foreground">
                      {catalogo.itens.length} produto(s) cadastrado(s)
                    </span>
                  </div>
                </div>

                {itensDaPagina.length > 0 && (
                  <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                    <span className="text-xs font-medium text-foreground">
                      Extraídos nesta página ({itensDaPagina.length})
                    </span>
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                      {itensDaPagina.map((item) => (
                        <div key={item.id} className="flex justify-between items-center rounded bg-muted px-2 py-1.5 text-xs border border-transparent hover:border-border">
                          <span className="truncate max-w-[170px]" title={item.nomeProduto}>
                            {item.codigo ? `${item.codigo} - ` : ""}{item.nomeProduto}
                          </span>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-6 px-2 text-[10px]" 
                            onClick={() => editarRascunho(item.produtoAtacadoId!)}
                          >
                            ✏️ Editar
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isEstoqueProprio && (
                  <form onSubmit={preCadastrar} className="flex flex-col gap-1.5 border-t border-border pt-3">
                    <span className="text-xs font-medium text-foreground">Pré-cadastrar produto desta página</span>

                  <div className="flex gap-1.5">
                    <Input value={pagina} disabled className="w-16 text-xs" />
                    <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Código" />
                  </div>
                  <Input value={nomeProduto} onChange={(e) => setNomeProduto(e.target.value)} placeholder="Nome do produto" required />

                  <Select value={categoria} onValueChange={(v) => v && setCategoria(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria">{() => categoria || "Categoria"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoriasOpcoes.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-2 gap-1.5">
                    <Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Marca — opcional" />
                    <Input value={voltagem} onChange={(e) => setVoltagem(e.target.value)} placeholder="Voltagem — opcional" />
                  </div>
                  <Input
                    value={codigoAnatel}
                    onChange={(e) => setCodigoAnatel(e.target.value)}
                    placeholder="Código Anatel — opcional"
                    title="Número de homologação Anatel, ex: 00279-20-15621"
                  />

                  <Input
                    type="number"
                    min="1"
                    value={unidadesPorCaixa}
                    onChange={(e) => setUnidadesPorCaixa(e.target.value)}
                    placeholder="Und/caixa"
                    required
                  />
                  <Input
                    type="number"
                    min="0"
                    value={reservaLojaPadrao}
                    onChange={(e) => setReservaLojaPadrao(e.target.value)}
                    placeholder="Reserva padrão pra loja (opcional)"
                    title="Pré-preenche a reserva ao criar a rodada desse produto"
                  />
                  <ReservaPreview
                    custo={Number(custoUnitario)}
                    meta={Number(unidadesPorCaixa)}
                    reserva={Number(reservaLojaPadrao)}
                  />

                  <Label className="text-xs text-muted-foreground">Preços (R$)</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={custoUnitario}
                      onChange={(e) => setCustoUnitario(e.target.value)}
                      placeholder="Custo"
                      title="Custo do catálogo — quanto você paga"
                      required
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precoCatalogo}
                      onChange={(e) => setPrecoCatalogo(e.target.value)}
                      placeholder="Pç. catálogo"
                      title="Preço já impresso na página do catálogo — opcional"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={precoVendaSugerido}
                      onChange={(e) => setPrecoVendaSugerido(e.target.value)}
                      placeholder="Venda"
                      title="Preço que você pretende postar na rodada — opcional"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Peso e medidas da embalagem (obrigatório)</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px]"
                      disabled={sugerindoMedidas || !nomeProduto.trim()}
                      onClick={sugerirMedidas}
                    >
                      <Sparkles className={`size-3 ${sugerindoMedidas ? "animate-pulse" : ""}`} />
                      {sugerindoMedidas ? "Sugerindo..." : "Sugerir com IA"}
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <Input type="number" step="0.01" min="0.01" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} placeholder="Kg" required />
                    <Input type="number" min="1" value={comprimentoCm} onChange={(e) => setComprimentoCm(e.target.value)} placeholder="Compr." required />
                    <Input type="number" min="1" value={larguraCm} onChange={(e) => setLarguraCm(e.target.value)} placeholder="Larg." required />
                    <Input type="number" min="1" value={alturaCm} onChange={(e) => setAlturaCm(e.target.value)} placeholder="Alt." required />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    &quot;Ler com IA&quot; (no recorte da página) já preenche isso quando consegue ler do catálogo.
                    &quot;Sugerir com IA&quot; é um fallback por nome só, sempre confira antes de salvar.
                  </span>

                  <div className="flex flex-col gap-2 mt-2 bg-muted/30 p-2 rounded-md border border-border">
                    <Label className="text-xs font-semibold">Variações (Opcional)</Label>
                    
                    <div className="flex items-center gap-1.5">
                      <Select value={novaVarTipo} onValueChange={(v: any) => setNovaVarTipo(v)}>
                        <SelectTrigger className="w-[85px] h-8 text-[11px] px-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="COR">Cor</SelectItem>
                          <SelectItem value="TAMANHO">Tamanho</SelectItem>
                          <SelectItem value="VOLTAGEM">Voltagem</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        placeholder="Ex: Azul" 
                        value={novaVarNome} 
                        onChange={(e) => setNovaVarNome(e.target.value)}
                        className="h-8 text-xs flex-1 min-w-0"
                      />
                      <input 
                        type="file" 
                        ref={varInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setNovaVarArquivo(f);
                        }} 
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => varInputRef.current?.click()} title="Upload foto">
                          <Upload className="size-3.5" />
                        </Button>
                        <Button 
                          type="button" 
                          variant={selecionandoFoto && modoRecorte === "foto" && varCropResolve.current ? "default" : "outline"}
                          size="icon" 
                          className="h-8 w-8" 
                          title="Recortar no PDF"
                          onClick={() => {
                            setModoRecorte("foto");
                            setSelecionandoFoto(true);
                            varCropResolve.current = (f) => setNovaVarArquivo(f);
                          }}
                        >
                          ✂️
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-3"
                          disabled={!novaVarNome.trim()}
                          onClick={() => {
                            setVariacoesForm(prev => [...prev, {
                              idLocal: Math.random().toString(36).substring(2, 9),
                              tipo: novaVarTipo,
                              nome: novaVarNome.trim(),
                              arquivo: novaVarArquivo
                            }]);
                            setNovaVarNome("");
                            setNovaVarArquivo(null);
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                    {novaVarArquivo && (
                      <div className="text-[10px] text-primary font-medium px-1">✓ Foto da variação pronta.</div>
                    )}

                    {variacoesForm.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        {variacoesForm.map(v => (
                          <div key={v.idLocal} className="flex items-center justify-between bg-background border border-border rounded px-2 py-1.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{v.tipo === "COR" ? "Cor" : v.tipo === "TAMANHO" ? "Tam." : "Volt."}: {v.nome}</span>
                              {(v.arquivo || v.imagemUrl) && <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded-sm">com foto</span>}
                            </div>
                            <button type="button" onClick={() => setVariacoesForm(prev => prev.filter(x => x.idLocal !== v.idLocal))} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={selecionandoFoto && modoRecorte === "ia" ? "default" : "outline"}
                      onClick={() => {
                        setModoRecorte("ia");
                        setSelecionandoFoto((v) => !(v && modoRecorte === "ia"));
                      }}
                      disabled={lendoIa}
                      className="flex-1"
                    >
                      {selecionandoFoto && modoRecorte === "ia" ? (
                        <>
                          <Crop className="size-3.5" />
                          Selecionando...
                        </>
                      ) : lendoIa ? (
                        <>
                          <Sparkles className="size-3.5 animate-pulse" />
                          Lendo...
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3.5" />
                          Ler com IA
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={selecionandoFoto && modoRecorte === "foto" ? "default" : "outline"}
                      onClick={() => {
                        setModoRecorte("foto");
                        setSelecionandoFoto((v) => !(v && modoRecorte === "foto"));
                      }}
                      disabled={lendoIa}
                      className="flex-1"
                    >
                      {selecionandoFoto && modoRecorte === "foto" ? (
                        <>
                          <Crop className="size-3.5" />
                          Selecionando...
                        </>
                      ) : (
                        <>
                          <ImagePlus className="size-3.5" />
                          Recortar imagem
                        </>
                      )}
                    </Button>
                    {fotoRecorte ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={URL.createObjectURL(fotoRecorte)} alt="Recorte" className="h-8 w-8 shrink-0 rounded object-cover" />
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong>Ler com IA</strong>: arraste a caixa no produto inteiro (foto + código + preço)
                    pra preencher os campos. <strong>Recortar imagem</strong>: arraste só na foto limpa do
                    produto pra definir a imagem. Confira sempre antes de salvar.
                  </p>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={
                      salvando ||
                      !nomeProduto ||
                      !categoria ||
                      !unidadesPorCaixa ||
                      !custoUnitario ||
                      !pesoKg ||
                      !comprimentoCm ||
                      !larguraCm ||
                      !alturaCm
                    }
                  >
                    <Plus className="size-3.5" />
                    {salvando ? "Salvando..." : "Pré-cadastrar"}
                  </Button>
                </form>
              )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
