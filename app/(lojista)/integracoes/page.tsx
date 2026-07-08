import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IntegracaoCard } from "@/components/lojista/integracao-card";
import { VincularVendaDialog } from "@/components/lojista/vincular-venda-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function IntegracoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const sp = await searchParams;

  const integracoes = await prisma.integracao.findMany({
    where: { lojistaId: session.user.lojistaId, ativa: true },
  });

  const ml = integracoes.find((i) => i.plataforma === "MERCADOLIVRE");
  const shopee = integracoes.find((i) => i.plataforma === "SHOPEE");

  const vendasSemVinculo = await prisma.vendaNaoVinculada.findMany({
    where: { lojistaId: session.user.lojistaId, resolvido: false },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Integrações</h1>

      {sp.success && (
        <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {sp.success === "ml" ? "Mercado Livre" : "Shopee"} conectado com sucesso.
        </div>
      )}
      {sp.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Não foi possível conectar com {sp.error === "ml" ? "Mercado Livre" : "Shopee"}. Tente novamente.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <IntegracaoCard
          titulo="Mercado Livre"
          plataforma="MERCADOLIVRE"
          connectPath="/api/lojista/integracoes/ml/connect"
          conectado={!!ml}
          accountName={ml?.accountName}
          tokenExpiry={ml?.tokenExpiry.toISOString()}
        />
        <IntegracaoCard
          titulo="Shopee"
          plataforma="SHOPEE"
          connectPath="/api/lojista/integracoes/shopee/connect"
          conectado={!!shopee}
          accountName={shopee?.accountName}
          tokenExpiry={shopee?.tokenExpiry.toISOString()}
        />
      </div>

      {vendasSemVinculo.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas sem produto vinculado</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Você vendeu esses itens em ML/Shopee, mas eles não estão vinculados a nenhum produto
              do nosso catálogo — por isso não entraram nos seus pedidos nem no estoque. Vincule
              manualmente pra corrigir as próximas vendas desse anúncio.
            </p>
            {vendasSemVinculo.map((venda) => (
              <div
                key={venda.id}
                className="flex flex-col items-start justify-between gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center"
              >
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    {venda.tituloAnuncio ?? `Item ${venda.plataformaItemId}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {venda.plataforma} — item {venda.plataformaItemId} — pedido {venda.plataformaOrderId}
                  </p>
                </div>
                <VincularVendaDialog
                  vendaId={venda.id}
                  plataforma={venda.plataforma}
                  plataformaItemId={venda.plataformaItemId}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
