"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Star, Trash2, X, ChevronUp, ChevronDown, Barcode, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIAS } from "@/lib/constants";
import { VariacaoEditor, type Variacao } from "@/components/admin/variacao-editor";

type MlAtributoDetectado = {
  id: string;
  nome: string;
  tipo: string;
  valores: { id: string; nome: string }[] | null;
};

type MlAtributoValor = { value_id?: string; value_name?: string };

type CosmosCandidato = {
  gtin: number;
  description: string;
  brand: { name: string } | null;
  ncm: { code: string; description: string } | null;
  thumbnail?: string | null;
};

type DadosImportados = {
  nome?: string;
  titulo?: string;
  descricao?: string;
  marca?: string;
  modelo?: string;
  gtin?: string;
  mpn?: string;
  condicao?: string;
  atributos?: Record<string, string>;
  ncmSugerido?: string;
  categoriaSugerida?: string;
  tipoAnuncioSugerido?: string;
  garantiaTipoSugerida?: string;
  garantiaPrazoSugerido?: string;
  garantiaCondicoesSugeridas?: string;
  imagens?: string[];
};

type ImagemExistente = {
  id: string;
  url: string;
  alt: string | null;
  ordem: number;
  principal: boolean;
  destacarVitrine: boolean;
};

type ProdutoExistente = {
  id: string;
  sku: string;
  nome: string;
  descricao: string;
  categoria: string;
  subcategoria: string | null;
  precoAtacado: string | number;
  custoReal: string | number | null;
  ncm: string | null;
  pesoKg: string | number;
  dimensoes: { comprimento: number; largura: number; altura: number } | null;
  estoque: number;
  estoqueMinimo: number;
  tags: string[];
  atributos: Record<string, string> | null;
  marca: string | null;
  modelo: string | null;
  gtin: string | null;
  mpn: string | null;
  condicao: string | null;
  tipoAnuncio: string | null;
  garantiaTipo: string | null;
  garantiaPrazo: string | null;
  garantiaCondicoes: string | null;
  categoriaMlId: string | null;
  atributosMl: Record<string, MlAtributoValor> | null;
  descricaoHtml: string | null;
  ativo: boolean;
  destaque: boolean;
  imagens: ImagemExistente[];
  temVariacoes?: boolean;
  variacoes?: {
    tamanho: string;
    sizeValueId: string | null;
    cor: string;
    corValueId: string | null;
    estoque: number;
    precoAjuste: string | number | null;
    medidas: Record<string, string> | null;
    ordem: number;
    ativo: boolean;
  }[];
};

function gerarSku(categoria: string) {
  const prefixo = (categoria || "PROD").slice(0, 5).toUpperCase().replace(/[^A-Z]/g, "");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefixo || "PROD"}-${rand}`;
}

export function ProdutoForm({ produto }: { produto?: ProdutoExistente }) {
  const router = useRouter();
  const isEdit = !!produto;

  const [sku, setSku] = useState(produto?.sku ?? "");
  const [skuTocado, setSkuTocado] = useState(isEdit);
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [descricao, setDescricao] = useState(produto?.descricao ?? "");
  const [categoria, setCategoria] = useState(produto?.categoria ?? "");
  const [subcategoria, setSubcategoria] = useState(produto?.subcategoria ?? "");
  const [precoAtacado, setPrecoAtacado] = useState(String(produto?.precoAtacado ?? ""));
  const [precoAtacadoTocado, setPrecoAtacadoTocado] = useState(isEdit);
  const [custoReal, setCustoReal] = useState(String(produto?.custoReal ?? ""));
  const [margens, setMargens] = useState<{ margemPadrao: number; margemOperacional: number } | null>(null);
  const [pesoKg, setPesoKg] = useState(String(produto?.pesoKg ?? ""));
  const [comprimento, setComprimento] = useState(
    String(produto?.dimensoes?.comprimento ?? "")
  );
  const [largura, setLargura] = useState(String(produto?.dimensoes?.largura ?? ""));
  const [altura, setAltura] = useState(String(produto?.dimensoes?.altura ?? ""));
  const [estoque, setEstoque] = useState(String(produto?.estoque ?? "0"));
  const [estoqueMinimo, setEstoqueMinimo] = useState(String(produto?.estoqueMinimo ?? "5"));
  const [ativo, setAtivo] = useState(produto?.ativo ?? true);
  const [destaque, setDestaque] = useState(produto?.destaque ?? false);
  const [tags, setTags] = useState<string[]>(produto?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [atributos, setAtributos] = useState<{ chave: string; valor: string }[]>(
    produto?.atributos ? Object.entries(produto.atributos).map(([chave, valor]) => ({ chave, valor: String(valor) })) : []
  );
  const [imagens, setImagens] = useState<ImagemExistente[]>(produto?.imagens ?? []);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [temVariacoes, setTemVariacoes] = useState(produto?.temVariacoes ?? false);
  const [variacoes, setVariacoes] = useState<Variacao[]>(
    (produto?.variacoes ?? []).map((v) => ({
      tamanho: v.tamanho,
      sizeValueId: v.sizeValueId ?? undefined,
      cor: v.cor || undefined,
      corValueId: v.corValueId ?? undefined,
      estoque: v.estoque,
      precoAjuste: v.precoAjuste != null ? Number(v.precoAjuste) : undefined,
      medidas: (v.medidas as Record<string, string> | null) ?? {},
      ordem: v.ordem,
      ativo: v.ativo,
    }))
  );

  const [descricaoHtml, setDescricaoHtml] = useState(produto?.descricaoHtml ?? "");
  const [marca, setMarca] = useState(produto?.marca ?? "");
  const [modelo, setModelo] = useState(produto?.modelo ?? "");
  const [gtin, setGtin] = useState(produto?.gtin ?? "");
  const [mpn, setMpn] = useState(produto?.mpn ?? "");
  const [condicao, setCondicao] = useState(produto?.condicao ?? "Novo");
  const [tipoAnuncio, setTipoAnuncio] = useState(produto?.tipoAnuncio ?? "Clássico");
  const [garantiaTipo, setGarantiaTipo] = useState(produto?.garantiaTipo ?? "Garantia do vendedor");
  const [garantiaPrazo, setGarantiaPrazo] = useState(produto?.garantiaPrazo ?? "");
  const [garantiaCondicoes, setGarantiaCondicoes] = useState(produto?.garantiaCondicoes ?? "");
  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 10;
  const TITULOS_ETAPAS = [
    "Nome ou link de referência",
    "Categoria",
    "Dados do produto",
    "Variações",
    "Título do anúncio",
    "Características secundárias",
    "Descrição",
    "Precificação",
    "Tipo de anúncio",
    "Garantia e fotos",
  ];
  const [categoriaMlId, setCategoriaMlId] = useState(produto?.categoriaMlId ?? "");
  // Guarda o nome usado na última detecção bem-sucedida de categoria do ML — se o admin
  // mudar o nome depois, a categoria/atributos detectados ficam desatualizados (foi
  // exatamente isso que causou um anúncio publicado na categoria errada e fechado pelo
  // ML por "categoria incorreta"). Mostra aviso em vez de deixar passar em silêncio.
  const [nomeNaDeteccaoMl, setNomeNaDeteccaoMl] = useState(produto?.categoriaMlId ? produto?.nome ?? "" : "");
  const [atributosMlDetectados, setAtributosMlDetectados] = useState<MlAtributoDetectado[]>([]);
  const [candidatosCategoria, setCandidatosCategoria] = useState<
    { categoryId: string; categoryName: string; domainName: string }[]
  >([]);
  const [confirmandoCategoria, setConfirmandoCategoria] = useState(false);
  const [atributosMlValores, setAtributosMlValores] = useState<Record<string, MlAtributoValor>>(
    produto?.atributosMl ?? {}
  );
  const [detectandoMl, setDetectandoMl] = useState(false);
  const [otimizandoIa, setOtimizandoIa] = useState(false);
  const [linkImportarMl, setLinkImportarMl] = useState("");
  const [importandoMl, setImportandoMl] = useState(false);
  const [linkImportarIa, setLinkImportarIa] = useState("");
  const [nomeImportarIa, setNomeImportarIa] = useState("");
  const [importandoIa, setImportandoIa] = useState(false);
  const [ncmSugerido, setNcmSugerido] = useState("");
  const [ncm, setNcm] = useState(produto?.ncm ?? "");
  const [ncmBusca, setNcmBusca] = useState("");
  const [ncmResultados, setNcmResultados] = useState<{ codigo: string; descricao: string }[]>([]);
  const [buscandoNcm, setBuscandoNcm] = useState(false);
  const [sugerindoPreco, setSugerindoPreco] = useState(false);
  const [consultandoGtin, setConsultandoGtin] = useState(false);
  const [candidatosCosmos, setCandidatosCosmos] = useState<CosmosCandidato[]>([]);

  useEffect(() => {
    if (!ncmBusca.trim()) {
      setNcmResultados([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscandoNcm(true);
      try {
        const res = await fetch(`/api/admin/ncm/buscar?q=${encodeURIComponent(ncmBusca)}`);
        const { data } = await res.json();
        setNcmResultados(data ?? []);
      } catch {
        setNcmResultados([]);
      } finally {
        setBuscandoNcm(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [ncmBusca]);

  // Busca os dados da IA (link ou nome) e guarda em cache — os botões "Preencher
  // com IA" de cada etapa reaproveitam esse cache em vez de chamar a API de novo.
  async function buscarDadosIA(payload: { url?: string; nome?: string }): Promise<DadosImportados | null> {
    setImportandoIa(true);
    try {
      const res = await fetch("/api/admin/produtos/importar-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw await res.json();
      const { data } = await res.json();
      return data as DadosImportados;
    } catch (err) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? "Erro ao consultar a IA";
      toast.error(typeof message === "string" ? message : "Erro ao consultar a IA");
      return null;
    } finally {
      setImportandoIa(false);
    }
  }

  // Etapa 1: importa tudo de uma vez (link ou nome) e aplica em todos os campos.
  async function importarComIa(modo: "link" | "nome") {
    const payload =
      modo === "link" ? { url: linkImportarIa.trim() } : { nome: nomeImportarIa.trim() };
    if (modo === "link" && !payload.url) {
      toast.error("Cole o link do produto");
      return;
    }
    if (modo === "nome" && !payload.nome) {
      toast.error("Informe o nome do produto");
      return;
    }

    const data = await buscarDadosIA(payload);
    if (!data) return;

    if (data.titulo) setNome(data.titulo);
    else if (data.nome) setNome(data.nome);
    if (data.descricao) setDescricao(data.descricao);
    if (data.marca) setMarca(data.marca);
    if (data.modelo) setModelo(data.modelo);
    if (data.gtin) setGtin(data.gtin);
    if (data.mpn) setMpn(data.mpn);
    if (data.condicao) setCondicao(data.condicao);
    if (data.ncmSugerido) {
      setNcmSugerido(data.ncmSugerido);
      setNcmBusca(data.ncmSugerido);
    }
    if (data.atributos && Object.keys(data.atributos).length > 0) {
      setAtributos([
        ...atributos,
        ...Object.entries(data.atributos)
          .filter(([, valor]) => valor)
          .map(([chave, valor]) => ({ chave, valor })),
      ]);
    }
    if (!skuTocado && categoria) setSku(gerarSku(categoria));

    const novos: { file: File; preview: string }[] = [];
    for (const imgUrl of (data.imagens ?? []).slice(0, 8)) {
      try {
        const proxyRes = await fetch(
          `/api/admin/produtos/importar-link/imagem?url=${encodeURIComponent(imgUrl)}`
        );
        if (!proxyRes.ok) continue;
        const blob = await proxyRes.blob();
        const file = new File([blob], `ia-${Date.now()}-${novos.length}.jpg`, { type: blob.type });
        novos.push({ file, preview: URL.createObjectURL(file) });
      } catch {
        // ignora foto individual que falhar, segue com as demais
      }
    }
    setPendingFiles((prev) => [...prev, ...novos]);

    toast.success("Dados importados com IA — revise tudo (categoria, NCM e preço) antes de salvar");
  }

  // Usado pelos botões "Preencher com IA" das demais etapas. Sempre busca de
  // novo (não reusa cache antigo) pra refletir qualquer nome/link mais recente
  // — o `aplicar` retorna quantos campos de fato mudaram, pra avisar quando a
  // IA não souber preencher nada (em vez de parecer que o botão não funcionou).
  async function preencherEtapaComIA(aplicar: (data: DadosImportados) => number) {
    const fonte = linkImportarIa.trim()
      ? { url: linkImportarIa.trim() }
      : { nome: (nomeImportarIa || nome).trim() };
    if (!fonte.url && !fonte.nome) {
      toast.error("Informe o nome do produto na etapa 1 antes de usar a IA");
      return;
    }
    const data = await buscarDadosIA(fonte);
    if (!data) return;
    const preenchidos = aplicar(data);
    if (preenchidos > 0) {
      toast.success("Preenchido com IA — revise antes de avançar");
    } else {
      toast.info("A IA não encontrou dados confiáveis pra essa etapa — preencha manualmente");
    }
  }

  async function sugerirPrecoComIA() {
    if (!nome.trim() || !categoria || !custoReal) {
      toast.error("Preencha nome, categoria e custo real antes de pedir sugestão de preço");
      return;
    }
    setSugerindoPreco(true);
    try {
      const res = await fetch("/api/admin/produtos/sugerir-preco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, categoria, custoReal: Number(custoReal) }),
      });
      if (!res.ok) throw await res.json();
      const { data } = await res.json();
      setPrecoAtacado(String(data.precoSugerido));
      setPrecoAtacadoTocado(true);
      toast.success(`Preço sugerido: R$${data.precoSugerido} (margem ${data.margem}%) — ${data.justificativa}`);
    } catch (err) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? "Erro ao sugerir preço";
      toast.error(typeof message === "string" ? message : "Erro ao sugerir preço");
    } finally {
      setSugerindoPreco(false);
    }
  }

  useEffect(() => {
    fetch("/api/admin/configuracoes/financeiro")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) {
          setMargens({
            margemPadrao: Number(json.data.margemPadrao),
            margemOperacional: Number(json.data.margemOperacional),
          });
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!margens || precoAtacadoTocado) return;
    const custo = Number(custoReal);
    if (!custo) return;
    const preco = custo * (1 + margens.margemPadrao / 100) * (1 + margens.margemOperacional / 100);
    setPrecoAtacado((Math.round(preco * 100) / 100).toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custoReal, margens]);

  async function importarDoMl() {
    if (!linkImportarMl.trim()) {
      toast.error("Cole o link do anúncio do Mercado Livre");
      return;
    }
    setImportandoMl(true);
    try {
      const res = await fetch("/api/admin/produtos/importar-ml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkImportarMl }),
      });
      if (!res.ok) throw await res.json();
      const { data } = await res.json();

      setNome(data.nome);
      setDescricao(data.descricao);
      setCategoriaMlId(data.categoriaMlId);
      if (data.marca) setMarca(data.marca);
      setAtributosMlValores(data.atributosMl ?? {});
      if (!skuTocado) setSku(gerarSku(categoria));

      const novos: { file: File; preview: string }[] = [];
      for (const imgUrl of data.imagens as string[]) {
        try {
          const proxyRes = await fetch(`/api/admin/produtos/importar-ml/imagem?url=${encodeURIComponent(imgUrl)}`);
          if (!proxyRes.ok) continue;
          const blob = await proxyRes.blob();
          const file = new File([blob], `ml-${Date.now()}-${novos.length}.jpg`, { type: blob.type });
          novos.push({ file, preview: URL.createObjectURL(file) });
        } catch {
          // ignora foto individual que falhar, segue com as demais
        }
      }
      setPendingFiles((prev) => [...prev, ...novos]);

      toast.success(`Produto importado do ML — revise os dados e o preço de atacado antes de salvar`);
    } catch (err) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? "Erro ao importar do Mercado Livre";
      toast.error(typeof message === "string" ? message : "Erro ao importar do Mercado Livre");
    } finally {
      setImportandoMl(false);
    }
  }

  // Busca até 3 categorias REAIS candidatas (nunca aplica direto) — o admin confirma
  // qual é a certa em confirmarCategoriaCandidata antes de qualquer atributo ser
  // carregado. Evita repetir o caso "Creatina Gummies" indo pra categoria de animais
  // sem ningém perceber.
  async function detectarDadosMl() {
    if (!nome.trim()) {
      toast.error("Preencha o nome do produto antes de detectar a categoria do ML");
      return;
    }
    setDetectandoMl(true);
    setCandidatosCategoria([]);
    try {
      const res = await fetch("/api/admin/produtos/ml-categoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: nome }),
      });
      if (!res.ok) throw await res.json();
      const { data } = await res.json();
      setCandidatosCategoria(data.candidatos);
    } catch (err) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? "Erro ao detectar dados do ML";
      toast.error(typeof message === "string" ? message : "Erro ao detectar dados do ML");
    } finally {
      setDetectandoMl(false);
    }
  }

  async function confirmarCategoriaCandidata(candidato: { categoryId: string; categoryName: string }) {
    setConfirmandoCategoria(true);
    try {
      const res = await fetch("/api/admin/produtos/ml-categoria", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: candidato.categoryId }),
      });
      if (!res.ok) throw await res.json();
      const { data } = await res.json();
      setCategoriaMlId(candidato.categoryId);
      setAtributosMlDetectados(data.atributos);
      setNomeNaDeteccaoMl(nome);
      setCandidatosCategoria([]);
      toast.success(`Categoria confirmada: ${candidato.categoryName}`);
    } catch (err) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? "Erro ao confirmar categoria";
      toast.error(typeof message === "string" ? message : "Erro ao confirmar categoria");
    } finally {
      setConfirmandoCategoria(false);
    }
  }

  // Consulta dados reais do fabricante na Cosmos API — por GTIN/EAN (resultado
  // único e direto) ou, se não tiver o código, por nome (pode retornar vários
  // candidatos, mostra lista pra confirmar qual é o produto certo). Nunca
  // sobrescreve campos já preenchidos manualmente, só completa o que está vazio.
  function aplicarDadosCosmos(produto: CosmosCandidato) {
    let preenchidos = 0;
    let semDadoNaCosmos = 0;

    if (!marca.trim()) {
      if (produto.brand?.name) {
        setMarca(produto.brand.name);
        preenchidos++;
      } else {
        semDadoNaCosmos++;
      }
    }
    if (produto.description && !nome.trim()) {
      setNome(produto.description);
      preenchidos++;
    }
    if (!ncm.trim()) {
      if (produto.ncm?.code) {
        setNcm(produto.ncm.code);
        setNcmBusca("");
        preenchidos++;
      } else {
        semDadoNaCosmos++;
      }
    }
    if (produto.gtin && !gtin.trim()) {
      setGtin(String(produto.gtin));
      preenchidos++;
    }
    setCandidatosCosmos([]);

    if (preenchidos > 0) {
      toast.success(
        `Dados do fabricante encontrados — ${preenchidos} campo(s) preenchido(s)` +
          (semDadoNaCosmos > 0 ? ` (a Cosmos não tinha ${semDadoNaCosmos} dado(s) cadastrado(s) pra esse produto)` : "")
      );
    } else if (semDadoNaCosmos > 0) {
      toast.error(
        `Produto encontrado ("${produto.description}"), mas a Cosmos não tem marca/NCM cadastrados pra esse GTIN — preencha manualmente.`
      );
    } else {
      toast.success("Produto encontrado, mas os campos já estavam preenchidos");
    }
  }

  async function consultarGtin() {
    if (!gtin.trim() && !nome.trim()) {
      toast.error("Informe o GTIN/EAN ou o nome do produto antes de consultar");
      return;
    }
    setConsultandoGtin(true);
    setCandidatosCosmos([]);
    try {
      const res = await fetch("/api/admin/produtos/consultar-gtin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gtin.trim() ? { gtin: gtin.trim() } : { query: nome.trim() }),
      });
      if (!res.ok) throw await res.json();
      const { data } = await res.json();
      if (data.produto) {
        aplicarDadosCosmos(data.produto);
      } else if (data.candidatos.length === 1) {
        aplicarDadosCosmos(data.candidatos[0]);
      } else if (data.candidatos.length > 1) {
        setCandidatosCosmos(data.candidatos);
      } else {
        toast.error("Nenhum produto encontrado na Cosmos");
      }
    } catch (err) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? "Erro ao consultar Cosmos";
      toast.error(typeof message === "string" ? message : "Erro ao consultar Cosmos");
    } finally {
      setConsultandoGtin(false);
    }
  }

  function setAtributoMlValor(attrId: string, valor: MlAtributoValor) {
    setAtributosMlValores((prev) => ({ ...prev, [attrId]: valor }));
  }

  // Pra atributos que a categoria do ML realmente oferece "Não se aplica" como
  // valor (existe na lista de "valores" retornada pela própria API do ML — não
  // é invenção nossa) e que ainda estão vazios, marca essa opção. Não tem efeito
  // em atributos sem essa opção real (ex: GTIN, que é texto livre sem "valores").
  const naoSeAplicaRegex = /n[aã]o se aplica|n[aã]o aplic[aá]vel|no aplica/i;
  function aplicarNaoSeAplicaNosVazios() {
    let aplicados = 0;
    for (const attr of atributosMlDetectados) {
      if (atributosMlValores[attr.id]?.value_id || atributosMlValores[attr.id]?.value_name) continue;
      const opcaoNaoSeAplica = attr.valores?.find((v) => naoSeAplicaRegex.test(v.nome));
      if (opcaoNaoSeAplica) {
        setAtributoMlValor(attr.id, { value_id: opcaoNaoSeAplica.id });
        aplicados++;
      }
    }
    if (aplicados > 0) {
      toast.success(`${aplicados} atributo(s) marcado(s) como "Não se aplica"`);
    } else {
      toast.info('Nenhum atributo vazio tem a opção "Não se aplica" disponível nesta categoria');
    }
  }

  async function otimizarComIa() {
    if (!nome.trim() || !descricao.trim() || !categoria) {
      toast.error("Preencha nome, descrição e categoria antes de otimizar com IA");
      return;
    }
    setOtimizandoIa(true);
    try {
      const res = await fetch("/api/admin/produtos/otimizar-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          descricao,
          categoria,
          atributos: Object.fromEntries(atributos.filter((a) => a.chave).map((a) => [a.chave, a.valor])),
        }),
      });
      if (!res.ok) throw await res.json();
      const { data } = await res.json();
      if (data.titulo) setNome(data.titulo);
      setDescricaoHtml(data.descricao);
      setTags((prev) => Array.from(new Set([...prev, ...data.palavrasChave])));
      toast.success("Anúncio otimizado com IA — confira o título, a descrição HTML e as tags sugeridas");
    } catch (err) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? "Erro ao otimizar com IA";
      toast.error(typeof message === "string" ? message : "Erro ao otimizar com IA");
    } finally {
      setOtimizandoIa(false);
    }
  }

  function handleCategoriaChange(value: string | null) {
    if (!value) return;
    setCategoria(value);
    if (!skuTocado) setSku(gerarSku(value));
  }

  function addTag() {
    const value = tagInput.trim();
    if (value && !tags.includes(value)) setTags([...tags, value]);
    setTagInput("");
  }

  function addAtributo() {
    setAtributos([...atributos, { chave: "", valor: "" }]);
  }

  function updateAtributo(index: number, field: "chave" | "valor", value: string) {
    setAtributos(atributos.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  }

  function removeAtributo(index: number) {
    setAtributos(atributos.filter((_, i) => i !== index));
  }

  function onFilesSelected(files: FileList | null) {
    if (!files) return;
    const novos = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingFiles([...pendingFiles, ...novos]);
  }

  async function uploadImagem(produtoId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/admin/produtos/${produtoId}/imagens`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Falha ao enviar imagem");
    const data = await res.json();
    return data.data as ImagemExistente;
  }

  async function removerImagemExistente(imgId: string) {
    if (!produto) return;
    const res = await fetch(`/api/admin/produtos/${produto.id}/imagens/${imgId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Erro ao remover imagem");
      return;
    }
    setImagens(imagens.filter((img) => img.id !== imgId));
  }

  async function marcarPrincipal(imgId: string) {
    if (!produto) return;
    const res = await fetch(`/api/admin/produtos/${produto.id}/imagens/${imgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ principal: true }),
    });
    if (!res.ok) {
      toast.error("Erro ao definir imagem principal");
      return;
    }
    setImagens(imagens.map((img) => ({ ...img, principal: img.id === imgId })));
  }

  async function marcarDestacarVitrine(imgId: string) {
    if (!produto) return;
    const res = await fetch(`/api/admin/produtos/${produto.id}/imagens/${imgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destacarVitrine: true }),
    });
    if (!res.ok) {
      toast.error("Erro ao definir imagem da vitrine");
      return;
    }
    setImagens(imagens.map((img) => ({ ...img, destacarVitrine: img.id === imgId })));
  }

  function moverImagem(index: number, direction: -1 | 1) {
    const novaOrdem = [...imagens];
    const target = index + direction;
    if (target < 0 || target >= novaOrdem.length) return;
    [novaOrdem[index], novaOrdem[target]] = [novaOrdem[target], novaOrdem[index]];
    setImagens(novaOrdem);
    if (produto) {
      novaOrdem.forEach((img, i) => {
        fetch(`/api/admin/produtos/${produto.id}/imagens/${img.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ordem: i }),
        }).catch(() => {});
      });
    }
  }

  function removerPendingFile(index: number) {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index));
  }

  function buildPayload() {
    return {
      sku,
      nome,
      descricao,
      categoria,
      subcategoria: subcategoria || undefined,
      precoAtacado: Number(precoAtacado),
      custoReal: custoReal ? Number(custoReal) : undefined,
      ncm: ncm || undefined,
      pesoKg: Number(pesoKg),
      dimensoes:
        comprimento && largura && altura
          ? {
              comprimento: Number(comprimento),
              largura: Number(largura),
              altura: Number(altura),
            }
          : undefined,
      estoque: Number(estoque),
      estoqueMinimo: Number(estoqueMinimo),
      ativo,
      destaque,
      tags,
      atributos: atributos.length
        ? Object.fromEntries(atributos.filter((a) => a.chave).map((a) => [a.chave, a.valor]))
        : undefined,
      descricaoHtml: descricaoHtml || undefined,
      marca: marca || undefined,
      modelo: modelo || undefined,
      gtin: gtin || undefined,
      mpn: mpn || undefined,
      condicao: condicao || undefined,
      tipoAnuncio: tipoAnuncio || undefined,
      garantiaTipo: garantiaTipo || undefined,
      garantiaPrazo: garantiaPrazo || undefined,
      garantiaCondicoes: garantiaCondicoes || undefined,
      categoriaMlId: categoriaMlId || undefined,
      atributosMl: (() => {
        const completo = { ...atributosMlValores };
        if (marca) completo.BRAND = { value_name: marca };
        if (modelo) completo.MODEL = { value_name: modelo };
        return Object.keys(completo).length ? completo : undefined;
      })(),
      temVariacoes,
      variacoes: temVariacoes ? variacoes.filter((v) => v.tamanho.trim()) : [],
    };
  }

  // Envia as imagens pendentes uma a uma sem deixar uma falha (ex: foto menor
  // que 500x500px) travar o restante — o produto já foi criado/salvo nesse
  // ponto, então abortar no meio deixaria o admin sem saber que precisa só
  // trocar a foto problemática, e ainda travado num SKU já existente.
  async function enviarImagensPendentes(produtoId: string): Promise<number> {
    let falhas = 0;
    const restantes: { file: File; preview: string }[] = [];
    for (const pf of pendingFiles) {
      try {
        const img = await uploadImagem(produtoId, pf.file);
        setImagens((prev) => [...prev, img]);
      } catch (err) {
        falhas++;
        restantes.push(pf);
        const message =
          (err as { error?: { message?: string } })?.error?.message ?? "Falha ao enviar imagem";
        toast.error(typeof message === "string" ? message : "Falha ao enviar imagem");
      }
    }
    setPendingFiles(restantes);
    return falhas;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isEdit && imagens.length === 0 && pendingFiles.length === 0) {
      toast.error("Adicione pelo menos uma imagem do produto");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        const res = await fetch(`/api/admin/produtos/${produto.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        if (!res.ok) throw await res.json();

        const falhas = await enviarImagensPendentes(produto.id);
        toast.success(
          falhas > 0
            ? `Produto atualizado — ${falhas} foto(s) não foram enviadas, revise e tente novamente`
            : "Produto atualizado"
        );
        router.refresh();
      } else {
        const res = await fetch("/api/admin/produtos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        if (!res.ok) throw await res.json();
        const { data: novoProduto } = await res.json();

        const falhas = await enviarImagensPendentes(novoProduto.id);
        toast.success(
          falhas > 0
            ? `Produto criado — ${falhas} foto(s) não foram enviadas, edite o produto pra revisar`
            : "Produto criado"
        );
        router.push(`/admin/produtos/${novoProduto.id}`);
      }
    } catch (err) {
      if ((err as { error?: { code?: string } })?.error?.code === "SKU_IN_USE") {
        toast.error(
          "Já existe um produto com este SKU — se você tentou salvar antes e algumas fotos falharam, o produto provavelmente já foi criado. Veja a lista de produtos ou troque o SKU."
        );
        setLoading(false);
        return;
      }
      const message =
        (err as { error?: { message?: string } })?.error?.message ?? "Erro ao salvar produto";
      toast.error(typeof message === "string" ? message : "Erro ao salvar produto");
    } finally {
      setLoading(false);
    }
  }

  // No cadastro de produto novo, o formulário roda como wizard de 10 etapas
  // (uma de cada vez). Na edição mostramos tudo numa página só, como antes.
  const mostrar = (n: number) => (isEdit ? true : step === n);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {!isEdit && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Etapa {step} de {TOTAL_STEPS}: {TITULOS_ETAPAS[step - 1]}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      )}

      {mostrar(1) && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Importar do Mercado Livre</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Cole o link de um anúncio do ML pra preencher nome, descrição, categoria, marca e
                fotos automaticamente. Revise tudo (especialmente o preço de atacado) antes de salvar.
              </p>
              <div className="flex gap-2">
                <Input
                  value={linkImportarMl}
                  onChange={(e) => setLinkImportarMl(e.target.value)}
                  placeholder="https://www.mercadolivre.com.br/.../MLB1234567890"
                />
                <Button type="button" variant="outline" disabled={importandoMl} onClick={importarDoMl}>
                  {importandoMl ? "Importando..." : "Importar"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadastro inteligente com IA</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Cole o link de um produto (Mercado Livre, Shopee, Alibaba, AliExpress) <strong>ou</strong>{" "}
                informe só o nome do produto. A IA preenche nome, título otimizado, descrição, marca,
                modelo, GTIN/MPN, condição, atributos e fotos (quando vier de link).{" "}
                <strong>Melhor esforço</strong>: pode falhar em sites com proteção anti-bot forte (comum
                em Alibaba/AliExpress/Shopee). NCM e categoria vêm sempre como sugestão — confirme antes
                de publicar.
              </p>
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Link de referência</Label>
                <div className="flex gap-2">
                  <Input
                    value={linkImportarIa}
                    onChange={(e) => setLinkImportarIa(e.target.value)}
                    placeholder="https://..."
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={importandoIa}
                    onClick={() => importarComIa("link")}
                  >
                    {importandoIa ? "Importando..." : "Importar"}
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground">Ou só o nome do produto</Label>
                <div className="flex gap-2">
                  <Input
                    value={nomeImportarIa}
                    onChange={(e) => setNomeImportarIa(e.target.value)}
                    placeholder="Ex: Fone de ouvido bluetooth TWS com cancelamento de ruído"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={importandoIa}
                    onClick={() => importarComIa("nome")}
                  >
                    {importandoIa ? "Importando..." : "Gerar"}
                  </Button>
                </div>
              </div>
              {ncmSugerido && (
                <p className="text-xs text-muted-foreground">
                  NCM sugerido pela IA: <span className="font-mono font-medium">{ncmSugerido}</span>{" "}
                  — confira e escolha o código oficial na etapa de Dados do produto.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nome do produto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
            </CardContent>
          </Card>
        </>
      )}

      {mostrar(2) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Categoria</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>Categoria</Label>
                <Select value={categoria} onValueChange={handleCategoriaChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Subcategoria</Label>
                <Input value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={importandoIa}
                onClick={() =>
                  preencherEtapaComIA((data) => {
                    if (!data.categoriaSugerida) return 0;
                    const match = CATEGORIAS.find(
                      (c) =>
                        c.toLowerCase().includes(data.categoriaSugerida!.toLowerCase()) ||
                        data.categoriaSugerida!.toLowerCase().includes(c.toLowerCase())
                    );
                    handleCategoriaChange(match ?? data.categoriaSugerida ?? null);
                    return 1;
                  })
                }
              >
                {importandoIa ? "Preenchendo..." : "Preencher com IA"}
              </Button>
              <Button type="button" variant="outline" disabled={detectandoMl} onClick={detectarDadosMl}>
                {detectandoMl ? "Buscando..." : "Detectar categoria do ML"}
              </Button>
              {categoriaMlId && (
                <span className="text-xs text-muted-foreground">Categoria ML confirmada: {categoriaMlId}</span>
              )}
              {categoriaMlId && nome.trim() && nome !== nomeNaDeteccaoMl && (
                <p className="w-full rounded-md bg-destructive/10 p-2 text-xs font-medium text-destructive">
                  O nome mudou desde a última detecção — a categoria do ML pode estar
                  desatualizada e o anúncio pode ser fechado pelo ML por "categoria
                  incorreta". Clique em "Detectar categoria" novamente antes de publicar.
                </p>
              )}
              {candidatosCategoria.length > 0 && (
                <div className="flex w-full flex-col gap-2 rounded-md border border-border bg-muted/40 p-3">
                  <span className="text-xs font-medium">
                    A busca real do Mercado Livre encontrou estas categorias — confira qual faz sentido
                    e confirme (a busca por título pode errar, ex: nome de marca/sabor levando a uma
                    categoria errada):
                  </span>
                  {candidatosCategoria.map((c) => (
                    <button
                      key={c.categoryId}
                      type="button"
                      disabled={confirmandoCategoria}
                      onClick={() => confirmarCategoriaCandidata(c)}
                      className="flex flex-col items-start rounded-md border border-border bg-card p-2 text-left text-sm hover:border-primary disabled:opacity-50"
                    >
                      <span className="font-medium">{c.categoryName}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.domainName} — {c.categoryId}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {mostrar(3) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do produto</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={importandoIa}
              onClick={() =>
                preencherEtapaComIA((data) => {
                  let n = 0;
                  if (data.marca) { setMarca(data.marca); n++; }
                  if (data.modelo) { setModelo(data.modelo); n++; }
                  if (data.gtin) { setGtin(data.gtin); n++; }
                  if (data.mpn) { setMpn(data.mpn); n++; }
                  if (data.condicao) { setCondicao(data.condicao); n++; }
                  if (data.ncmSugerido) {
                    setNcmSugerido(data.ncmSugerido);
                    setNcmBusca(data.ncmSugerido);
                    n++;
                  }
                  return n;
                })
              }
            >
              {importandoIa ? "Preenchendo..." : "Preencher com IA"}
            </Button>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>SKU</Label>
                <Input
                  value={sku}
                  onChange={(e) => {
                    setSku(e.target.value);
                    setSkuTocado(true);
                  }}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Condição</Label>
                <Select value={condicao} onValueChange={(v) => setCondicao(v ?? "Novo")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Novo">Novo</SelectItem>
                    <SelectItem value="Usado">Usado</SelectItem>
                    <SelectItem value="Recondicionado">Recondicionado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(() => {
                const obrigatoriosIds = new Set(atributosMlDetectados.map((a) => a.id));
                const avisoML = (id: string) =>
                  obrigatoriosIds.has(id) ? (
                    <span className="text-xs font-medium text-destructive">
                      {" "}— obrigatório nessa categoria do ML
                    </span>
                  ) : null;
                const borda = (id: string, valor: string) =>
                  obrigatoriosIds.has(id) && !valor ? "border-destructive" : undefined;
                return (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label>
                        Marca{avisoML("BRAND")}
                      </Label>
                      <Input
                        className={borda("BRAND", marca)}
                        value={marca}
                        onChange={(e) => setMarca(e.target.value)}
                        placeholder="ex: Genérica, Apple, Samsung..."
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>
                        Modelo{avisoML("MODEL")}
                      </Label>
                      <Input
                        className={borda("MODEL", modelo)}
                        value={modelo}
                        onChange={(e) => setModelo(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>
                        GTIN/EAN{avisoML("GTIN")}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          className={borda("GTIN", gtin)}
                          value={gtin}
                          onChange={(e) => setGtin(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={consultandoGtin}
                          onClick={consultarGtin}
                          title={
                            gtin.trim()
                              ? "Consultar dados do fabricante pelo GTIN (Cosmos API)"
                              : "Buscar produto pelo nome na Cosmos API (sem GTIN)"
                          }
                        >
                          <Barcode className="size-4" />
                        </Button>
                      </div>
                      {!gtin.trim() && (
                        <span className="text-xs text-muted-foreground">
                          Sem GTIN, busca pelo nome do produto preenchido acima.
                        </span>
                      )}
                      {candidatosCosmos.length > 0 && (
                        <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 p-2">
                          <span className="text-xs text-muted-foreground">
                            Vários resultados encontrados — escolha o produto certo:
                          </span>
                          {candidatosCosmos.map((c) => (
                            <button
                              key={c.gtin}
                              type="button"
                              onClick={() => aplicarDadosCosmos(c)}
                              className="rounded-md border border-border bg-background p-2 text-left text-xs hover:bg-accent"
                            >
                              <span className="font-medium">{c.description}</span>
                              <br />
                              <span className="text-muted-foreground">
                                GTIN {c.gtin}
                                {c.brand?.name ? ` — ${c.brand.name}` : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>
                        MPN{avisoML("MPN")}
                      </Label>
                      <Input
                        className={borda("MPN", mpn)}
                        value={mpn}
                        onChange={(e) => setMpn(e.target.value)}
                      />
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="relative flex flex-col gap-2 sm:max-w-md">
              <Label>NCM</Label>
              <Input
                value={ncm ? `${ncm}` : ncmBusca}
                onChange={(e) => {
                  setNcm("");
                  setNcmBusca(e.target.value);
                }}
                placeholder="Busque por código ou descrição"
              />
              {ncm && (
                <span className="text-xs text-muted-foreground">
                  Selecionado:{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      setNcm("");
                      setNcmBusca("");
                    }}
                  >
                    limpar
                  </button>
                </span>
              )}
              {!ncm && ncmBusca.trim() && (
                <div className="absolute top-full z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover shadow-md">
                  {buscandoNcm && <p className="p-2 text-xs text-muted-foreground">Buscando...</p>}
                  {!buscandoNcm && ncmResultados.length === 0 && (
                    <p className="p-2 text-xs text-muted-foreground">Nenhum código encontrado</p>
                  )}
                  {ncmResultados.map((r) => (
                    <button
                      key={r.codigo}
                      type="button"
                      className="block w-full px-2 py-1.5 text-left text-xs hover:bg-accent"
                      onClick={() => {
                        setNcm(r.codigo);
                        setNcmBusca("");
                        setNcmResultados([]);
                      }}
                    >
                      <span className="font-mono font-medium">{r.codigo}</span> — {r.descricao}
                    </button>
                  ))}
                </div>
              )}
              <span className="text-xs text-muted-foreground">
                Busca na Tabela NCM oficial (Siscomex). Confirme em caso de dúvida no{" "}
                <a
                  href="https://portalunico.siscomex.gov.br/classif/#/sumario?perfil=publico"
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Portal Único Siscomex
                </a>
                .
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {mostrar(4) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Variações</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Cor, tamanho, voltagem, capacidade, material, quantidade, dimensões e peso — preenchidos
              como atributos do produto.
            </p>
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={importandoIa}
              onClick={() =>
                preencherEtapaComIA((data) => {
                  const entradas = data.atributos
                    ? Object.entries(data.atributos).filter(([, valor]) => valor)
                    : [];
                  if (entradas.length > 0) {
                    setAtributos((prev) => [
                      ...prev,
                      ...entradas.map(([chave, valor]) => ({ chave, valor })),
                    ]);
                  }
                  return entradas.length;
                })
              }
            >
              {importandoIa ? "Preenchendo..." : "Preencher com IA"}
            </Button>
            <div className="flex flex-col gap-2">
              <Label>Atributos de variação</Label>
              {atributos.map((attr, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="chave (ex: cor)"
                    value={attr.chave}
                    onChange={(e) => updateAtributo(index, "chave", e.target.value)}
                  />
                  <Input
                    placeholder="valor (ex: azul)"
                    value={attr.valor}
                    onChange={(e) => updateAtributo(index, "valor", e.target.value)}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeAtributo(index)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" className="w-fit" onClick={addAtributo}>
                + Adicionar atributo
              </Button>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={temVariacoes}
                onChange={(e) => setTemVariacoes(e.target.checked)}
              />
              Este produto tem variações de tamanho (P/M/G ou numeração)?
            </label>
            {temVariacoes && (
              <VariacaoEditor
                categoryId={categoriaMlId}
                variacoes={variacoes}
                onChange={setVariacoes}
              />
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Comprimento (cm)</Label>
                <Input type="number" min="0" value={comprimento} onChange={(e) => setComprimento(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Largura (cm)</Label>
                <Input type="number" min="0" value={largura} onChange={(e) => setLargura(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Altura (cm)</Label>
                <Input type="number" min="0" value={altura} onChange={(e) => setAltura(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{temVariacoes ? "Estoque atual (soma das variações)" : "Estoque atual"}</Label>
                <Input
                  type="number"
                  min="0"
                  value={temVariacoes ? variacoes.reduce((soma, v) => soma + (v.estoque || 0), 0) : estoque}
                  onChange={(e) => setEstoque(e.target.value)}
                  disabled={temVariacoes}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Estoque mínimo (alerta)</Label>
                <Input
                  type="number"
                  min="0"
                  value={estoqueMinimo}
                  onChange={(e) => setEstoqueMinimo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mostrar(5) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Título do anúncio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Gere um título otimizado para SEO e conversão com base no nome, descrição e categoria já
              informados.
            </p>
            <Button type="button" variant="outline" className="w-fit" disabled={otimizandoIa} onClick={otimizarComIa}>
              {otimizandoIa ? "Gerando..." : "Gerar título otimizado com IA"}
            </Button>
            <div className="flex flex-col gap-2">
              <Label>Título / nome do anúncio</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={60} />
              <span className="text-xs text-muted-foreground">{nome.length}/60 caracteres</span>
            </div>
          </CardContent>
        </Card>
      )}

      {mostrar(6) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Características secundárias</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button type="button" variant="outline" className="w-fit" disabled={otimizandoIa} onClick={otimizarComIa}>
              {otimizandoIa ? "Preenchendo..." : "Preencher com IA (tags e atributos)"}
            </Button>
            <div className="flex flex-col gap-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                  >
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Digite e pressione Enter"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Adicionar
                </Button>
              </div>
            </div>

            {atributosMlDetectados.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>Atributos obrigatórios do ML</Label>
                  <button
                    type="button"
                    onClick={aplicarNaoSeAplicaNosVazios}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Marcar &quot;Não se aplica&quot; nos vazios
                  </button>
                </div>
                {atributosMlDetectados
                  .filter((attr) => !["BRAND", "MODEL", "GTIN", "MPN"].includes(attr.id))
                  .map((attr) => {
                    const preenchido = attr.valores
                      ? !!atributosMlValores[attr.id]?.value_id
                      : !!atributosMlValores[attr.id]?.value_name;
                    return (
                      <div key={attr.id} className="flex flex-col gap-1">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {attr.nome}
                          {!preenchido && (
                            <span className="font-medium text-destructive">
                              — obrigatório, sem isso a publicação no ML vai falhar
                            </span>
                          )}
                        </span>
                        {attr.valores ? (
                          <Select
                            value={atributosMlValores[attr.id]?.value_id ?? ""}
                            onValueChange={(v) => v && setAtributoMlValor(attr.id, { value_id: v })}
                          >
                            <SelectTrigger className={!preenchido ? "border-destructive" : undefined}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {attr.valores.map((v) => (
                                <SelectItem key={v.id} value={v.id}>
                                  {v.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className={!preenchido ? "border-destructive" : undefined}
                            value={atributosMlValores[attr.id]?.value_name ?? ""}
                            onChange={(e) => setAtributoMlValor(attr.id, { value_name: e.target.value })}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mostrar(7) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Descrição</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={importandoIa}
              onClick={() =>
                preencherEtapaComIA((data) => {
                  if (!data.descricao) return 0;
                  setDescricao(data.descricao);
                  return 1;
                })
              }
            >
              {importandoIa ? "Preenchendo..." : "Preencher com IA"}
            </Button>
            <div className="flex flex-col gap-2">
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Descrição HTML (anúncio ML otimizado)</Label>
              <Textarea
                value={descricaoHtml}
                onChange={(e) => setDescricaoHtml(e.target.value)}
                rows={6}
                placeholder="Gerado automaticamente pelo botão 'Gerar título otimizado com IA' (etapa anterior), ou edite manualmente"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {mostrar(8) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Precificação</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={sugerindoPreco}
              onClick={sugerirPrecoComIA}
            >
              {sugerindoPreco ? "Sugerindo..." : "Sugerir preço com IA"}
            </Button>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label>Custo real (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={custoReal}
                onChange={(e) => setCustoReal(e.target.value)}
                placeholder="Quanto você paga ao fornecedor"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Preço de atacado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={precoAtacado}
                onChange={(e) => {
                  setPrecoAtacado(e.target.value);
                  setPrecoAtacadoTocado(true);
                }}
                required
              />
              {margens && (
                <span className="text-xs text-muted-foreground">
                  Sugestão automática: custo × {(1 + margens.margemPadrao / 100).toFixed(2)} ×{" "}
                  {(1 + margens.margemOperacional / 100).toFixed(2)} (margens em Configurações)
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label>Lucro estimado (R$)</Label>
              <Input
                disabled
                value={
                  custoReal && precoAtacado
                    ? (Number(precoAtacado) - Number(custoReal)).toFixed(2)
                    : ""
                }
              />
            </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mostrar(9) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipo de anúncio</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:max-w-xs">
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={importandoIa}
              onClick={() =>
                preencherEtapaComIA((data) => {
                  if (!data.tipoAnuncioSugerido) return 0;
                  setTipoAnuncio(data.tipoAnuncioSugerido);
                  return 1;
                })
              }
            >
              {importandoIa ? "Preenchendo..." : "Preencher com IA"}
            </Button>
            <Label>Formato do anúncio</Label>
            <Select value={tipoAnuncio} onValueChange={(v) => setTipoAnuncio(v ?? "Clássico")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Clássico">Clássico</SelectItem>
                <SelectItem value="Premium">Premium</SelectItem>
                <SelectItem value="Destaque">Destaque</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              Premium/Destaque têm taxa maior no ML em troca de mais exposição e parcelamento.
            </span>
          </CardContent>
        </Card>
      )}

      {mostrar(10) && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Garantia</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={importandoIa}
              onClick={() =>
                preencherEtapaComIA((data) => {
                  let n = 0;
                  if (data.garantiaTipoSugerida) { setGarantiaTipo(data.garantiaTipoSugerida); n++; }
                  if (data.garantiaPrazoSugerido) { setGarantiaPrazo(data.garantiaPrazoSugerido); n++; }
                  if (data.garantiaCondicoesSugeridas) { setGarantiaCondicoes(data.garantiaCondicoesSugeridas); n++; }
                  return n;
                })
              }
            >
              {importandoIa ? "Preenchendo..." : "Preencher com IA"}
            </Button>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label>Tipo de garantia</Label>
                <Select value={garantiaTipo} onValueChange={(v) => v && setGarantiaTipo(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Garantia do fabricante">Garantia do fabricante</SelectItem>
                    <SelectItem value="Garantia do vendedor">Garantia do vendedor</SelectItem>
                    <SelectItem value="Sem garantia">Sem garantia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Prazo</Label>
                <Input
                  value={garantiaPrazo}
                  onChange={(e) => setGarantiaPrazo(e.target.value)}
                  placeholder="ex: 12 meses"
                />
              </div>
              <div className="flex flex-col gap-2 sm:col-span-3">
                <Label>Condições da garantia</Label>
                <Textarea
                  value={garantiaCondicoes}
                  onChange={(e) => setGarantiaCondicoes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Imagens</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {(() => {
                const totalFotos = imagens.length + pendingFiles.length;
                const RECOMENDADO = 6;
                return (
                  <p className={`text-sm ${totalFotos < RECOMENDADO ? "text-warning" : "text-success"}`}>
                    {totalFotos} de {RECOMENDADO} fotos recomendadas pelo Mercado Livre
                    {totalFotos < RECOMENDADO && " — anúncios com mais fotos têm melhor qualidade e conversão"}
                  </p>
                );
              })()}
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
                Marque com a <Star className="inline size-3" /> a foto que vai virar a <strong>capa do
                anúncio</strong> nos marketplaces (é sempre a 1ª foto enviada ao ML, independente da
                ordem das outras). Diretrizes do ML para a capa: fundo branco/neutro, produto ocupando
                a maior parte do quadro, sem texto, marca-d&apos;água, logo ou colagem de várias fotos.
                Marque com o <Megaphone className="inline size-3" /> a foto que vai virar a{" "}
                <strong>capa da vitrine pública</strong> — pode ser uma foto diferente, mais de
                marketing, sem essas exigências do marketplace.
              </p>
              <Input type="file" accept="image/*" multiple onChange={(e) => onFilesSelected(e.target.files)} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {imagens.map((img, index) => (
                  <div key={img.id} className="relative overflow-hidden rounded-md border border-border">
                    <div className="relative aspect-square">
                      <Image src={img.url} alt={img.alt ?? nome} fill className="object-cover" />
                    </div>
                    <div className="flex items-center justify-between gap-1 bg-card p-1">
                      <button
                        type="button"
                        onClick={() => marcarPrincipal(img.id)}
                        title="Marcar como capa do marketplace"
                      >
                        <Star
                          className={`size-4 ${img.principal ? "fill-warning text-warning" : "text-muted-foreground"}`}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => marcarDestacarVitrine(img.id)}
                        title="Marcar como capa da vitrine"
                      >
                        <Megaphone
                          className={`size-4 ${img.destacarVitrine ? "fill-primary text-primary" : "text-muted-foreground"}`}
                        />
                      </button>
                      <div className="flex gap-0.5">
                        <button type="button" onClick={() => moverImagem(index, -1)}>
                          <ChevronUp className="size-4 text-muted-foreground" />
                        </button>
                        <button type="button" onClick={() => moverImagem(index, 1)}>
                          <ChevronDown className="size-4 text-muted-foreground" />
                        </button>
                      </div>
                      <button type="button" onClick={() => removerImagemExistente(img.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
                {pendingFiles.map((pf, index) => (
                  <div key={index} className="relative overflow-hidden rounded-md border border-dashed border-border">
                    <div className="relative aspect-square">
                      <Image src={pf.preview} alt="" fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex items-center justify-between bg-card p-1">
                      <span className="text-xs text-muted-foreground">novo</span>
                      <button type="button" onClick={() => removerPendingFile(index)}>
                        <Trash2 className="size-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
                Ativo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={destaque} onChange={(e) => setDestaque(e.target.checked)} />
                Destaque
              </label>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-between gap-2">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => router.push("/admin/produtos")}>
            Cancelar
          </Button>
          {!isEdit && step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))}>
              Voltar
            </Button>
          )}
        </div>
        {!isEdit && step < TOTAL_STEPS ? (
          <Button type="button" onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}>
            Avançar
          </Button>
        ) : (
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar produto"}
          </Button>
        )}
      </div>
    </form>
  );
}
