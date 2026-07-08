import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDateTime } from "@/lib/format";
import { StatusBadge, PlataformaBadge } from "@/components/shared/status-badge";
import { ProvasEnvio } from "@/components/admin/provas-envio";
import { PedidoStatusActions } from "@/components/admin/pedido-status-actions";
import { ETAPAS_ORDEM } from "@/lib/rastreio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ETAPA_LABEL: Record<string, string> = {
  NOVO: "Pedido recebido",
  CONFIRMADO: "Pagamento confirmado",
  SEPARANDO: "Em separação",
  EMBALANDO: "Em embalagem",
  AGUARDANDO_COLETA: "Aguardando coleta",
  ENVIADO: "Enviado",
  ENTREGUE: "Entregue",
};

const TIMESTAMP_POR_STATUS: Record<string, "createdAt" | "embalagemEm" | "enviadoEm" | "entregueEm"> = {
  NOVO: "createdAt",
  EMBALANDO: "embalagemEm",
  ENVIADO: "enviadoEm",
  ENTREGUE: "entregueEm",
};

export default async function AdminPedidoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      lojista: { select: { id: true, storeName: true } },
      itens: { include: { produto: { select: { nome: true, sku: true } } } },
    },
  });

  if (!pedido) notFound();

  const endereco = pedido.enderecoEntrega as {
    rua?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  } | null;

  const cancelado = pedido.status === "CANCELADO" || pedido.status === "DEVOLVIDO";
  const indiceAtual = ETAPAS_ORDEM.indexOf(pedido.status as (typeof ETAPAS_ORDEM)[number]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Pedido #{pedido.plataformaOrderId}
          </h1>
          <p className="text-sm text-muted-foreground">
            Loja:{" "}
            <Link href={`/admin/lojistas/${pedido.lojista.id}`} className="text-primary hover:underline">
              {pedido.lojista.storeName}
            </Link>{" "}
            · {formatDateTime(pedido.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PlataformaBadge plataforma={pedido.plataforma} />
          <StatusBadge status={pedido.status} />
          <PedidoStatusActions pedidoId={pedido.id} status={pedido.status} />
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
                <span className="text-muted-foreground">{formatBRL(item.precoUnit.toString())}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-medium">
              <span>Valor de custo total</span>
              <span>{formatBRL(pedido.valorCusto.toString())}</span>
            </div>
            {pedido.rastreio && (
              <p className="mt-2 text-sm text-muted-foreground">
                Rastreio: <span className="font-medium text-foreground">{pedido.rastreio}</span>
                {pedido.transportadora ? ` — ${pedido.transportadora}` : ""}
              </p>
            )}
            {pedido.notaFiscal && (
              <p className="text-sm text-muted-foreground">
                Nota Fiscal: <span className="font-medium text-foreground">{pedido.notaFiscal}</span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comprador</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <p className="font-medium text-foreground">{pedido.compradorNome}</p>
            {pedido.compradorDoc && (
              <p className="text-muted-foreground">Doc: {pedido.compradorDoc}</p>
            )}
            {endereco && (
              <p className="text-muted-foreground">
                {endereco.rua}, {endereco.numero}
                {endereco.complemento ? ` — ${endereco.complemento}` : ""}
                <br />
                {endereco.bairro} · {endereco.cidade}/{endereco.uf}
                <br />
                CEP {endereco.cep}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linha do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          {cancelado ? (
            <p className="text-sm text-destructive">
              Pedido {pedido.status === "CANCELADO" ? "cancelado" : "devolvido"}
              {pedido.motivoCancelamento ? `: ${pedido.motivoCancelamento}` : ""}
            </p>
          ) : (
            <ol className="flex flex-col gap-4">
              {ETAPAS_ORDEM.map((etapa, i) => {
                const concluida = i <= indiceAtual;
                const campo = TIMESTAMP_POR_STATUS[etapa];
                const dataHora = campo ? (pedido[campo] as Date | null) : null;
                return (
                  <li key={etapa} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full",
                        concluida ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {concluida && <Check className="size-3.5" />}
                    </span>
                    <span
                      className={cn(
                        "text-sm",
                        concluida ? "font-medium text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {ETAPA_LABEL[etapa]}
                    </span>
                    {dataHora && (
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(dataHora)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <ProvasEnvio pedidoId={pedido.id} statusAtual={pedido.status} />
    </div>
  );
}
