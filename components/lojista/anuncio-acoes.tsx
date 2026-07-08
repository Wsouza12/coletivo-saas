"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function AnuncioAcoes({
  anuncioId,
  status,
  url,
}: {
  anuncioId: string;
  status: string;
  url: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function atualizarStatus(novoStatus: "PUBLICADO" | "PAUSADO" | "REMOVIDO") {
    setLoading(true);
    const res = await fetch(`/api/lojista/anuncios/${anuncioId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Erro ao atualizar anúncio");
      return;
    }
    toast.success("Anúncio atualizado");
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {url && (
        <a href={url} target="_blank" rel="noreferrer" title="Ver na plataforma">
          <ExternalLink className="size-4 text-muted-foreground hover:text-primary" />
        </a>
      )}
      {status === "PUBLICADO" && (
        <Button size="sm" variant="outline" disabled={loading} onClick={() => atualizarStatus("PAUSADO")}>
          Pausar
        </Button>
      )}
      {status === "PAUSADO" && (
        <Button size="sm" disabled={loading} onClick={() => atualizarStatus("PUBLICADO")}>
          Reativar
        </Button>
      )}
      {status !== "REMOVIDO" && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmOpen(true)}>
            Remover
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover anúncio</DialogTitle>
              <DialogDescription>
                O anúncio será removido da plataforma. Essa ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" disabled={loading} onClick={() => atualizarStatus("REMOVIDO")}>
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
