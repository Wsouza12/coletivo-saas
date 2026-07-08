"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function RedefinirSenhaButton({ lojistaId }: { lojistaId: string }) {
  const [loading, setLoading] = useState(false);
  const [novaSenha, setNovaSenha] = useState<string | null>(null);

  async function redefinir() {
    setLoading(true);
    const res = await fetch(`/api/admin/lojistas/${lojistaId}/senha`, { method: "PATCH" });
    setLoading(false);
    if (!res.ok) {
      toast.error("Erro ao redefinir senha");
      return;
    }
    const { data } = await res.json();
    setNovaSenha(data.novaSenha);
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={loading} onClick={redefinir}>
        {loading ? "Gerando..." : "Redefinir senha"}
      </Button>

      <Dialog open={!!novaSenha} onOpenChange={(open) => !open && setNovaSenha(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova senha gerada</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Envie esta senha temporária ao lojista por um canal seguro (WhatsApp/telefone). Ela não
            será mostrada novamente.
          </p>
          <p className="rounded-md bg-muted p-3 text-center font-mono text-lg font-semibold text-foreground">
            {novaSenha}
          </p>
          <DialogFooter>
            <Button onClick={() => setNovaSenha(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
