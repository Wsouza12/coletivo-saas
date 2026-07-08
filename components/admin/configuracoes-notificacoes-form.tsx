"use client";

import { useState } from "react";
import { toast } from "sonner";

export function ConfiguracoesNotificacoesForm({
  initialEmailNovoPedido,
  initialEmailLojistaAprovado,
}: {
  initialEmailNovoPedido: boolean;
  initialEmailLojistaAprovado: boolean;
}) {
  const [emailNovoPedido, setEmailNovoPedido] = useState(initialEmailNovoPedido);
  const [emailLojistaAprovado, setEmailLojistaAprovado] = useState(initialEmailLojistaAprovado);
  const [loading, setLoading] = useState(false);

  async function salvar(next: { emailNovoPedido: boolean; emailLojistaAprovado: boolean }) {
    setLoading(true);
    const res = await fetch("/api/admin/configuracoes/notificacoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Erro ao salvar preferências");
      return;
    }
    toast.success("Preferências salvas");
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <label className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
        <span className="text-sm">Email ao receber novo pedido</span>
        <input
          type="checkbox"
          checked={emailNovoPedido}
          disabled={loading}
          onChange={(e) => {
            setEmailNovoPedido(e.target.checked);
            salvar({ emailNovoPedido: e.target.checked, emailLojistaAprovado });
          }}
        />
      </label>
      <label className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
        <span className="text-sm">Email ao lojista ser aprovado</span>
        <input
          type="checkbox"
          checked={emailLojistaAprovado}
          disabled={loading}
          onChange={(e) => {
            setEmailLojistaAprovado(e.target.checked);
            salvar({ emailNovoPedido, emailLojistaAprovado: e.target.checked });
          }}
        />
      </label>
    </div>
  );
}
