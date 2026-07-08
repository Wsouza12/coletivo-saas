import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTime } from "@/lib/format";
import { StatusBadge, PlataformaBadge } from "@/components/shared/status-badge";
import { SolicitarDevolucaoButton } from "@/components/lojista/solicitar-devolucao-button";
import { PedidoTimeline } from "@/components/shared/pedido-timeline";
import { montarEtapasPedido } from "@/lib/rastreio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LojistaPedidoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const { id } = await params;
  const pedido = await prisma.pedido.findFirst({
    where: { id, lojistaId: session.user.lojistaId },
    include: {
      itens: { include: { produto: { select: { nome: true, sku: true } } } },
      devolucao: true,
    },
  });

  if (!pedido) notFound();

  const endereco = pedido.enderecoEntrega as { cidade?: string; uf?: string } | null;
  const { cancelado, etapas } = montarEtapasPedido(pedido);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Pedido #{pedido.plataformaOrderId}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDateTime(pedido.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <PlataformaBadge plataforma={pedido.plataforma} />
          <StatusBadge status={pedido.status} />
          {pedido.devolucao ? (
            <StatusBadge status={pedido.devolucao.status} />
          ) : pedido.status === "ENTREGUE" ? (
            <SolicitarDevolucaoButton pedidoId={pedido.id} />
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Itens do pedido</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pedido.itens.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.produto.nome} ({item.produto.sku}) × {item.quantidade}
                </span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-medium">
              <span>Valor recebido</span>
              <span>{formatBRL(pedido.valorVenda.toString())}</span>
            </div>
            {pedido.rastreio && (
              <p className="mt-2 text-sm text-muted-foreground">
                Rastreio: <span className="font-medium text-foreground">{pedido.rastreio}</span>
                {pedido.transportadora ? ` — ${pedido.transportadora}` : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entrega</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Destino: {endereco?.cidade ?? "—"}
              {endereco?.uf ? `/${endereco.uf}` : ""}
            </p>
            <p className="mt-2 text-xs">
              O endereço completo do comprador é gerenciado apenas pelo Pablo para o envio.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status do fulfillment</CardTitle>
        </CardHeader>
        <CardContent>
          <PedidoTimeline
            etapas={etapas}
            cancelado={cancelado}
            motivoCancelamento={pedido.motivoCancelamento}
            status={pedido.status}
          />
        </CardContent>
      </Card>
    </div>
  );
}
