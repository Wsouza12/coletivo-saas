"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Link2, Plus, X, Pin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, SelectGroup, SelectLabel,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Grupo = { id: string; nome: string; tamanho: number };
type Vinculo = {
  categoria: string;
  grupoId: string;
  grupoNome: string;
  linkConvite: string | null;
  moderadorAtivo: boolean;
  assistenteGroqAtivo: boolean;
  assistenteGroqPrompt: string | null;
  aceitaSolicitacoes: boolean;
};

export function WhatsappGruposPanel() {
  const [loading, setLoading] = useState(false);
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [vinculos, setVinculos] = useState<Vinculo[] | null>(null);
  const [categorias, setCategorias] = useState<string[]>([]);

  async function carregar() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/atacado/whatsapp/grupos");
      const json = await res.json();
      if (res.ok) {
        setGrupos(json.data.grupos);
        setVinculos(json.data.vinculos);
        setCategorias(json.data.categorias || []);
      } else {
        toast.error(json.error?.message ?? "Erro ao carregar grupos do WhatsApp");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function vincular(categoria: string, grupoId: string) {
    const grupo = grupos?.find((g) => g.id === grupoId);
    if (!grupo) return;
    const res = await fetch("/api/admin/atacado/whatsapp/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoria, grupoId: grupo.id, grupoNome: grupo.nome }),
    });
    if (!res.ok) {
      toast.error("Erro ao vincular grupo");
      return;
    }
    toast.success("Vínculo salvo");
    carregar();
  }

  async function salvarLinkConvite(vinculo: Vinculo, linkConvite: string) {
    const res = await fetch("/api/admin/atacado/whatsapp/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria: vinculo.categoria,
        grupoId: vinculo.grupoId,
        grupoNome: vinculo.grupoNome,
        linkConvite,
      }),
    });
    if (!res.ok) {
      const json = await res.json();
      toast.error(json.error?.message ? "Link inválido — use o formato chat.whatsapp.com/..." : "Erro ao salvar link");
      return;
    }
    toast.success("Link de convite salvo");
    carregar();
  }

  async function vincularManual(categoria: string, grupoId: string, grupoNome: string) {
    const res = await fetch("/api/admin/atacado/whatsapp/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoria, grupoId: grupoId.trim(), grupoNome: grupoNome.trim() }),
    });
    if (!res.ok) {
      toast.error("Erro ao vincular grupo manualmente");
      return;
    }
    toast.success("Vínculo salvo");
    carregar();
  }

  async function toggleModerador(vinculo: Vinculo) {
    const res = await fetch("/api/admin/atacado/whatsapp/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria: vinculo.categoria,
        grupoId: vinculo.grupoId,
        grupoNome: vinculo.grupoNome,
        linkConvite: vinculo.linkConvite ?? "",
        moderadorAtivo: !vinculo.moderadorAtivo,
      }),
    });
    if (!res.ok) {
      toast.error("Erro ao alterar moderador");
      return;
    }
    toast.success(!vinculo.moderadorAtivo ? "Moderador ativado neste grupo" : "Moderador desativado");
    carregar();
  }

  async function toggleGroq(vinculo: Vinculo) {
    const res = await fetch("/api/admin/atacado/whatsapp/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria: vinculo.categoria,
        grupoId: vinculo.grupoId,
        grupoNome: vinculo.grupoNome,
        linkConvite: vinculo.linkConvite ?? "",
        assistenteGroqAtivo: !vinculo.assistenteGroqAtivo,
      }),
    });
    if (!res.ok) {
      toast.error("Erro ao alterar Assistente Groq");
      return;
    }
    toast.success(!vinculo.assistenteGroqAtivo ? "Assistente Groq ativado neste grupo" : "Assistente Groq desativado");
    carregar();
  }

  async function salvarGroqPrompt(vinculo: Vinculo, assistenteGroqPrompt: string) {
    const res = await fetch("/api/admin/atacado/whatsapp/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoria: vinculo.categoria,
        grupoId: vinculo.grupoId,
        grupoNome: vinculo.grupoNome,
        linkConvite: vinculo.linkConvite ?? "",
        assistenteGroqPrompt,
      }),
    });
    if (!res.ok) {
      toast.error("Erro ao salvar instruções da IA");
      return;
    }
    toast.success("Instruções da IA salvas com sucesso!");
    carregar();
  }


  async function desvincular(categoria: string) {
    const res = await fetch(`/api/admin/atacado/whatsapp/grupos?categoria=${encodeURIComponent(categoria)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Erro ao remover vínculo");
      return;
    }
    carregar();
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfigurarWebhookButton />

          {loading || !grupos || !vinculos ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="flex flex-col gap-3">
              <CriarGrupoForm onCriado={carregar} />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {["MODERADOR_AUTOMATICO", "ROBO_APRENDIZ", "SOLICITACOES", "AVISOS_COMUNIDADE", "CAIXAS_ABERTAS", "PRODUTOS_DISPONIVEIS", ...categorias.filter(c => !["MODERADOR_AUTOMATICO","ROBO_APRENDIZ","SOLICITACOES","AVISOS_COMUNIDADE","CAIXAS_ABERTAS","PRODUTOS_DISPONIVEIS"].includes(c))].map((categoria) => {
                  const vinculo = vinculos.find((v) => v.categoria === categoria);
                  const isModerador = categoria === "MODERADOR_AUTOMATICO";
                  const isRobo = categoria === "ROBO_APRENDIZ";
                  const isSolicitacoes = categoria === "SOLICITACOES";
                  const isAvisos = categoria === "AVISOS_COMUNIDADE";
                  const isProdutos = categoria === "PRODUTOS_DISPONIVEIS";
                  const isCaixas = categoria === "CAIXAS_ABERTAS";
                  const titulo = isModerador ? "Moderador Automático" : isRobo ? "Robô Aprendiz (IA)" : isSolicitacoes ? "Solicitações de Catálogo" : isAvisos ? "Avisos da Comunidade" : isProdutos ? "Produtos Disponíveis" : isCaixas ? "Caixas Abertas" : categoria;
                  
                  return (
                    <div key={categoria} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow">
                      <span className="w-full truncate text-base font-semibold text-card-foreground" title={titulo}>
                        {titulo}
                      </span>
                      {vinculo ? (
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-sm">
                            <span className="flex items-center gap-1.5 truncate text-muted-foreground font-medium">
                              <Link2 className="size-3.5 shrink-0" />
                              {vinculo.grupoNome}
                            </span>
                            <button type="button" onClick={() => desvincular(categoria)} className="hover:bg-destructive/10 p-1 rounded-md transition-colors">
                              <X className="size-4 text-destructive" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto">
                          <VincularGrupoControle
                            grupos={grupos}
                            onVincular={(grupoId) => vincular(categoria, grupoId)}
                            onVincularManual={(grupoId, grupoNome) =>
                              vincularManual(categoria, grupoId, grupoNome)
                            }
                          />
                        </div>
                      )}
                      
                      {vinculo && !isModerador && !isRobo && !isSolicitacoes ? (
                        <div className="mt-auto pt-2 border-t border-border/50 flex flex-col gap-3">
                          <LinkConviteInput vinculo={vinculo} onSalvar={salvarLinkConvite} />
                        </div>
                      ) : null}

                      {vinculo && isSolicitacoes ? (
                        <div className="mt-auto pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground leading-relaxed block">
                            Grupo dedicado para receber códigos de catálogo e aprovar aberturas de caixa.
                          </span>
                        </div>
                      ) : null}

                      {vinculo && isProdutos ? (
                        <div className="mt-auto pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground leading-relaxed block">
                            Caixas abertas são postadas aqui diariamente via botão "Disparar caixas" no painel de rodadas.
                          </span>
                        </div>
                      ) : null}

                      {vinculo && isAvisos ? (
                        <div className="mt-auto pt-2 border-t border-border/50 flex flex-col gap-2">
                          <span className="text-xs text-muted-foreground leading-relaxed block">
                            Canal Oficial (Comunidade). Útil para disparo direto do catálogo.
                          </span>
                          <FixarTutorialButton grupoJid={vinculo.grupoId} />
                        </div>
                      ) : null}

                      {vinculo && isRobo ? (
                        <div className="mt-auto pt-2 border-t border-border/50 flex flex-col gap-2">
                          <Textarea
                            placeholder="Instruções para a IA (ex: Responda as dúvidas de frete amigavelmente...)"
                            className="h-20 text-xs resize-none"
                            defaultValue={vinculo.assistenteGroqPrompt ?? ""}
                            onBlur={(e) => salvarGroqPrompt(vinculo, e.target.value)}
                          />
                          <span className="text-[10px] text-muted-foreground leading-tight">
                            A IA responderá dúvidas neste grupo. Se não souber, ela te chamará no privado e aprenderá com sua resposta.
                          </span>
                        </div>
                      ) : null}

                      {isModerador && (
                        <div className="mt-auto pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground leading-relaxed block">
                            Avisa por DM quando alguém manda 2ª pergunta sem ter resposta da 1ª no grupo selecionado.
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
    </div>
  );
}

// Link de convite (chat.whatsapp.com/...) usado pelo botão "Entrar no grupo" da
// vitrine pública. Colado pelo admin — é diferente do grupoId interno.
function LinkConviteInput({
  vinculo,
  onSalvar,
}: {
  vinculo: Vinculo;
  onSalvar: (vinculo: Vinculo, link: string) => void;
}) {
  const [valor, setValor] = useState(vinculo.linkConvite ?? "");
  const mudou = valor.trim() !== (vinculo.linkConvite ?? "");

  return (
    <div className="flex items-center gap-1.5 pl-1">
      <Input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Link de convite do grupo (chat.whatsapp.com/...)"
        className="h-7 flex-1 text-xs"
      />
      {mudou ? (
        <Button type="button" size="sm" className="h-7" onClick={() => onSalvar(vinculo, valor.trim())}>
          Salvar
        </Button>
      ) : null}
    </div>
  );
}

function CriarGrupoForm({ onCriado }: { onCriado: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [criando, setCriando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setCriando(true);
    try {
      const res = await fetch("/api/admin/atacado/whatsapp/criar-grupo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, telefone }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao criar grupo");
        return;
      }
      toast.success(`Grupo "${nome}" criado — vincule a uma categoria abaixo`);
      setNome("");
      setTelefone("");
      setAberto(false);
      onCriado();
    } finally {
      setCriando(false);
    }
  }

  if (!aberto) {
    return (
      <Button type="button" size="sm" variant="secondary" onClick={() => setAberto(true)}>
        <Plus className="size-3.5" />
        Criar grupo novo
      </Button>
    );
  }

  return (
    <form onSubmit={criar} className="flex flex-col gap-2 rounded-lg border border-border p-2.5">
      <Label className="text-xs">Nome do grupo</Label>
      <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Eletrônicos" className="h-8 text-xs" required />
      <Label className="text-xs">Telefone inicial (com DDI, ex: 5511999999999)</Label>
      <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="5511999999999" className="h-8 text-xs" required />
      <span className="text-xs text-muted-foreground">
        WhatsApp exige pelo menos 1 participante pra criar o grupo — pode ser seu próprio número.
      </span>
      <div className="flex justify-end gap-1.5">
        <Button type="button" size="sm" variant="ghost" disabled={criando} onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={criando || !nome || !telefone}>
          {criando ? "Criando..." : "Criar"}
        </Button>
      </div>
    </form>
  );
}

// Botão pra configurar o webhook da Evolution apontando pro nosso endpoint
// (necessário pro moderador funcionar). Roda 1x; precisa rodar de novo se a
// URL pública do app mudar.
function ConfigurarWebhookButton() {
  const [loading, setLoading] = useState(false);

  async function configurar() {
    if (!confirm("Configurar webhook da Evolution API pra apontar pra este site? Necessário pro moderador automático funcionar.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/evolution/configurar-webhook", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? "Erro ao configurar webhook");
        return;
      }
      toast.success(`Webhook configurado em: ${json.data.webhookUrl}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-xs">
      <span className="text-muted-foreground">
        Pra o moderador automático funcionar, configure o webhook da Evolution 1x.
      </span>
      <Button type="button" size="sm" variant="outline" onClick={configurar} disabled={loading}>
        {loading ? "Configurando..." : "Configurar webhook"}
      </Button>
    </div>
  );
}

// Controle de vincular grupo: prioriza a lista da Evolution API. Quando vem
// vazia (Railway/Evolution offline ou sem grupos), oferece input manual pra
// admin colar o JID (xxxxx@g.us) e o nome — assim não fica refém da Evolution.
function VincularGrupoControle({
  grupos,
  onVincular,
  onVincularManual,
}: {
  grupos: Grupo[];
  onVincular: (grupoId: string) => void;
  onVincularManual: (grupoId: string, grupoNome: string) => void;
}) {
  const [manual, setManual] = useState(false);
  const [grupoId, setGrupoId] = useState("");
  const [grupoNome, setGrupoNome] = useState("");
  const [open, setOpen] = useState(false);

  const handleVincular = (id: string) => {
    onVincular(id);
    setOpen(false);
  };

  const handleVincularManual = () => {
    onVincularManual(grupoId, grupoNome);
    setGrupoId("");
    setGrupoNome("");
    setManual(false);
    setOpen(false);
  };

  const parentGroups = grupos.filter((g: any) => g.isCommunity);
  const childGroups = grupos.filter((g: any) => g.linkedParent);
  const standaloneGroups = grupos.filter((g: any) => !g.isCommunity && !g.linkedParent);

  return (
    <>
      <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setOpen(true)}>
        <Link2 className="size-3 mr-1.5" />
        Vincular grupo
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vincular Grupo do WhatsApp</DialogTitle>
          <DialogDescription>
            Selecione o grupo abaixo ou faça o vínculo manual se a Evolution API não estiver sincronizando.
          </DialogDescription>
        </DialogHeader>

        {manual || grupos.length === 0 ? (
          <div className="flex flex-col gap-3 py-4">
            <div className="flex flex-col gap-2">
              <Label className="text-xs">JID do Grupo (ex: 123456789@g.us)</Label>
              <Input
                value={grupoId}
                onChange={(e) => setGrupoId(e.target.value)}
                placeholder="123456789@g.us"
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">Nome de Exibição</Label>
              <Input
                value={grupoNome}
                onChange={(e) => setGrupoNome(e.target.value)}
                placeholder="Ex: Grupo Vip"
                className="text-xs"
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              {grupos.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => setManual(false)}
                >
                  Voltar pra lista
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                className="flex-1"
                disabled={!grupoId.trim() || !grupoNome.trim()}
                onClick={handleVincularManual}
              >
                Salvar Vínculo Manual
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {parentGroups.map((parent) => {
              const children = childGroups.filter((c: any) => c.linkedParent === parent.id);
              return (
                <div key={parent.id} className="flex flex-col gap-1 border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-3 py-2 border-b">
                    <span className="text-xs font-semibold text-primary">📁 Comunidade: {parent.nome}</span>
                  </div>
                  <div className="flex flex-col p-1">
                    <button
                      type="button"
                      onClick={() => handleVincular(parent.id)}
                      className="flex items-center text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                    >
                      <span className="mr-2">📢</span> {parent.nome} (Avisos/Geral)
                    </button>
                    {children.map((child) => (
                      <button
                        type="button"
                        key={child.id}
                        onClick={() => handleVincular(child.id)}
                        className="flex items-center text-left pl-8 pr-3 py-2 text-sm hover:bg-muted rounded-md transition-colors text-muted-foreground"
                      >
                        ↳ <span className="ml-1.5 text-foreground">{child.nome} ({child.tamanho} membros)</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {standaloneGroups.length > 0 && (
              <div className="flex flex-col gap-1 border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-3 py-2 border-b">
                  <span className="text-xs font-semibold text-primary">
                    {parentGroups.length > 0 ? "Outros Grupos" : "Todos os Grupos"}
                  </span>
                </div>
                <div className="flex flex-col p-1">
                  {standaloneGroups.map((g) => (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => handleVincular(g.id)}
                      className="text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                    >
                      {g.nome} <span className="text-xs text-muted-foreground ml-1">({g.tamanho} membros)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setManual(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                + vincular manualmente (JID)
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
function FixarTutorialButton({ grupoJid }: { grupoJid: string }) {
  const [loading, setLoading] = useState(false);

  async function handleFixar() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/atacado/whatsapp/fixar-tutorial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupoJid }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? "Erro ao enviar");
      if (json.data?.fixado) {
        toast.success("Tutorial enviado e fixado no grupo! 📌");
      } else {
        toast.success("Tutorial enviado! Não foi possível fixar automaticamente — fixe manualmente no grupo.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar tutorial");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={handleFixar} disabled={loading} className="w-full gap-1.5 text-xs">
      {loading ? <Loader2 className="size-3 animate-spin" /> : <Pin className="size-3" />}
      {loading ? "Enviando..." : "Enviar & Fixar tutorial no grupo"}
    </Button>
  );
}
