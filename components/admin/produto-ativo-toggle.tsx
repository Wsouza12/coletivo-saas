"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ProdutoAtivoToggle({
  produtoId,
  ativo,
}: {
  produtoId: string;
  ativo: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/admin/produtos/${produtoId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !ativo }),
    });
    if (!res.ok) {
      toast.error("Erro ao atualizar produto");
      setLoading(false);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-pressed={ativo}
      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        ativo ? "bg-primary" : "bg-muted"
      } disabled:opacity-50`}
    >
      <span
        className={`inline-block size-4 translate-x-0.5 rounded-full bg-white shadow transition-transform ${
          ativo ? "translate-x-4" : ""
        }`}
      />
    </button>
  );
}
