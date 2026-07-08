"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConfiguracoesEmpresaForm({
  initialStoreName,
  initialPhone,
  initialDocument,
  initialRazaoSocial,
  initialInscricaoEstadual,
}: {
  initialStoreName: string;
  initialPhone: string;
  initialDocument: string;
  initialRazaoSocial: string;
  initialInscricaoEstadual: string;
}) {
  const [storeName, setStoreName] = useState(initialStoreName);
  const [phone, setPhone] = useState(initialPhone);
  const [document, setDocument] = useState(initialDocument);
  const [razaoSocial, setRazaoSocial] = useState(initialRazaoSocial);
  const [inscricaoEstadual, setInscricaoEstadual] = useState(initialInscricaoEstadual);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/lojista/configuracoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName,
        phone: phone || undefined,
        document: document || undefined,
        razaoSocial: razaoSocial || undefined,
        inscricaoEstadual: inscricaoEstadual || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      toast.error(data?.error?.message ?? "Erro ao salvar dados da empresa");
      return;
    }
    toast.success("Dados da empresa atualizados");
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label>Nome da loja</Label>
        <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Telefone</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>CPF/CNPJ</Label>
        <Input value={document} onChange={(e) => setDocument(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Razão social</Label>
        <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Inscrição estadual</Label>
        <Input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} />
      </div>
      <Button type="submit" disabled={loading} className="w-fit sm:col-span-2">
        {loading ? "Salvando..." : "Salvar dados da empresa"}
      </Button>
    </form>
  );
}
