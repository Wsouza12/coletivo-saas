"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LojistaStatusActions({
  lojistaId,
  status,
}: {
  lojistaId: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(novoStatus: "ACTIVE" | "SUSPENDED") {
    setLoading(true);
    const res = await fetch(`/api/admin/lojistas/${lojistaId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: novoStatus }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error?.message ?? "Erro ao atualizar status");
      setLoading(false);
      return;
    }
    toast.success("Status atualizado");
    router.refresh();
  }

  if (status === "PENDING") {
    return (
      <Button size="sm" disabled={loading} onClick={() => updateStatus("ACTIVE")}>
        Aprovar
      </Button>
    );
  }
  if (status === "ACTIVE") {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => updateStatus("SUSPENDED")}
      >
        Suspender
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline" disabled={loading} onClick={() => updateStatus("ACTIVE")}>
      Reativar
    </Button>
  );
}
