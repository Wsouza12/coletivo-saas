"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function AprovarLojistaButton({ lojistaId }: { lojistaId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function aprovar() {
    setLoading(true);
    const res = await fetch(`/api/admin/lojistas/${lojistaId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error?.message ?? "Erro ao aprovar lojista");
      setLoading(false);
      return;
    }
    toast.success("Lojista aprovado");
    router.refresh();
  }

  return (
    <Button size="sm" onClick={aprovar} disabled={loading}>
      {loading ? "Aprovando..." : "Aprovar"}
    </Button>
  );
}
