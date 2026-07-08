"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProdutoExcluirButton({ produtoId }: { produtoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function excluir() {
    if (
      !confirm(
        "Excluir este produto definitivamente do catálogo? Essa ação não pode ser desfeita. Se o produto já tiver anúncios ou pedidos, a exclusão será bloqueada — use o botão de ativar/desativar nesse caso."
      )
    ) {
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/admin/produtos/${produtoId}`, { method: "DELETE" });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }));
      toast.error(error?.message ?? "Erro ao excluir produto");
      setLoading(false);
      return;
    }
    toast.success("Produto excluído");
    router.refresh();
  }

  return (
    <Button type="button" variant="ghost" size="icon" disabled={loading} onClick={excluir} title="Excluir produto">
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}
