import Link from "next/link";
import { redirect } from "next/navigation";
import type { DevolucaoStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { DevolucoesTabs } from "@/components/shared/devolucoes-tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_GROUPS: Record<string, DevolucaoStatus[]> = {
  todas: [],
  pendentes: ["SOLICITADA"],
  andamento: ["EM_ANDAMENTO"],
  concluidas: ["REEMBOLSADA", "NEGADA"],
};

export default async function LojistaDevolucoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const sp = await searchParams;
  const tab = sp.tab ?? "todas";
  const statusIn = STATUS_GROUPS[tab] ?? [];
  const lojistaId = session.user.lojistaId;

  const [devolucoes, totalDevolucoes, pendentes, reembolsadas] = await Promise.all([
    prisma.devolucao.findMany({
      where: { lojistaId, ...(statusIn.length > 0 ? { status: { in: statusIn } } : {}) },
      include: {
        pedido: { select: { id: true, plataformaOrderId: true, compradorNome: true, valorVenda: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.devolucao.count({ where: { lojistaId } }),
    prisma.devolucao.count({ where: { lojistaId, status: "SOLICITADA" } }),
    prisma.devolucao.aggregate({
      where: { lojistaId, status: "REEMBOLSADA" },
      _sum: { valorReembolso: true },
    }),
  ]);

  const totalReembolsado = reembolsadas._sum.valorReembolso?.toString() ?? "0";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Devoluções e Reembolsos</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1 pt-6">
            <span className="text-2xl font-bold text-foreground">{totalDevolucoes}</span>
            <span className="text-sm text-muted-foreground">Devoluções</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-6">
            <span className="text-2xl font-bold text-foreground">{pendentes}</span>
            <span className="text-sm text-muted-foreground">Pendentes</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-6">
            <span className="text-2xl font-bold text-foreground">{formatBRL(totalReembolsado)}</span>
            <span className="text-sm text-muted-foreground">Total reembolsado</span>
          </CardContent>
        </Card>
      </div>

      <DevolucoesTabs />

      <Card>
        <CardContent className="p-0">
          {devolucoes.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhuma devolução nesta categoria.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#Pedido</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Valor venda</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Solicitado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devolucoes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`/pedidos/${d.pedido.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {d.pedido.plataformaOrderId}
                      </Link>
                    </TableCell>
                    <TableCell>{d.pedido.compradorNome}</TableCell>
                    <TableCell>{formatBRL(d.pedido.valorVenda.toString())}</TableCell>
                    <TableCell className="max-w-xs truncate">{d.motivo}</TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell>{formatDate(d.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
