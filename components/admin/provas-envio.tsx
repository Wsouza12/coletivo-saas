"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Camera, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ETAPAS = [
  "NOVO",
  "CONFIRMADO",
  "SEPARANDO",
  "EMBALANDO",
  "AGUARDANDO_COLETA",
  "ENVIADO",
  "ENTREGUE",
] as const;

const ETAPA_LABEL: Record<string, string> = {
  NOVO: "Pedido recebido",
  CONFIRMADO: "Pagamento confirmado",
  SEPARANDO: "Separação",
  EMBALANDO: "Embalagem",
  AGUARDANDO_COLETA: "Aguardando coleta",
  ENVIADO: "Envio",
  ENTREGUE: "Entrega",
};

type Etapa = {
  id: string;
  etapa: string;
  criadoEm: string;
  fotoUrlAssinada: string;
};

// Prova interna de envio — visível só para ADMIN. Nunca exibida ao cliente final ou lojista.
export function ProvasEnvio({ pedidoId, statusAtual }: { pedidoId: string; statusAtual: string }) {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [etapaSelecionada, setEtapaSelecionada] = useState(statusAtual);
  const [arquivo, setArquivo] = useState<File | null>(null);

  async function carregar() {
    setLoading(true);
    const res = await fetch(`/api/admin/pedidos/${pedidoId}/etapas`);
    if (res.ok) {
      const { data } = await res.json();
      setEtapas(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca inicial das provas ao montar
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoId]);

  async function enviarFoto() {
    if (!arquivo) {
      toast.error("Selecione uma foto");
      return;
    }
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("foto", arquivo);
      formData.append("etapa", etapaSelecionada);
      const res = await fetch(`/api/admin/pedidos/${pedidoId}/etapas`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      setArquivo(null);
      toast.success("Foto registrada como prova de envio");
      await carregar();
    } catch {
      toast.error("Erro ao registrar foto");
    } finally {
      setEnviando(false);
    }
  }

  function baixarTodas() {
    window.location.href = `/api/admin/pedidos/${pedidoId}/etapas/zip`;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Provas de Envio</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{etapas.length} fotos registradas</Badge>
          {etapas.length > 0 && (
            <Button size="sm" variant="outline" onClick={baixarTodas}>
              <Download className="mr-1 size-4" />
              Baixar todas as provas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border p-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Etapa</span>
            <Select value={etapaSelecionada} onValueChange={(v) => v && setEtapaSelecionada(v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ETAPAS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {ETAPA_LABEL[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <Button size="sm" onClick={enviarFoto} disabled={enviando}>
            <Camera className="mr-1 size-4" />
            {enviando ? "Enviando..." : "Registrar foto"}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : etapas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma prova registrada ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {etapas.map((etapa) => (
              <a
                key={etapa.id}
                href={etapa.fotoUrlAssinada}
                target="_blank"
                rel="noreferrer"
                className="relative overflow-hidden rounded-md border border-border"
              >
                <div className="relative aspect-square">
                  <Image src={etapa.fotoUrlAssinada} alt={etapa.etapa} fill className="object-cover" unoptimized />
                </div>
                <div className="bg-card p-1 text-center">
                  <p className="text-xs font-medium">{ETAPA_LABEL[etapa.etapa] ?? etapa.etapa}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(etapa.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
