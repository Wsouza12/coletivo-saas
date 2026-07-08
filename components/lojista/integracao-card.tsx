"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";

export function IntegracaoCard({
  titulo,
  plataforma,
  connectPath,
  conectado,
  accountName,
  tokenExpiry,
}: {
  titulo: string;
  plataforma: "MERCADOLIVRE" | "SHOPEE";
  connectPath: string;
  conectado: boolean;
  accountName?: string;
  tokenExpiry?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const expirado = tokenExpiry ? new Date(tokenExpiry) < new Date() : false;

  async function desconectar() {
    setLoading(true);
    const res = await fetch(`/api/lojista/integracoes/${plataforma.toLowerCase()}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Erro ao desconectar");
      return;
    }
    toast.success("Integração desconectada");
    router.refresh();
  }

  async function renovarToken() {
    setLoading(true);
    const res = await fetch("/api/lojista/integracoes/ml/refresh", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      toast.error("Erro ao renovar token");
      return;
    }
    toast.success("Token renovado");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{titulo}</h3>
        {conectado && (
          <Badge variant={expirado ? "destructive" : "secondary"} className={expirado ? "" : "bg-success/15 text-success"}>
            {expirado ? "Expirado" : "Conectado"}
          </Badge>
        )}
      </div>

      {conectado ? (
        <>
          <p className="text-sm text-muted-foreground">Conectado como {accountName}</p>
          {tokenExpiry && (
            <p className="text-xs text-muted-foreground">
              Token válido até {formatDateTime(new Date(tokenExpiry))}
            </p>
          )}
          <div className="flex gap-2">
            {plataforma === "MERCADOLIVRE" && (
              <Button size="sm" variant="outline" disabled={loading} onClick={renovarToken}>
                Renovar token
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-destructive" disabled={loading} onClick={desconectar}>
              Desconectar
            </Button>
          </div>
        </>
      ) : (
        <Button render={<a href={connectPath} />}>Conectar {titulo}</Button>
      )}
    </div>
  );
}
