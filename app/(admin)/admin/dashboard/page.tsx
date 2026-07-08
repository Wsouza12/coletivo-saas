import Link from "next/link";
import { ClipboardList, DollarSign, TrendingUp, Users, PackageSearch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDashboardMetrics } from "@/lib/dashboard";
import { formatBRL, formatDate, initials } from "@/lib/format";
import { StatusBadge, PlataformaBadge } from "@/components/shared/status-badge";
import { DashboardChart } from "@/components/admin/dashboard-chart";
import { AprovarLojistaButton } from "@/components/admin/aprovar-lojista-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default async function AdminDashboardPage() {
  const { kpis, pedidosFulfillment, graficoPedidos, lojistasPendentes } =
    await getDashboardMetrics();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={ClipboardList}
          label="Pedidos hoje"
          value={String(kpis.pedidosHoje)}
        />
        <KpiCard
          icon={PackageSearch}
          label="Aguardando fulfillment"
          value={String(kpis.pedidosAguardando)}
        />
        <KpiCard
          icon={DollarSign}
          label="Faturamento bruto (mês)"
          value={formatBRL(kpis.faturamentoBrutoMes)}
        />
        <KpiCard
          icon={TrendingUp}
          label="Faturamento líquido (mês)"
          value={formatBRL(kpis.faturamentoLiquidoMes)}
        />
        <KpiCard icon={Users} label="Lojistas ativos" value={String(kpis.lojistasAtivos)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos dos últimos 7 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardChart data={graficoPedidos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedidos para fulfillment</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pedidosFulfillment.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Nenhum pedido pendente de fulfillment.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Produto(s)</TableHead>
                  <TableHead>Lojista</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Valor custo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidosFulfillment.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-mono text-xs">
                      {pedido.id.slice(-8)}
                    </TableCell>
                    <TableCell>
                      {pedido.itens.map((i) => i.produto.nome).join(", ")}
                    </TableCell>
                    <TableCell>{pedido.lojista.storeName}</TableCell>
                    <TableCell>
                      <PlataformaBadge plataforma={pedido.plataforma} />
                    </TableCell>
                    <TableCell>{formatBRL(pedido.valorCusto.toString())}</TableCell>
                    <TableCell>
                      <StatusBadge status={pedido.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/pedidos/${pedido.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Ver detalhes
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lojistas aguardando aprovação</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lojistasPendentes.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              Nenhum lojista pendente.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {lojistasPendentes.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-4 px-6 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {user.lojista?.storeName ?? user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user.email} · cadastrado em {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </div>
                  {user.lojista && <AprovarLojistaButton lojistaId={user.lojista.id} />}
                </li>
              ))}
            </ul>
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
