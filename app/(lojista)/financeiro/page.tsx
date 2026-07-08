import { redirect } from "next/navigation";
import { DollarSign, CheckCircle, CalendarClock, Wallet } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { FaturaDetalheDialog } from "@/components/lojista/fatura-detalhe-dialog";
import { PagarFaturaButton } from "@/components/lojista/pagar-fatura-button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function LojistaFinanceiroPage() {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const lojistaId = session.user.lojistaId;
  const anoAtual = new Date().getFullYear();

  const [faturas, faturaAberta, pagoEsteAno, proximaFatura, lojista] = await Promise.all([
    prisma.fatura.findMany({ where: { lojistaId }, orderBy: { vencimento: "desc" } }),
    prisma.fatura.aggregate({
      where: { lojistaId, status: { in: ["PENDENTE", "ENVIADA"] } },
      _sum: { valorTotal: true },
    }),
    prisma.fatura.aggregate({
      where: { lojistaId, status: "PAGA", pagoEm: { gte: new Date(anoAtual, 0, 1) } },
      _sum: { valorTotal: true },
    }),
    prisma.fatura.findFirst({
      where: { lojistaId, status: { in: ["PENDENTE", "ENVIADA"] } },
      orderBy: { vencimento: "asc" },
    }),
    prisma.lojista.findUniqueOrThrow({ where: { id: lojistaId }, select: { saldoCredito: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Financeiro</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Fatura atual em aberto"
          value={formatBRL(Number(faturaAberta._sum.valorTotal ?? 0))}
        />
        <KpiCard
          icon={CheckCircle}
          label="Total pago este ano"
          value={formatBRL(Number(pagoEsteAno._sum.valorTotal ?? 0))}
        />
        <KpiCard
          icon={CalendarClock}
          label="Próximo vencimento"
          value={proximaFatura ? formatDate(proximaFatura.vencimento) : "—"}
        />
        <KpiCard
          icon={Wallet}
          label="Saldo de crédito (devoluções)"
          value={formatBRL(lojista.saldoCredito.toString())}
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
                  <TableHead>Nº</TableHead>
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
                    <TableCell>
                      {formatDate(fatura.periodoInicio)} – {formatDate(fatura.periodoFim)}
                    </TableCell>
                    <TableCell>{fatura.totalPedidos}</TableCell>
                    <TableCell>
                      {formatBRL(fatura.valorTotal.toString())}
                      {Number(fatura.creditoAplicado) > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (crédito: {formatBRL(fatura.creditoAplicado.toString())})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(fatura.vencimento)}</TableCell>
                    <TableCell>
                      <StatusBadge status={fatura.status} />
                    </TableCell>
                    <TableCell className="flex items-center justify-end gap-2">
                      <FaturaDetalheDialog faturaId={fatura.id} numero={fatura.numero} />
                      {fatura.status === "ENVIADA" && (
                        <PagarFaturaButton linkPagamento={fatura.mpPaymentLink} />
                      )}
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
