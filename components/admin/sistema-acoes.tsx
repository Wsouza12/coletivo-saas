"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function useAcao(path: string, mensagemSucesso: (data: unknown) => string) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function executar() {
    setLoading(true);
    const res = await fetch(path, { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      toast.error("Erro ao executar ação");
      return;
    }
    const { data } = await res.json();
    toast.success(mensagemSucesso(data));
    router.refresh();
  }

  return { executar, loading };
}

export function SistemaAcoes() {
  const sync = useAcao(
    "/api/admin/sistema/sync",
    (data) => `Sync concluído — ${(data as { synced: number }).synced} pedido(s) novo(s)`
  );
  const faturas = useAcao(
    "/api/admin/sistema/gerar-faturas",
    (data) => `${(data as { geradas: number }).geradas} fatura(s) gerada(s) e enviada(s)`
  );
  const email = useAcao("/api/admin/sistema/testar-email", () => "Email de teste enviado");

  return (
    <div className="flex flex-wrap gap-3">
      <Button size="sm" disabled={sync.loading} onClick={sync.executar}>
        {sync.loading ? "Sincronizando..." : "Forçar sync agora"}
      </Button>
      <Button size="sm" variant="outline" disabled={faturas.loading} onClick={faturas.executar}>
        {faturas.loading ? "Gerando..." : "Gerar faturas agora"}
      </Button>
      <Button size="sm" variant="outline" disabled={email.loading} onClick={email.executar}>
        {email.loading ? "Enviando..." : "Testar email"}
      </Button>
    </div>
  );
}
