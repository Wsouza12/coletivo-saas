"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function KitExcluirButton({ kitId, bloqueado }: { kitId: string; bloqueado: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function excluir() {
    if (bloqueado) {
      toast.error("Este kit já tem anúncio — remova o anúncio antes de excluir o kit");
      return;
    }
    if (!confirm("Excluir este kit?")) return;
    setLoading(true);
    const res = await fetch(`/api/lojista/kits/${kitId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }));
      toast.error(error?.message ?? "Erro ao excluir kit");
      return;
    }
    toast.success("Kit excluído");
    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" size="icon" disabled={loading} onClick={excluir}>
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}
