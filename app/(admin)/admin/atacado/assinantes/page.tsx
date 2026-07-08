import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AssinanteHistoricoDialog } from "@/components/admin/assinante-historico-dialog";
import { StatusBadge } from "@/components/shared/status-badge";

export default async function AtacadoAssinantesPage() {
  const assinantes = await prisma.assinaturaAtacado.findMany({
    include: { _count: { select: { reservas: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/atacado">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="size-4" />
            Voltar pra rodadas
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Assinantes do grupo de Atacado Coletivo</h1>
        <p className="text-sm text-muted-foreground">
          Quem está cadastrado pra reservar nas rodadas — status da assinatura mensal e histórico
          de compras de cada um.
        </p>
      </div>

      {assinantes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum assinante ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">CPF/CNPJ</th>
                <th className="px-3 py-2">Telefone</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Vencimento</th>
                <th className="px-3 py-2">Compras</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assinantes.map((a) => (
                <tr key={a.id}>
                  <td className="px-3 py-2 font-medium text-foreground">{a.compradorNome}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.compradorDoc}</td>
                  <td className="px-3 py-2 text-muted-foreground">{a.compradorTelefone}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {a.vencimento.toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-3 py-2">{a._count.reservas}</td>
                  <td className="px-3 py-2">
                    <AssinanteHistoricoDialog assinanteId={a.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
