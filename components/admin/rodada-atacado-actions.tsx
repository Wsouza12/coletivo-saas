"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Vinculo = { categoria: string; grupoId: string; grupoNome: string };

export function RodadaAtacadoActions({
  rodadaId,
  status,
  grupoMensagemEnviada,
  loopAtivo,
  loopIntervaloMinutos,
  metaUnidades,
  minimoUnidadesPorReserva,
  taxaServicoPercentual,
  unidadesReservadasLoja,
  envioCodigo,
  envioLink,
  produtoCategoria,
}: {
  rodadaId: string;
  status: string;
  grupoMensagemEnviada: boolean;
  loopAtivo?: boolean;
  loopIntervaloMinutos?: number;
  metaUnidades: number;
  minimoUnidadesPorReserva: number;
  taxaServicoPercentual: number;
  unidadesReservadasLoja: number;
  envioCodigo?: string | null;
  envioLink?: string | null;
  produtoCategoria: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [escolhendoGrupo, setEscolhendoGrupo] = useState(false);
  const [openEnvioDialog, setOpenEnvioDialog] = useState(false);

  // Debug: log status changes
  useEffect(() => {
    console.log('Rodada status changed:', status);
  }, [status]);

  async function atualizarComEnvio(codigo: string, link: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENVIADA", envioCodigo: codigo, envioLink: link }),
      });
      if (!res.ok) {
        toast.error("Erro ao atualizar com código de rastreio");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function atualizar(novoStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!res.ok) {
        toast.error("Erro ao atualizar rodada");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }
  

  async function abrirCaixaNoGrupo(grupoId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}/abrir-caixa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupoId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao abrir caixa no WhatsApp");
        return;
      }
      toast.success("Caixa aberta no grupo de WhatsApp");
      setEscolhendoGrupo(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleAbrirCaixaDireto() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/atacado/whatsapp/vinculos", { cache: "no-store" });
      const json = await res.json();
      const vinculos: Vinculo[] = json.data?.vinculos ?? [];
      // 1) vínculo específico da categoria; 2) fallback pro grupo CAIXAS_ABERTAS; 3) fallback pro PRODUTOS_DISPONIVEIS
      const vinculo = vinculos.find((v) => v.categoria === produtoCategoria)
        ?? vinculos.find((v) => v.categoria === "CAIXAS_ABERTAS")
        ?? vinculos.find((v) => v.categoria === "PRODUTOS_DISPONIVEIS");
      if (vinculo) {
        await abrirCaixaNoGrupo(vinculo.grupoId);
      } else {
        // nem categoria nem "Produtos Disponíveis" vinculados → abre modal para escolher
        setLoading(false);
        setEscolhendoGrupo(true);
      }
    } catch {
      setLoading(false);
      setEscolhendoGrupo(true);
    }
  }

  async function handleRepostar() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}/repostar`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error("Erro ao repostar caixa");
        return;
      }
      toast.success("Caixa repostada com sucesso no grupo!");
    } catch (e) {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {/* Linha 1: Ações de status */}
      {status === "ABERTA" && (
        <div className="flex flex-wrap gap-2">
          {!grupoMensagemEnviada ? (
            <>
              <Button size="sm" disabled={loading} onClick={handleAbrirCaixaDireto}>
                {loading ? "Enviando..." : "Abrir caixa no WhatsApp"}
              </Button>
              <EscolherGrupoDialog
                open={escolhendoGrupo}
                onClose={() => setEscolhendoGrupo(false)}
                onConfirmar={abrirCaixaNoGrupo}
                loading={loading}
                rodadaId={rodadaId}
              />
            </>
          ) : (
            <>
              <ConfigurarLoopDialog rodadaId={rodadaId} initialLoopAtivo={loopAtivo || false} initialIntervalo={loopIntervaloMinutos || 1440} />
              <Button size="sm" variant="outline" disabled={loading} onClick={handleRepostar}>
                Repostar
              </Button>
            </>
          )}
          <ReservaManualDialog rodadaId={rodadaId} />
          <Button size="sm" variant="outline" disabled={loading} onClick={() => atualizar("FECHADA")}>
            Fechar
          </Button>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => atualizar("CANCELADA")}>
            Cancelar
          </Button>
        </div>
      )}

      {status === "FECHADA" && (
        <div>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => atualizar("SEPARANDO")}>
            Marcar como separando
          </Button>
        </div>
      )}

      {status === "SEPARANDO" && (
        <div>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => atualizar("EMBALANDO")}>
            Marcar como embalando
          </Button>
        </div>
      )}

      {status === "EMBALANDO" && (
        <div>
          <Button size="sm" variant="outline" disabled={loading} onClick={() => atualizar("PRONTA_ENVIO")}>
            Marcar como pronta para envio
          </Button>
        </div>
      )}

      {status === "PRONTA_ENVIO" && (
        <div>
            <Button size="sm" variant="outline" disabled={loading} onClick={() => { console.log('Abrindo dialog de envio'); setOpenEnvioDialog(true); }}>
              Marcar como enviada
            </Button>
          <EnviarDialog
            open={openEnvioDialog}
            onClose={() => setOpenEnvioDialog(false)}
            onConfirm={(codigo, link) => atualizarComEnvio(codigo, link)}
            loading={loading}
          />
        </div>
      )}
      {status === "ENVIADA" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => atualizar('PRONTA_ENVIO')}>
          ↩ Retroceder para Pronta Envio
        </Button>
      )}

      {/* Linha 2: Editar e Excluir — sempre visíveis */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-2">
        <EditarRodadaDialog
          rodadaId={rodadaId}
          initialMeta={metaUnidades}
          initialMinimo={minimoUnidadesPorReserva}
          initialTaxa={taxaServicoPercentual}
          initialReservaLoja={unidadesReservadasLoja}
          initialLoopAtivo={loopAtivo || false}
          initialLoopIntervalo={loopIntervaloMinutos || 1440}
          initialCategoria={produtoCategoria}
        />
        <ExcluirRodadaButton rodadaId={rodadaId} />
      </div>
    </div>
  );
}

// ─── Diálogo de Edição ───────────────────────────────────────────────────────
function EditarRodadaDialog({
  rodadaId,
  initialMeta,
  initialMinimo,
  initialTaxa,
  initialReservaLoja,
  initialLoopAtivo,
  initialLoopIntervalo,
  initialCategoria,
}: {
  rodadaId: string;
  initialMeta: number;
  initialMinimo: number;
  initialTaxa: number;
  initialReservaLoja: number;
  initialLoopAtivo: boolean;
  initialLoopIntervalo: number;
  initialCategoria: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState(String(initialMeta));
  const [minimo, setMinimo] = useState(String(initialMinimo));
  const [taxa, setTaxa] = useState(String(initialTaxa));
  const [reservaLoja, setReservaLoja] = useState(String(initialReservaLoja));
  const [loopAtivo, setLoopAtivo] = useState(initialLoopAtivo);
  const [loopIntervalo, setLoopIntervalo] = useState(initialLoopIntervalo);
  const [categoria, setCategoria] = useState(initialCategoria);
  const [categoriasLista, setCategoriasLista] = useState<{ id: string; nome: string }[]>([]);

  // Reseta os valores quando abre o diálogo
  useEffect(() => {
    if (open) {
      setMeta(String(initialMeta));
      setMinimo(String(initialMinimo));
      setTaxa(String(initialTaxa));
      setReservaLoja(String(initialReservaLoja));
      setLoopAtivo(initialLoopAtivo);
      setLoopIntervalo(initialLoopIntervalo);
      setCategoria(initialCategoria);
      
      // Carrega categorias
      fetch("/api/admin/configuracoes/categorias")
        .then(r => r.json())
        .then(data => {
          if (data.data) {
            setCategoriasLista(data.data.map((c: any) => ({ id: c.id, nome: c.nome })));
          }
        })
        .catch(console.error);
    }
  }, [open, initialMeta, initialMinimo, initialTaxa, initialReservaLoja, initialLoopAtivo, initialLoopIntervalo, initialCategoria]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaUnidades: Number(meta),
          minimoUnidadesPorReserva: Number(minimo),
          taxaServicoPercentual: Number(taxa),
          unidadesReservadasLoja: Number(reservaLoja),
          loopAtivo,
          loopIntervaloMinutos: loopIntervalo,
          produtoCategoria: categoria,
        }),
      });
      if (!res.ok) {
        toast.error("Erro ao salvar alterações");
        return;
      }
      toast.success("Caixa atualizada com sucesso!");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1">
        <Pencil className="size-3.5" />
        Editar
      </Button>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Caixa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label>Grupo do Produto (Categoria)</Label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              required
            >
              <option value="" disabled>Selecione um grupo...</option>
              {categoriasLista.map((c) => (
                <option key={c.id} value={c.nome}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Meta de unidades (total da caixa)</Label>
            <Input type="number" min="1" value={meta} onChange={(e) => setMeta(e.target.value)} required />
          </div>

          <div>
            <Label>Mínimo de unidades por reserva</Label>
            <Input type="number" min="1" value={minimo} onChange={(e) => setMinimo(e.target.value)} required />
          </div>

          <div>
            <Label>Taxa de serviço (%)</Label>
            <Input type="number" min="0" max="100" value={taxa} onChange={(e) => setTaxa(e.target.value)} required />
          </div>

          <div>
            <Label>Unidades reservadas pra minha loja</Label>
            <Input type="number" min="0" value={reservaLoja} onChange={(e) => setReservaLoja(e.target.value)} />
            <span className="text-xs text-muted-foreground">
              Suas unidades &quot;de graça&quot; — o custo delas é diluído no preço do coletivo.
            </span>
          </div>

          {/* ── Loop de Repostagem ── */}
          <div className="flex flex-col gap-3 rounded-lg border border-border p-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`edit-loop-${rodadaId}`}
                checked={loopAtivo}
                onChange={(e) => setLoopAtivo(e.target.checked)}
                className="size-4"
              />
              <label htmlFor={`edit-loop-${rodadaId}`} className="cursor-pointer text-sm font-medium">
                Ativar repostagem automática (Loop)
              </label>
            </div>

            {loopAtivo && (
              <div className="pl-6">
                <Label>Intervalo de Repostagem</Label>
                <select
                  value={loopIntervalo}
                  onChange={(e) => setLoopIntervalo(Number(e.target.value))}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="1">A cada 1 minuto (teste)</option>
                  <option value="2">A cada 2 minutos (teste)</option>
                  <option value="5">A cada 5 minutos (teste)</option>
                  <option value="10">A cada 10 minutos (teste)</option>
                  <option value="30">A cada 30 minutos</option>
                  <option value="60">A cada 60 minutos (1 hora)</option>
                </select>
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Botão de Excluir com Confirmação ────────────────────────────────────────
function ExcluirRodadaButton({ rodadaId }: { rodadaId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleExcluir() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error("Erro ao excluir caixa");
        return;
      }
      toast.success("Caixa excluída com sucesso!");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)} className="gap-1">
        <Trash2 className="size-3.5" />
        Excluir
      </Button>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir Caixa</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir esta caixa? Essa ação é <strong>irreversível</strong> e todas as reservas associadas também serão apagadas.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir} disabled={loading}>
              {loading ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogo: Escolher Grupo WhatsApp ────────────────────────────────────────
// Diálogo que aparece antes de abrir a caixa: carrega os grupos do WhatsApp
// e pré-seleciona o vinculado à categoria do produto desta rodada — admin pode
// confirmar ou trocar pra outro grupo.
function EscolherGrupoDialog({
  open,
  onClose,
  onConfirmar,
  loading,
  rodadaId,
}: {
  open: boolean;
  onClose: () => void;
  onConfirmar: (grupoId: string) => void | Promise<void>;
  loading: boolean;
  rodadaId: string;
}) {
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [categoriaProduto, setCategoriaProduto] = useState<string>("");
  const [grupoEscolhido, setGrupoEscolhido] = useState<string>("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    // Usa apenas os VÍNCULOS do banco (GrupoWhatsappCategoria) — fonte confiável
    // e independente da Evolution API estar online. Pra mandar pra outro grupo
    // não vinculado, admin precisa vincular antes.
    Promise.all([
      fetch("/api/admin/atacado/whatsapp/vinculos", { cache: "no-store" }).then((r) => r.json()),
      fetch(`/api/admin/atacado/${rodadaId}`, { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([gj, rj]) => {
        const vs: Vinculo[] = gj.data?.vinculos ?? [];
        setVinculos(vs);
        const cat: string = rj.data?.produtoAtacado?.categoria ?? "";
        setCategoriaProduto(cat);
        const sugerido = vs.find((v) => v.categoria === cat);
        setGrupoEscolhido(sugerido?.grupoId ?? "");
      })
      .catch(() => toast.error("Erro ao carregar grupos"))
      .finally(() => setCarregando(false));
  }, [open, rodadaId]);

  const vinculoSugerido = vinculos.find((v) => v.categoria === categoriaProduto);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escolher grupo do WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            A caixa vai ser anunciada no grupo abaixo. Por padrão usamos o vinculado à categoria do
            produto ({categoriaProduto || "—"}), mas você pode mudar.
          </p>
          {carregando ? (
            <p className="text-sm text-muted-foreground">Carregando grupos...</p>
          ) : vinculos.length > 0 ? (
            <select
              value={grupoEscolhido}
              onChange={(e) => setGrupoEscolhido(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecione um grupo...</option>
              {vinculos.map((v) => {
                const ehSugerido = vinculoSugerido?.grupoId === v.grupoId;
                return (
                  <option key={v.grupoId} value={v.grupoId}>
                    {v.grupoNome} — {v.categoria}{ehSugerido ? " ⭐ sugerido" : ""}
                  </option>
                );
              })}
            </select>
          ) : (
            <p className="text-sm text-destructive">
              Nenhum grupo vinculado. Vincule grupos a categorias em /admin/atacado → botão WhatsApp.
            </p>
          )}
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              onClick={() => onConfirmar(grupoEscolhido)}
              disabled={loading || carregando || !grupoEscolhido}
            >
              {loading ? "Enviando..." : "Abrir caixa neste grupo"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EnviarDialog({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (codigo: string, link: string) => void | Promise<void>;
  loading: boolean;
}) {
  const [codigo, setCodigo] = useState("");
  const [link, setLink] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConfirm(codigo, link);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Informar código de rastreio</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label>Código de Rastreador</Label>
            <Input value={codigo} onChange={e => setCodigo(e.target.value)} required />
          </div>
          <div>
            <Label>Link de acompanhamento</Label>
            <Input type="url" value={link} onChange={e => setLink(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Diálogo: Reserva manual (prova social, sem Pix) ─────────────────────────
type ReservaManual = { id: string; compradorNome: string; quantidade: number };

function ReservaManualDialog({ rodadaId }: { rodadaId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [lista, setLista] = useState<ReservaManual[]>([]);
  // edição inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editQtd, setEditQtd] = useState("1");

  const carregar = () => {
    fetch(`/api/admin/atacado/${rodadaId}/reserva-manual`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => setLista(j.data?.reservas ?? [])).catch(() => {});
  };
  useEffect(() => { if (open) carregar(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}/reserva-manual`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compradorNome: nome.trim(), quantidade: Number(quantidade) }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Erro ao criar reserva manual"); return; }
      toast.success(json.data?.fechou ? "Reserva criada — a caixa FECHOU!" : "Reserva adicionada e postada no grupo");
      setNome(""); setQuantidade("1"); carregar(); router.refresh();
    } finally { setLoading(false); }
  }

  function abrirEdicao(r: ReservaManual) {
    setEditId(r.id); setEditNome(r.compradorNome); setEditQtd(String(r.quantidade));
  }

  async function salvarEdicao() {
    if (!editId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}/reserva-manual`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reservaId: editId, compradorNome: editNome.trim(), quantidade: Number(editQtd) }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Erro ao editar"); return; }
      toast.success("Reserva atualizada");
      setEditId(null); carregar(); router.refresh();
    } finally { setLoading(false); }
  }

  async function remover(id: string) {
    if (!confirm("Remover esta reserva manual? As unidades voltam pro progresso.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}/reserva-manual?reservaId=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.message ?? "Erro ao remover"); return; }
      toast.success(json.data?.reabriu ? "Reserva removida — a caixa reabriu" : "Reserva removida");
      carregar(); router.refresh();
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Reserva manual
      </Button>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reservas manuais (sem Pix)</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <form onSubmit={adicionar} className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">
              Conta no progresso e é postada no grupo com o nome. Se bater a meta, a caixa fecha.
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs">Nome</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Silva" required />
              </div>
              <div className="w-20">
                <Label className="text-xs">Qtd</Label>
                <Input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={loading || !nome.trim()}>
              {loading ? "Adicionando..." : "Adicionar reserva"}
            </Button>
          </form>

          {lista.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Reservas manuais nesta caixa</Label>
              {lista.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
                  {editId === r.id ? (
                    <>
                      <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="h-8 flex-1 text-xs" />
                      <Input type="number" min="1" value={editQtd} onChange={(e) => setEditQtd(e.target.value)} className="h-8 w-16 text-xs" />
                      <Button size="sm" className="h-8" disabled={loading} onClick={salvarEdicao}>Salvar</Button>
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditId(null)}>×</Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm truncate">{r.compradorNome}</span>
                      <span className="text-xs text-muted-foreground">{r.quantidade}un</span>
                      <button type="button" onClick={() => abrirEdicao(r)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-3.5" /></button>
                      <button type="button" onClick={() => remover(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfigurarLoopDialog({
  rodadaId,
  initialLoopAtivo,
  initialIntervalo,
}: {
  rodadaId: string;
  initialLoopAtivo: boolean;
  initialIntervalo: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loopAtivo, setLoopAtivo] = useState(initialLoopAtivo);
  const [intervalo, setIntervalo] = useState(initialIntervalo || 1440);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/atacado/${rodadaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loopAtivo, loopIntervaloMinutos: intervalo }),
      });
      if (!res.ok) {
        toast.error("Erro ao configurar loop");
        return;
      }
      toast.success("Configuração do loop salva");
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant={initialLoopAtivo ? "default" : "outline"} size="sm" onClick={() => setOpen(true)}>
        Loop: {initialLoopAtivo
          ? initialIntervalo < 60
            ? `${initialIntervalo} min`
            : initialIntervalo < 1440
            ? `${initialIntervalo / 60}h`
            : `${initialIntervalo / 1440}d`
          : "Desligado"}
      </Button>
      <DialogContent className="w-full max-w-sm">
        <DialogHeader>
          <DialogTitle>Configurar Loop de Repostagem</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id={`loop-${rodadaId}`} 
              checked={loopAtivo} 
              onChange={(e) => setLoopAtivo(e.target.checked)}
              className="size-4"
            />
            <label htmlFor={`loop-${rodadaId}`} className="cursor-pointer text-sm font-medium">
              Ativar repostagem automática
            </label>
          </div>
          
          {loopAtivo && (
            <div className="flex flex-col gap-2 pl-6">
              <label className="text-sm font-medium">Intervalo de Repostagem</label>
              <select
                value={intervalo}
                onChange={(e) => setIntervalo(Number(e.target.value))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <optgroup label="Minutos">
                  <option value="5">5 minutos (teste)</option>
                  <option value="10">10 minutos (teste)</option>
                  <option value="15">15 minutos (teste)</option>
                  <option value="30">30 minutos</option>
                </optgroup>
                <optgroup label="Horas">
                  <option value="60">1 hora</option>
                  <option value="120">2 horas</option>
                  <option value="240">4 horas</option>
                  <option value="360">6 horas</option>
                  <option value="720">12 horas</option>
                  <option value="1440">24 horas (1 dia)</option>
                </optgroup>
                <optgroup label="Dias">
                  <option value="2880">2 dias</option>
                  <option value="4320">3 dias</option>
                  <option value="10080">7 dias</option>
                </optgroup>
              </select>
            </div>
          )}
          
          <Button type="submit" disabled={loading} className="mt-2">
            {loading ? "Salvando..." : "Salvar Configuração"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
