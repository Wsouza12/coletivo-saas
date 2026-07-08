import Link from "next/link";
import { redirect } from "next/navigation";
import type { PedidoStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTime } from "@/lib/format";
import { StatusBadge, PlataformaBadge } from "@/components/shared/status-badge";
import { PedidoTimeline } from "@/components/shared/pedido-timeline";
import { montarEtapasPedido } from "@/lib/rastreio";
import { SolicitarDevolucaoButton } from "@/components/lojista/solicitar-devolucao-button";
import { PedidosTabsLojista } from "@/components/lojista/pedidos-tabs";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_GROUPS: Record<string, PedidoStatus[]> = {
  todos: [],
  novos: ["NOVO", "CONFIRMADO"],
  processamento: ["SEPARANDO", "EMBALANDO", "AGUARDANDO_COLETA"],
  enviados: ["ENVIADO"],
  entregues: ["ENTREGUE", "CANCELADO", "DEVOLVIDO"],
};

export default async function LojistaPedidosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.lojistaId) redirect("/login");

  const sp = await searchParams;
  const status = sp.status as PedidoStatus | undefined;
  const tab = sp.tab ?? "todos";
  const page = Math.max(1, Number(sp.page ?? "1"));
  const pageSize = Number(sp.pageSize ?? "10");

  const statusIn = status ? [status] : STATUS_GROUPS[tab] ?? [];

  const where = {
    lojistaId: session.user.lojistaId,
    ...(statusIn.length > 0 ? { status: { in: statusIn } } : {}),
  };

  const [pedidos, total] = await Promise.all([
    prisma.pedido.findMany({
      where,
      include: {
        itens: { include: { produto: { select: { nome: true, sku: true } } } },
        devolucao: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.pedido.count({ where }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Pedidos</h1>

      <PedidosTabsLojista />

      <div className="flex flex-col gap-4">
        {pedidos.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhum pedido nesta categoria.
            </CardContent>
          </Card>
        ) : (
          pedidos.map((pedido) => {
            const endereco = pedido.enderecoEntrega as { cidade?: string; uf?: string } | null;
            const { cancelado, etapas } = montarEtapasPedido(pedido);

            return (
              <Card key={pedido.id}>
                <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-[1fr_1.3fr_1fr_auto]">
                  {/* Coluna 1: linha do tempo */}
                  <div className="flex flex-col gap-2 border-b border-border pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                    <span className="font-mono text-xs text-muted-foreground">
                      Ref: {pedido.plataformaOrderId}
                    </span>
                    <PedidoTimeline
                      etapas={etapas}
                      cancelado={cancelado}
                      motivoCancelamento={pedido.motivoCancelamento}
                      status={pedido.status}
                      compact
                    />
                  </div>

                  {/* Coluna 2: informações do pedido */}
                  <div className="flex flex-col gap-1 border-b border-border pb-4 text-sm sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                    <div className="mb-1 flex items-center gap-2">
                      <PlataformaBadge plataforma={pedido.plataforma} />
                      <StatusBadge status={pedido.status} />
                    </div>
                    <p>
                      <span className="text-muted-foreground">Destino: </span>
                      {endereco?.cidade ?? "—"}
                      {endereco?.uf ? `/${endereco.uf}` : ""}
                    </p>
                    {pedido.rastreio && (
                      <p>
                        <span className="text-muted-foreground">Rastreio: </span>
                        {pedido.rastreio}
                        {pedido.transportadora ? ` — ${pedido.transportadora}` : ""}
                      </p>
                    )}
                    <p>
                      <span className="text-muted-foreground">Valor: </span>
                      <span className="font-medium text-success">{formatBRL(pedido.valorVenda.toString())}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(pedido.createdAt)}</p>
                  </div>

                  {/* Coluna 3: produtos */}
                  <div className="flex flex-col gap-1 border-b border-border pb-4 text-sm sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                    {pedido.itens.map((item) => (
                      <p key={item.id}>
                        {item.quantidade}x {item.produto.nome}{" "}
                        <span className="font-mono text-xs text-muted-foreground">({item.produto.sku})</span>
                      </p>
                    ))}
                  </div>

                  {/* Coluna 4: ações */}
                  <div className="flex flex-col items-stretch gap-2 sm:w-36">
                    <Link
                      href={`/pedidos/${pedido.id}`}
                      className="rounded-md border border-border px-3 py-1.5 text-center text-sm font-medium text-primary hover:bg-accent"
                    >
                      Ver detalhes
                    </Link>
                    {pedido.devolucao ? (
                      <div className="text-center">
                        <StatusBadge status={pedido.devolucao.status} />
                      </div>
                    ) : pedido.status === "ENTREGUE" ? (
                      <SolicitarDevolucaoButton pedidoId={pedido.id} />
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <PaginationControls page={page} pageSize={pageSize} total={total} />
    </div>
  );
}
