import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowLeft, DollarSign, Package, Truck, Percent, Users, Boxes } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { getConfiguracaoFinanceira } from "@/lib/configuracao-financeira";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AtacadoDashboardPage() {
  const [
    pagas,
    aguardando,
    assinaturas,
    rodadasPorStatus,
    config,
  ] = await Promise.all([
    prisma.reservaAtacado.aggregate({
      where: { status: "PAGO" },
      _sum: { valorTotal: true, valorProduto: true, valorTaxaServico: true, valorFrete: true, quantidade: true },
      _count: { _all: true },
    }),
    prisma.reservaAtacado.aggregate({
      where: { status: "AGUARDANDO_PAGAMENTO" },
      _sum: { valorTotal: true },
      _count: { _all: true },
    }),
    prisma.assinaturaAtacado.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.rodadaAtacado.groupBy({ by: ["status"], _count: { _all: true } }),
    getConfiguracaoFinanceira(),
  ]);

  const assinantesAtivos = await prisma.assinaturaAtacado.count({
    where: { status: "ATIVA", vencimento: { gt: new Date() } },
  });

  const faturamentoTotal = Number(pagas._sum.valorTotal ?? 0);
  const valorProdutos = Number(pagas._sum.valorProduto ?? 0);
  const valorTaxaServico = Number(pagas._sum.valorTaxaServico ?? 0);
  const valorFrete = Number(pagas._sum.valorFrete ?? 0);
  const totalVendas = pagas._count._all;
  const totalUnidadesVendidas = pagas._sum.quantidade ?? 0;
  const receitaAssinaturas = assinantesAtivos * 100;

  const statusRodadaMap = Object.fromEntries(rodadasPorStatus.map((r) => [r.status, r._count._all]));
  const statusAssinaturaMap = Object.fromEntries(assinaturas.map((a) => [a.status, a._count._all]));

  // O valor total de frete embute a margem de segurança. Lucro = Frete - (Frete / (1 + Margem%))
  const margemFrete = Number(config.margemSegurancaFrete);
  const multiplicadorMargem = 1 + margemFrete / 100;
  const custoFreteEstimado = valorFrete / multiplicadorMargem;
  const lucroFrete = valorFrete - custoFreteEstimado;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/atacado">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2">
            <ArrowLeft className="size-4" />
            Voltar pra rodadas
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Painel Financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Vendas, faturamento, fretes, assinaturas, usuários.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={DollarSign}
          label="Faturamento total (reservas pagas)"
          value={formatBRL(faturamentoTotal)}
          sub={`${totalVendas} venda(s) confirmada(s)`}
        />
        <MetricCard
          icon={Boxes}
          label="Unidades vendidas"
          value={String(totalUnidadesVendidas)}
          sub="Soma de todas as reservas pagas"
        />
        <MetricCard
          icon={Truck}
          label="Frete cobrado"
          value={formatBRL(valorFrete)}
          sub={`Inclui ${formatBRL(lucroFrete)} de margem extra (${margemFrete}%)`}
        />
        <MetricCard
          icon={Percent}
          label="Taxa de serviço arrecadada"
          value={formatBRL(valorTaxaServico)}
          sub={`Faturamento bruto: ${formatBRL(valorProdutos)}`}
        />
        <MetricCard
          icon={Users}
          label="Assinantes ativos"
          value={String(assinantesAtivos)}
          sub={`Receita de assinatura: ${formatBRL(receitaAssinaturas)}/mês`}
        />
        <MetricCard
          icon={Package}
          label="Reservas aguardando pagamento"
          value={String(aguardando._count._all)}
          sub={formatBRL(Number(aguardando._sum.valorTotal ?? 0)) + " em aberto"}
        />
        <MetricCard
          icon={Boxes}
          label="Rodadas abertas"
          value={String(statusRodadaMap.ABERTA ?? 0)}
          sub={`Fechadas: ${statusRodadaMap.FECHADA ?? 0} — Enviadas: ${statusRodadaMap.ENVIADA ?? 0}`}
        />
        <MetricCard
          icon={Users}
          label="Assinantes inadimplentes/cancelados"
          value={String((statusAssinaturaMap.INADIMPLENTE ?? 0) + (statusAssinaturaMap.CANCELADA ?? 0))}
          sub={`Total cadastrado: ${assinaturas.reduce((acc, a) => acc + a._count._all, 0)}`}
        />
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="size-4" />
          <span className="text-xs">{label}</span>
        </div>
        <span className="text-2xl font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </CardContent>
    </Card>
  );
}
