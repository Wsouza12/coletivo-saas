import Link from "next/link";
import type { PedidoStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { StatusBadge, PlataformaBadge } from "@/components/shared/status-badge";
import { PedidosTabs } from "@/components/admin/pedidos-tabs";
import { PedidoStatusActions } from "@/components/admin/pedido-status-actions";
import { PaginationControls } from "@/components/shared/pagination-controls";

const STATUS_GROUPS: Record<string, PedidoStatus[]> = {
  novos: ["NOVO", "CONFIRMADO"],
  processamento: ["SEPARANDO", "EMBALANDO", "AGUARDANDO_COLETA"],
  enviados: ["ENVIADO"],
  finalizados: ["ENTREGUE", "CANCELADO", "DEVOLVIDO"],
};

export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? "novos";
  const page = Math.max(1, Number(sp.page ?? "1"));
  const pageSize = Number(sp.pageSize ?? "25");
  const statusIn = STATUS_GROUPS[tab] ?? STATUS_GROUPS.novos;

  const [pedidos, total] = await Promise.all([
    prisma.pedido.findMany({
      where: { status: { in: statusIn } },
      include: {
        lojista: { select: { storeName: true } },
        itens: { include: { produto: { select: { nome: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pedido.count({ where: { status: { in: statusIn } } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Pedidos</h1>

      <PedidosTabs />

      <Card>
        <CardContent className="p-0">
          {pedidos.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhum pedido nesta categoria.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#Order</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Produto(s)</TableHead>
                  <TableHead>Lojista</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Valor custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido) => {
                  const endereco = pedido.enderecoEntrega as {
                    cidade?: string;
                    uf?: string;
                  } | null;
                  return (
                    <TableRow key={pedido.id}>
                      <TableCell>
                        <Link
                          href={`/admin/pedidos/${pedido.id}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {pedido.plataformaOrderId}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <PlataformaBadge plataforma={pedido.plataforma} />
                      </TableCell>
                      <TableCell>
                        {pedido.itens.map((i) => i.produto.nome).join(", ")}
                      </TableCell>
                      <TableCell>{pedido.lojista.storeName}</TableCell>
                      <TableCell>
                        {endereco?.cidade ? `${endereco.cidade}/${endereco.uf ?? ""}` : "—"}
                      </TableCell>
                      <TableCell>{formatBRL(pedido.valorCusto.toString())}</TableCell>
                      <TableCell>
                        <StatusBadge status={pedido.status} />
                      </TableCell>
                      <TableCell>{formatDate(pedido.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <PedidoStatusActions pedidoId={pedido.id} status={pedido.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <PaginationControls page={page} pageSize={pageSize} total={total} />
        </CardContent>
      </Card>
    </div>
  );
}
