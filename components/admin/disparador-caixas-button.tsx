"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Vinculo = { categoria: string; grupoId: string; grupoNome: string };

export function DisparadorCaixasButton({ naoAnunciadas }: { naoAnunciadas: number }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [grupoEscolhido, setGrupoEscolhido] = useState("");

  useEffect(() => {
    if (!open) return;
    setCarregando(true);
    fetch("/api/admin/atacado/whatsapp/vinculos", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        const vs: Vinculo[] = json.data?.vinculos ?? [];
        setVinculos(vs);
        const sugerido = vs.find((v) => v.categoria === "CAIXAS_ABERTAS") ?? vs.find((v) => v.categoria === "PRODUTOS_DISPONIVEIS");
        setGrupoEscolhido(sugerido?.grupoId ?? vs[0]?.grupoId ?? "");
      })
      .catch(() => toast.error("Erro ao carregar grupos"))
      .finally(() => setCarregando(false));
  }, [open]);

  async function handleDisparar() {
    if (!grupoEscolhido) return;
    setLoading(true);
    try {
      const vinculo = vinculos.find((v) => v.grupoId === grupoEscolhido);
      const res = await fetch("/api/admin/atacado/disparar-caixas-abertas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupoId: grupoEscolhido, grupoNome: vinculo?.grupoNome ?? grupoEscolhido }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error?.message ?? "Erro ao disparar caixas.");
        return;
      }
      const { enviadas, erros } = json.data ?? {};
      setOpen(false);
      if (erros?.length) {
        toast.warning(`${enviadas} enviada(s). Erros: ${erros.join("; ")}`);
      } else {
        toast.success(`${enviadas} caixa(s) enviada(s) ao grupo!`);
      }
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast.error("Falha ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={naoAnunciadas === 0}
        variant={naoAnunciadas > 0 ? "default" : "outline"}
        className={naoAnunciadas > 0 ? "bg-emerald-600 hover:bg-emerald-700" : ""}
      >
        <Send className="size-4" />
        {naoAnunciadas > 0 ? `Disparar ${naoAnunciadas} caixa${naoAnunciadas > 1 ? "s" : ""}` : "Tudo anunciado"}
      </Button>

      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disparar caixas abertas no WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              As <strong>{naoAnunciadas} caixa(s)</strong> abertas ainda não anunciadas serão enviadas
              para o grupo selecionado abaixo, com pausa de 3s entre cada.
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
                {vinculos.map((v) => (
                  <option key={v.grupoId} value={v.grupoId}>
                    {v.grupoNome} — {v.categoria === "CAIXAS_ABERTAS" ? "Caixas Abertas ⭐" : v.categoria === "PRODUTOS_DISPONIVEIS" ? "Produtos Disponíveis" : v.categoria}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-destructive">
                Nenhum grupo vinculado. Vincule grupos no painel WhatsApp.
              </p>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button
                onClick={handleDisparar}
                disabled={loading || carregando || !grupoEscolhido}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Disparar para este grupo
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
