"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

type Compra = {
  id: string; compradorNome: string; compradorDoc: string; compradorTelefone: string;
  compradorEmail: string | null; tipo: string; incluiComunidade: boolean; valor: number;
  status: string; pagoEm: string | null; createdAt: string;
};
type Dados = { compras: Compra[]; totalPagas: number; faturamento: number };

function mascaraCpf(cpf: string) {
  const d = (cpf || "").replace(/\D/g, "").padStart(11, "0");
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function ListaVendasPanel() {
  const [dados, setDados] = useState<Dados | null>(null);

  useEffect(() => {
    fetch("/api/admin/lista-fornecedores/vendas").then((r) => r.json()).then((j) => setDados(j.data)).catch(() => toast.error("Erro ao carregar"));
  }, []);

  if (!dados) return <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{dados.totalPagas}</p>
          <p className="text-xs text-muted-foreground">vendas pagas</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold">R$ {dados.faturamento.toFixed(2).replace(".", ",")}</p>
          <p className="text-xs text-muted-foreground">faturamento</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b">
              <th className="text-left font-medium p-3">Comprador</th>
              <th className="text-left font-medium p-3">CPF</th>
              <th className="text-left font-medium p-3">WhatsApp</th>
              <th className="text-left font-medium p-3">Plano</th>
              <th className="text-right font-medium p-3">Valor</th>
              <th className="text-left font-medium p-3">Status</th>
              <th className="text-left font-medium p-3">Quando</th>
            </tr>
          </thead>
          <tbody>
            {dados.compras.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhuma venda ainda.</td></tr>
            ) : dados.compras.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="p-3">{c.compradorNome}{c.compradorEmail ? <span className="block text-xs text-muted-foreground">{c.compradorEmail}</span> : null}</td>
                <td className="p-3 text-xs">{mascaraCpf(c.compradorDoc)}</td>
                <td className="p-3 text-xs">{c.compradorTelefone}</td>
                <td className="p-3 text-xs">
                  {c.tipo === "CATALOGOS" ? "Só catálogos" : "Completa"}
                  {c.incluiComunidade ? <span className="block text-amber-600">+ comunidade</span> : null}
                </td>
                <td className="p-3 text-right">R$ {c.valor.toFixed(2).replace(".", ",")}</td>
                <td className="p-3">
                  <Badge className={c.status === "PAGO" ? "bg-emerald-100 text-emerald-700" : c.status === "CANCELADO" ? "bg-muted text-muted-foreground" : "bg-amber-100 text-amber-700"}>
                    {c.status === "PAGO" ? "Pago" : c.status === "CANCELADO" ? "Cancelado" : "Aguardando"}
                  </Badge>
                </td>
                <td className="p-3 text-xs text-muted-foreground">
                  {new Date(c.pagoEm ?? c.createdAt).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
