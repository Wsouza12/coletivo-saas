import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ClipboardList, Megaphone, DollarSign, TrendingUp } from "lucide-react";
import { auth } from "@/lib/auth";
import { getLojistaDashboard } from "@/lib/lojista-dashboard";
import { formatBRL, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, PlataformaBadge } from "@/components/shared/status-badge";

export default async function LojistaDashboardPage() {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const { kpis, ultimosPedidos, proximaFatura, alertas } = await getLojistaDashboard(
    session.user.lojistaId
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>

      {alertas.integracoesExpiradas.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Sua integração com{" "}
          {alertas.integracoesExpiradas
            .map((p) => (p === "MERCADOLIVRE" ? "Mercado Livre" : "Shopee"))
            .join(" e ")}{" "}
          expirou.{" "}
          <Link href="/integracoes" className="font-medium underline">
            Reconectar →
          </Link>
        </div>
      )}

      {alertas.produtosEstoqueBaixo.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            Estoque baixo para: {alertas.produtosEstoqueBaixo.join(", ")}. As vendas podem ser
            pausadas pelo Pablo em breve.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={ClipboardList} label="Pedidos hoje" value={String(kpis.pedidosHoje)} />
        <KpiCard icon={Megaphone} label="Anúncios ativos" value={String(kpis.anunciosAtivos)} />
        <KpiCard icon={DollarSign} label="Receita do mês" value={formatBRL(kpis.receitaMes)} />
        <KpiCard icon={TrendingUp} label="Margem do mês" value={formatBRL(kpis.margemMes)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próxima fatura</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-2xl font-semibold text-foreground">
              {formatBRL(proximaFatura.valorEstimado)}
            </p>
            <p className="text-sm text-muted-foreground">
              {proximaFatura.vencimento
                ? `Vencimento: ${formatDate(proximaFatura.vencimento)} (${proximaFatura.numero})`
                : "Ainda não gerada pelo admin"}
            </p>
            <Button variant="outline" size="sm" className="mt-2 w-fit" render={<Link href="/financeiro" />}>
              Ver financeiro
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button render={<Link href="/catalogo" />}>Publicar novo produto</Button>
            <Button variant="outline" render={<Link href="/pedidos?status=NOVO" />}>
              Ver pedidos pendentes
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimos pedidos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {ultimosPedidos.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">
              Você ainda não tem pedidos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Valor venda</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ultimosPedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell>{pedido.itens.map((i) => i.produto.nome).join(", ")}</TableCell>
                    <TableCell>
                      <PlataformaBadge plataforma={pedido.plataforma} />
                    </TableCell>
                    <TableCell>{formatBRL(pedido.valorVenda.toString())}</TableCell>
                    <TableCell>
                      <StatusBadge status={pedido.status} />
                    </TableCell>
                    <TableCell>{formatDate(pedido.createdAt)}</TableCell>
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
