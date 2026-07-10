"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Pencil, Check, X, Truck, FileText, Phone, MapPin, User, Clock, Search, CheckCircle2, Circle, ShoppingBag, Sparkles, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CatalogoFornecedorViewerDialog } from "@/components/admin/catalogo-fornecedor-viewer-dialog";
import { mascararTelefone } from "@/lib/format";
import { gerarCatalogoPdf, ProdutoCatalogoPDF } from "@/lib/pdf-generator";

type Fornecedor = {
  id: string;
  nome: string;
  catalogo: string | null;
  telefone: string | null;
  endereco: string | null;
  vendedorNome: string | null;
  horarioAtendimento: string | null;
  pedidoMinimo: string | null;
  usarModeloMinimo: boolean;
  pedidoMinimoValor: number | null;
  atualizado: boolean;
  isEstoqueProprio?: boolean;
};

type CatalogoPdf = { id: string; nome: string; arquivoUrl: string; data: string | null; _count: { itens: number } };

type DadosFornecedor = {
  nome: string;
  catalogo?: string;
  telefone?: string;
  endereco?: string;
  vendedorNome?: string;
  horarioAtendimento?: string;
  pedidoMinimo?: string;
  usarModeloMinimo?: boolean;
  pedidoMinimoValor?: number;
};

export function FornecedoresAtacadoPanel() {
  const router = useRouter();
  const [fornecedores, setFornecedores] = useState<Fornecedor[] | null>(null);
  const [catalogosTodos, setCatalogosTodos] = useState<Record<string, CatalogoPdf[]>>({});
  const [criar, setCriar] = useState(false);
  const [busca, setBusca] = useState("");

  // Cada card carrega seus catálogos; expomos esse cache aqui pra a busca
  // global poder filtrar fornecedores pelo nome do catálogo também.
  function registrarCatalogos(forId: string, lista: CatalogoPdf[]) {
    setCatalogosTodos((atual) => ({ ...atual, [forId]: lista }));
  }

  async function carregar() {
    const res = await fetch("/api/admin/atacado/fornecedores", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setFornecedores(json.data);
  }

  async function handleGerarCatalogoProprio(fornecedorId: string, customLogo?: string) {
    const loadingId = toast.loading("Buscando produtos...");
    try {
      const res = await fetch(`/api/admin/atacado/produtos?fornecedorId=${fornecedorId}`);
      const json = await res.json();
      if (!res.ok) throw new Error("Erro ao buscar produtos");
      
      const produtos: ProdutoCatalogoPDF[] = json.data;
      if (produtos.length === 0) {
        toast.error("Nenhum produto cadastrado no Estoque Próprio.", { id: loadingId });
        return;
      }
      
      toast.loading("Desenhando PDF...", { id: loadingId });
      const file = await gerarCatalogoPdf(produtos, customLogo);
      
      toast.loading("Enviando PDF gerado...", { id: loadingId });
      
      // Get upload URL
      const urlRes = await fetch(`/api/admin/atacado/fornecedores/${fornecedorId}/catalogos/upload-url`, {
        method: "POST",
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlJson.error?.message ?? "Erro ao preparar upload");
      
      const { signedUrl, publicUrl } = urlJson.data;

      // Upload directly to S3/R2
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      
      if (!uploadRes.ok) throw new Error("Erro ao enviar o arquivo PDF");

      // Excluir catálogos antigos do Estoque Próprio para manter apenas o mais atual
      const catalogosAntigos = catalogosTodos[fornecedorId] || [];
      for (const cat of catalogosAntigos) {
        await fetch(`/api/admin/atacado/catalogos/${cat.id}`, { method: "DELETE" }).catch(e => console.error("Erro ao excluir catálogo antigo:", e));
      }

      // Save catalog entry
      const catRes = await fetch(`/api/admin/atacado/fornecedores/${fornecedorId}/catalogos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: "Catálogo Pronta Entrega",
          arquivoUrl: publicUrl,
          data: new Date().toISOString().slice(0, 10),
        }),
      });
      
      if (!catRes.ok) throw new Error("Erro ao registrar catálogo");
      
      toast.success("Catálogo de Estoque Próprio gerado e publicado!", { id: loadingId });
      carregar(); // Refresh everything
      setTimeout(() => window.location.reload(), 1500); // refresh the page
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Erro inesperado", { id: loadingId });
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function remover(id: string) {
    const res = await fetch(`/api/admin/atacado/fornecedores/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error?.code === "EM_USO" ? "Fornecedor vinculado a produtos" : "Erro ao remover");
      return;
    }
    carregar();
    router.refresh();
  }

  // Filtra fornecedores cujo nome OU nome de algum catálogo bata na busca
  // (sem acento, case-insensitive).
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const termo = norm(busca.trim());
  const fornecedoresFiltrados = !termo
    ? fornecedores
    : (fornecedores ?? []).filter((f) => {
        if (norm(f.nome).includes(termo)) return true;
        const cats = catalogosTodos[f.id] ?? [];
        return cats.some((c) => norm(c.nome).includes(termo));
      })
      .sort((a, b) => {
        if (a.isEstoqueProprio && !b.isEstoqueProprio) return -1;
        if (!a.isEstoqueProprio && b.isEstoqueProprio) return 1;
        return 0;
      });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por fornecedor ou catálogo..."
            className="pl-8"
          />
        </div>
        <Button onClick={() => setCriar(true)}>
          <Plus className="size-4" />
          Novo fornecedor
        </Button>
      </div>

      <FornecedorDialog
        open={criar}
        onOpenChange={setCriar}
        titulo="Novo fornecedor"
        onSubmit={async (dados) => {
          const res = await fetch("/api/admin/atacado/fornecedores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados),
          });
          const json = await res.json();
          if (!res.ok) {
            toast.error(json.error?.message ?? "Erro ao criar fornecedor");
            return false;
          }
          toast.success("Fornecedor cadastrado");
          setCriar(false);
          carregar();
          router.refresh();
          return true;
        }}
      />

      {!fornecedores ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : fornecedores.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</p>
      ) : fornecedoresFiltrados!.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Nenhum resultado pra &quot;{busca}&quot;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {fornecedoresFiltrados!.map((f) => (
            <FornecedorCard
              key={f.id}
              fornecedor={f}
              onRemover={() => remover(f.id)}
              onAtualizado={carregar}
              onCatalogosCarregados={(lista) => registrarCatalogos(f.id, lista)}
              onGerarCatalogoProprio={(logo) => handleGerarCatalogoProprio(f.id, logo)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FornecedorCard({
  fornecedor,
  onRemover,
  onAtualizado,
  onCatalogosCarregados,
  onGerarCatalogoProprio,
}: {
  fornecedor: Fornecedor;
  onRemover: () => void;
  onAtualizado: () => void;
  onCatalogosCarregados?: (lista: CatalogoPdf[]) => void;
  onGerarCatalogoProprio?: (logoBase64?: string) => void;
}) {
  const [catalogos, setCatalogos] = useState<CatalogoPdf[] | null>(null);
  const [editando, setEditando] = useState(false);
  const [editandoCatalogo, setEditandoCatalogo] = useState<CatalogoPdf | null>(null);
  const [nomeCatalogo, setNomeCatalogo] = useState("");
  const [dataCatalogo, setDataCatalogo] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [capaBase64, setCapaBase64] = useState<string | undefined>();
  const logoInputRef = useRef<HTMLInputElement>(null);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setCapaBase64(undefined);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setCapaBase64(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function carregarCatalogos() {
    const res = await fetch(`/api/admin/atacado/fornecedores/${fornecedor.id}/catalogos`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setCatalogos(json.data);
      onCatalogosCarregados?.(json.data);
    }
  }

  async function toggleAtualizado() {
    const novo = !fornecedor.atualizado;
    const res = await fetch(`/api/admin/atacado/fornecedores/${fornecedor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ atualizado: novo }),
    });
    if (!res.ok) {
      toast.error("Erro ao marcar fornecedor");
      return;
    }
    toast.success(novo ? "Marcado como atualizado" : "Desmarcado");
    onAtualizado();
  }

  useEffect(() => {
    carregarCatalogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fornecedor.id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!nomeCatalogo.trim()) {
      toast.error("Dê um nome ao catálogo antes de enviar o PDF");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("Envie um arquivo PDF");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const urlRes = await fetch(`/api/admin/atacado/fornecedores/${fornecedor.id}/catalogos/upload-url`, {
        method: "POST",
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) {
        toast.error(urlJson.error?.message ?? "Erro ao preparar upload");
        return;
      }
      const { signedUrl, publicUrl } = urlJson.data;

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!uploadRes.ok) {
        toast.error("Erro ao enviar o arquivo PDF");
        return;
      }

      const res = await fetch(`/api/admin/atacado/fornecedores/${fornecedor.id}/catalogos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomeCatalogo.trim(),
          arquivoUrl: publicUrl,
          data: dataCatalogo || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao registrar catálogo");
        return;
      }
      toast.success("Catálogo enviado");
      setNomeCatalogo("");
      setDataCatalogo("");
      carregarCatalogos();
    } catch (err) {
      console.error("Erro no upload do catálogo:", err);
      toast.error(err instanceof Error ? `Erro ao enviar: ${err.message}` : "Erro inesperado ao enviar o PDF");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removerCatalogo(id: string) {
    const res = await fetch(`/api/admin/atacado/catalogos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Erro ao remover catálogo");
      return;
    }
    carregarCatalogos();
  }

  return (
    <>
      <div
        className={`flex h-[450px] flex-col overflow-hidden rounded-xl border-2 shadow-sm transition ${
          fornecedor.isEstoqueProprio
            ? "border-primary bg-primary/5"
            : fornecedor.atualizado
            ? "border-success bg-success/5"
            : "border-border bg-card opacity-90"
        }`}
      >
        {/* Header com nome + ações */}
        <div
          className={`flex items-start justify-between gap-1 border-b p-2.5 ${
            fornecedor.isEstoqueProprio
              ? "border-primary/30 bg-primary/10"
              : fornecedor.atualizado 
              ? "border-success/30 bg-success/10" 
              : "border-border bg-muted/40"
          }`}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <button
              type="button"
              onClick={toggleAtualizado}
              title={fornecedor.atualizado ? "Marcado como atualizado — clique pra desmarcar" : "Marcar como atualizado"}
              className="shrink-0"
            >
              {fornecedor.atualizado ? (
                <CheckCircle2 className="size-4 text-success" />
              ) : (
                <Circle className="size-4 text-muted-foreground hover:text-foreground" />
              )}
            </button>
            <Truck className={`size-4 shrink-0 ${fornecedor.atualizado ? "text-success" : "text-primary"}`} />
            <span className="truncate text-sm font-bold text-foreground" title={fornecedor.nome}>
              {fornecedor.nome}
            </span>
            {fornecedor.isEstoqueProprio && (fornecedor as any).catalogoDesatualizado && (
              <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                Catálogo desatualizado!
              </span>
            )}
          </div>
          {!fornecedor.isEstoqueProprio && (
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={() => setEditando(true)} className="rounded p-1 hover:bg-muted" title="Editar">
                <Pencil className="size-3.5 text-muted-foreground" />
              </button>
              <button type="button" onClick={onRemover} className="rounded p-1 hover:bg-muted" title="Excluir">
                <Trash2 className="size-3.5 text-destructive" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 border-b border-border p-2.5 text-xs">
          {fornecedor.telefone ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Phone className="size-3 shrink-0" />
              <span className="truncate">{fornecedor.telefone}</span>
            </div>
          ) : null}
          {fornecedor.vendedorNome ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="size-3 shrink-0" />
              <span className="truncate">{fornecedor.vendedorNome}</span>
            </div>
          ) : null}
          {fornecedor.horarioAtendimento ? (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="size-3 shrink-0" />
              <span className="truncate">{fornecedor.horarioAtendimento}</span>
            </div>
          ) : null}
          {fornecedor.endereco ? (
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="size-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{fornecedor.endereco}</span>
            </div>
          ) : null}
          {fornecedor.pedidoMinimo ? (
            <span className="mt-1 inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Mín: {fornecedor.pedidoMinimo}
            </span>
          ) : null}
          {fornecedor.usarModeloMinimo && fornecedor.pedidoMinimoValor ? (
            <span className="mt-1 inline-flex items-center gap-1 w-fit rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700">
              <ShoppingBag className="size-2.5" />
              Rodada fornecedor · R$ {Number(fornecedor.pedidoMinimoValor).toFixed(0)}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FileText className="size-3" />
            Catálogos PDF
          </span>
          {!catalogos ? (
            <p className="text-[11px] text-muted-foreground">Carregando...</p>
          ) : catalogos.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Nenhum catálogo.</p>
          ) : (
            catalogos.map((c) => (
              <div key={c.id} className="flex flex-col gap-1 rounded-md bg-muted p-1.5 text-[11px]">
                <span className="truncate font-medium text-foreground" title={c.nome}>{c.nome}</span>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[10px] text-muted-foreground">
                    {c._count.itens} itens
                    {c.data ? ` · ${new Date(c.data).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}` : ""}
                  </span>
                  <div className="flex shrink-0 items-center">
                    <CatalogoFornecedorViewerDialog 
                      catalogoId={c.id} 
                      nome={c.nome} 
                      iconeApenas 
                      isEstoqueProprio={fornecedor.isEstoqueProprio} 
                    />
                    <button type="button" onClick={() => setEditandoCatalogo(c)} className="rounded p-1 hover:bg-background" title="Editar">
                      <Pencil className="size-3 text-muted-foreground" />
                    </button>
                    <button type="button" onClick={() => removerCatalogo(c.id)} className="rounded p-1 hover:bg-background" title="Excluir">
                      <Trash2 className="size-3 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          {fornecedor.isEstoqueProprio && (
            <div className="mt-4 p-3 border-t border-primary/20 bg-primary/5 rounded-lg flex flex-col items-center gap-2 text-center">
              <ShoppingBag className="size-6 text-primary" />
              <p className="text-xs text-muted-foreground">
                Catálogo gerado automaticamente com base nos seus produtos cadastrados como <b>Estoque Próprio</b>.
              </p>
              
              <div className="w-full flex flex-col items-center gap-1 my-1">
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-[10px] h-7"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <ImageIcon className="size-3 mr-1" />
                  {capaBase64 ? "Logo selecionada (trocar)" : "Inserir logo da capa (opcional)"}
                </Button>
                {capaBase64 && (
                   <span className="text-[10px] text-success font-medium">✓ Logo pronta pra gerar</span>
                )}
              </div>

              <Button 
                size="sm" 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => onGerarCatalogoProprio?.(capaBase64)}
              >
                <Sparkles className="size-3.5 mr-1" />
                Gerar Catálogo PDF
              </Button>
            </div>
          )}
        </div>

        {!fornecedor.isEstoqueProprio && (
          <div className="flex flex-col gap-1 border-t border-border p-2">
            <Input
              value={nomeCatalogo}
              onChange={(e) => setNomeCatalogo(e.target.value)}
              placeholder="Nome do novo catálogo"
              className="h-7 text-[11px]"
            />
            <Input
              type="date"
              value={dataCatalogo}
              onChange={(e) => setDataCatalogo(e.target.value)}
              className="h-7 text-[11px]"
              title="Data de referência do catálogo (opcional)"
            />
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleUpload} />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={uploading || !nomeCatalogo.trim()}
              onClick={() => inputRef.current?.click()}
              className="h-7 w-full text-[11px]"
            >
              <Upload className="size-3" />
              {uploading ? "Enviando..." : "Enviar PDF"}
            </Button>
          </div>
        )}
      </div>

      {editandoCatalogo ? (
        <EditarCatalogoDialog
          catalogo={editandoCatalogo}
          fornecedorId={fornecedor.id}
          onClose={() => setEditandoCatalogo(null)}
          onSalvo={() => {
            setEditandoCatalogo(null);
            carregarCatalogos();
          }}
        />
      ) : null}

      <FornecedorDialog
        open={editando}
        onOpenChange={setEditando}
        titulo={`Editar ${fornecedor.nome}`}
        inicial={{
          nome: fornecedor.nome,
          catalogo: fornecedor.catalogo ?? "",
          telefone: fornecedor.telefone ?? "",
          endereco: fornecedor.endereco ?? "",
          vendedorNome: fornecedor.vendedorNome ?? "",
          horarioAtendimento: fornecedor.horarioAtendimento ?? "",
          pedidoMinimo: fornecedor.pedidoMinimo ?? "",
          usarModeloMinimo: fornecedor.usarModeloMinimo,
          pedidoMinimoValor: fornecedor.pedidoMinimoValor ?? undefined,
        }}
        onSubmit={async (dados) => {
          const res = await fetch(`/api/admin/atacado/fornecedores/${fornecedor.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados),
          });
          const json = await res.json();
          if (!res.ok) {
            toast.error(json.error?.message ?? "Erro ao salvar");
            return false;
          }
          toast.success("Fornecedor atualizado");
          setEditando(false);
          onAtualizado();
          return true;
        }}
      />
    </>
  );
}

function EditarCatalogoDialog({
  catalogo,
  fornecedorId,
  onClose,
  onSalvo,
}: {
  catalogo: CatalogoPdf;
  fornecedorId: string;
  onClose: () => void;
  onSalvo: () => void;
}) {
  const [nome, setNome] = useState(catalogo.nome);
  const [data, setData] = useState(catalogo.data ? catalogo.data.slice(0, 10) : "");
  const [salvando, setSalvando] = useState(false);
  const [substituindo, setSubstituindo] = useState(false);
  const [novoArquivoUrl, setNovoArquivoUrl] = useState<string | null>(null);
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  async function handleSubstituirArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Envie um PDF");
      return;
    }
    setSubstituindo(true);
    try {
      const urlRes = await fetch(`/api/admin/atacado/fornecedores/${fornecedorId}/catalogos/upload-url`, {
        method: "POST",
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) {
        toast.error(urlJson.error?.message ?? "Erro ao preparar upload");
        return;
      }
      const { signedUrl, publicUrl } = urlJson.data;
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!uploadRes.ok) {
        toast.error("Erro ao enviar o PDF");
        return;
      }
      setNovoArquivoUrl(publicUrl);
      toast.success("Novo PDF pronto — clique em Salvar pra aplicar");
    } finally {
      setSubstituindo(false);
      if (arquivoInputRef.current) arquivoInputRef.current.value = "";
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const res = await fetch(`/api/admin/atacado/catalogos/${catalogo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          data: data || null,
          arquivoUrl: novoArquivoUrl ?? undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao salvar catálogo");
        return;
      }
      toast.success("Catálogo atualizado");
      onSalvo();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Editar catálogo</DialogTitle>
        </DialogHeader>
        <form onSubmit={salvar} className="flex flex-col gap-2">
          <Label>Título</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />

          <Label>Data do catálogo</Label>
          <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />

          <Label>Substituir arquivo PDF (opcional)</Label>
          <div className="flex items-center gap-1.5">
            <input
              ref={arquivoInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleSubstituirArquivo}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={substituindo}
              onClick={() => arquivoInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              {substituindo ? "Enviando..." : "Escolher novo PDF"}
            </Button>
            {novoArquivoUrl ? (
              <span className="text-xs text-success">✓ novo PDF pronto</span>
            ) : (
              <a href={catalogo.arquivoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                ver atual
              </a>
            )}
          </div>

          <div className="mt-2 flex justify-end gap-1.5">
            <Button type="button" variant="ghost" disabled={salvando} onClick={onClose}>
              <X className="size-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando || !nome.trim()}>
              <Check className="size-4" />
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Form reusável (criar + editar) em diálogo.
function FornecedorDialog({
  open,
  onOpenChange,
  titulo,
  inicial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  inicial?: Partial<DadosFornecedor> & { nome?: string };
  onSubmit: (dados: DadosFornecedor) => Promise<boolean>;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [catalogo, setCatalogo] = useState(inicial?.catalogo ?? "");
  const [telefone, setTelefone] = useState(inicial?.telefone ?? "");
  const [endereco, setEndereco] = useState(inicial?.endereco ?? "");
  const [vendedorNome, setVendedorNome] = useState(inicial?.vendedorNome ?? "");
  const [horarioAtendimento, setHorarioAtendimento] = useState(inicial?.horarioAtendimento ?? "");
  const [pedidoMinimo, setPedidoMinimo] = useState(inicial?.pedidoMinimo ?? "");
  const [usarModeloMinimo, setUsarModeloMinimo] = useState(inicial?.usarModeloMinimo ?? false);
  const [pedidoMinimoValor, setPedidoMinimoValor] = useState(inicial?.pedidoMinimoValor?.toString() ?? "");
  const [salvando, setSalvando] = useState(false);

  // Reseta o form quando abre — pra criar começa vazio; pra editar carrega o inicial.
  useEffect(() => {
    if (open) {
      setNome(inicial?.nome ?? "");
      setCatalogo(inicial?.catalogo ?? "");
      setTelefone(inicial?.telefone ?? "");
      setEndereco(inicial?.endereco ?? "");
      setVendedorNome(inicial?.vendedorNome ?? "");
      setHorarioAtendimento(inicial?.horarioAtendimento ?? "");
      setPedidoMinimo(inicial?.pedidoMinimo ?? "");
      setUsarModeloMinimo(inicial?.usarModeloMinimo ?? false);
      setPedidoMinimoValor(inicial?.pedidoMinimoValor?.toString() ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      await onSubmit({
        nome,
        catalogo: catalogo || undefined,
        telefone: telefone || undefined,
        endereco: endereco || undefined,
        vendedorNome: vendedorNome || undefined,
        horarioAtendimento: horarioAtendimento || undefined,
        pedidoMinimo: pedidoMinimo || undefined,
        usarModeloMinimo,
        pedidoMinimoValor: pedidoMinimoValor ? Number(pedidoMinimoValor) : undefined,
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg sm:max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <Label>Nome do fornecedor</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
          <Label>Catálogo (link ou anotação)</Label>
          <Input value={catalogo} onChange={(e) => setCatalogo(e.target.value)} placeholder="https://... ou observação" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Telefone</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Vendedor que atende</Label>
              <Input value={vendedorNome} onChange={(e) => setVendedorNome(e.target.value)} placeholder="Ex: João" />
            </div>
            <div>
              <Label>Horário de atendimento</Label>
              <Input value={horarioAtendimento} onChange={(e) => setHorarioAtendimento(e.target.value)} placeholder="Ex: Seg-Sex 8h-18h" />
            </div>
          </div>
          <Label>Pedido mínimo (anotação livre)</Label>
          <Input value={pedidoMinimo} onChange={(e) => setPedidoMinimo(e.target.value)} placeholder="Ex: 10 caixas, R$ 500, 1 fardo" />

          <div className="mt-2 flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
            <input
              id="usarModeloMinimo"
              type="checkbox"
              checked={usarModeloMinimo}
              onChange={(e) => setUsarModeloMinimo(e.target.checked)}
              className="size-4 rounded"
            />
            <div className="flex-1">
              <label htmlFor="usarModeloMinimo" className="text-sm font-medium text-orange-800 cursor-pointer">
                Rodada por fornecedor (roupas)
              </label>
              <p className="text-[11px] text-orange-600">
                Progresso = soma de todas as reservas pagas dos produtos deste fornecedor
              </p>
            </div>
          </div>

          {usarModeloMinimo ? (
            <div>
              <Label>Pedido mínimo em R$ <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="1"
                step="0.01"
                value={pedidoMinimoValor}
                onChange={(e) => setPedidoMinimoValor(e.target.value)}
                placeholder="Ex: 500"
                required={usarModeloMinimo}
              />
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Valor total mínimo pra fazer o pedido ao fornecedor
              </p>
            </div>
          ) : null}

          <div className="mt-2 flex justify-end gap-1.5">
            <Button type="button" variant="ghost" disabled={salvando} onClick={() => onOpenChange(false)}>
              <X className="size-4" />
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando || !nome}>
              <Check className="size-4" />
              {salvando ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
