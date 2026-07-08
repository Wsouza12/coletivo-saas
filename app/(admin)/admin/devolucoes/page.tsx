import Link from "next/link";
import type { DevolucaoStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { DevolucoesTabs } from "@/components/shared/devolucoes-tabs";
import { DevolucaoStatusActions } from "@/components/admin/devolucao-status-actions";
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

export default async function AdminDevolucoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "todas";
  const statusIn = STATUS_GROUPS[tab] ?? [];

  const devolucoes = await prisma.devolucao.findMany({
    where: statusIn.length > 0 ? { status: { in: statusIn } } : {},
    include: {
      lojista: { select: { storeName: true } },
      pedido: {
        select: {
          id: true,
          plataformaOrderId: true,
          compradorNome: true,
          valorVenda: true,
          itens: { include: { produto: { select: { nome: true, sku: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Devoluções e Reembolsos</h1>

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
                  <TableHead>Lojista</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>Valor venda</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devolucoes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <Link
                        href={`/admin/pedidos/${d.pedido.id}`}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        {d.pedido.plataformaOrderId}
                      </Link>
                    </TableCell>
                    <TableCell>{d.lojista.storeName}</TableCell>
                    <TableCell className="max-w-xs">
                      {d.pedido.itens.map((item) => (
                        <div key={item.id} className="text-xs">
                          {item.produto.nome}{" "}
                          <span className="font-mono text-muted-foreground">({item.produto.sku})</span>
                          {item.quantidade > 1 ? ` x${item.quantidade}` : ""}
                        </div>
                      ))}
                    </TableCell>
                    <TableCell>{d.pedido.compradorNome}</TableCell>
                    <TableCell>{formatBRL(d.pedido.valorVenda.toString())}</TableCell>
                    <TableCell className="max-w-xs truncate">{d.motivo}</TableCell>
                    <TableCell>
                      <StatusBadge status={d.status} />
                    </TableCell>
                    <TableCell>{formatDate(d.createdAt)}</TableCell>
                    <TableCell>
                      <DevolucaoStatusActions devolucaoId={d.id} status={d.status} />
                    </TableCell>
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
