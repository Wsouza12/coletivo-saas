import { DollarSign, CheckCircle, AlertTriangle } from "lucide-react";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { getFinanceiroResumo } from "@/lib/financeiro";
import { GerarFaturasButton } from "@/components/admin/gerar-faturas-button";
import { FaturaStatusActions } from "@/components/admin/fatura-status-actions";
import { PaginationControls } from "@/components/shared/pagination-controls";

export default async function AdminFinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1"));
  const pageSize = Number(sp.pageSize ?? "25");

  const [resumo, faturas, total] = await Promise.all([
    getFinanceiroResumo(),
    prisma.fatura.findMany({
      include: { lojista: { select: { storeName: true } } },
      orderBy: { vencimento: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.fatura.count(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Financeiro</h1>
        <GerarFaturasButton />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={DollarSign} label="Total a receber" value={formatBRL(resumo.aReceber)} />
        <KpiCard
          icon={CheckCircle}
          label="Recebido este mês"
          value={formatBRL(resumo.recebidoEsteMes)}
        />
        <KpiCard
          icon={AlertTriangle}
          label="Lojistas inadimplentes"
          value={String(resumo.inadimplentes)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {faturas.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Nenhuma fatura emitida ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Fatura</TableHead>
                  <TableHead>Lojista</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Qtd pedidos</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faturas.map((fatura) => (
                  <TableRow key={fatura.id}>
                    <TableCell className="font-mono text-xs">{fatura.numero}</TableCell>
                    <TableCell>{fatura.lojista.storeName}</TableCell>
                    <TableCell>
                      {formatDate(fatura.periodoInicio)} – {formatDate(fatura.periodoFim)}
                    </TableCell>
                    <TableCell>{fatura.totalPedidos}</TableCell>
                    <TableCell>{formatBRL(fatura.valorTotal.toString())}</TableCell>
                    <TableCell>{formatDate(fatura.vencimento)}</TableCell>
                    <TableCell>
                      <StatusBadge status={fatura.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <FaturaStatusActions faturaId={fatura.id} status={fatura.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <PaginationControls page={page} pageSize={pageSize} total={total} />
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
