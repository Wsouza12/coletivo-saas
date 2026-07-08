import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBRL, formatDate } from "@/lib/format";
import { StatusBadge, PlataformaBadge } from "@/components/shared/status-badge";
import { LojistaStatusActions } from "@/components/admin/lojista-status-actions";
import { RedefinirSenhaButton } from "@/components/admin/redefinir-senha-button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function LojistaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lojista = await prisma.lojista.findUnique({
    where: { id },
    include: {
      user: true,
      integracoes: true,
      anuncios: {
        include: { produto: { select: { nome: true } }, kit: { select: { nome: true } } },
        orderBy: { createdAt: "desc" },
      },
      pedidos: { orderBy: { createdAt: "desc" }, take: 50 },
      faturas: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!lojista) notFound();

  const mlConectado = lojista.integracoes.find((i) => i.plataforma === "MERCADOLIVRE");
  const shopeeConectado = lojista.integracoes.find((i) => i.plataforma === "SHOPEE");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{lojista.storeName}</h1>
            <StatusBadge status={lojista.user.status} />
          </div>
          <p className="text-sm text-muted-foreground">{lojista.user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <RedefinirSenhaButton lojistaId={lojista.id} />
          <LojistaStatusActions lojistaId={lojista.id} status={lojista.user.status} />
        </div>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Visão Geral</TabsTrigger>
          <TabsTrigger value="anuncios">Anúncios</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card>
            <CardContent className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
              <Info label="Nome do responsável" value={lojista.user.name} />
              <Info label="Telefone" value={lojista.user.phone ?? "—"} />
              <Info label="Documento" value={lojista.user.document ?? "—"} />
              <Info
                label="Cadastrado em"
                value={formatDate(lojista.user.createdAt)}
              />
              <Info
                label="Aprovado em"
                value={lojista.approvedAt ? formatDate(lojista.approvedAt) : "—"}
              />
              <Info
                label="Mercado Livre"
                value={mlConectado ? `Conectado (${mlConectado.accountName})` : "Não conectado"}
              />
              <Info
                label="Shopee"
                value={shopeeConectado ? `Conectado (${shopeeConectado.accountName})` : "Não conectado"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anuncios">
          <Card>
            <CardContent className="p-0">
              {lojista.anuncios.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Nenhum anúncio publicado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Preço venda</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lojista.anuncios.map((anuncio) => (
                      <TableRow key={anuncio.id}>
                        <TableCell>{anuncio.produto?.nome ?? `Kit: ${anuncio.kit?.nome}`}</TableCell>
                        <TableCell>
                          <PlataformaBadge plataforma={anuncio.plataforma} />
                        </TableCell>
                        <TableCell>{formatBRL(anuncio.precoVenda.toString())}</TableCell>
                        <TableCell>
                          <StatusBadge status={anuncio.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pedidos">
          <Card>
            <CardContent className="p-0">
              {lojista.pedidos.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Nenhum pedido.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Valor custo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lojista.pedidos.map((pedido) => (
                      <TableRow key={pedido.id}>
                        <TableCell className="font-mono text-xs">
                          {pedido.id.slice(-8)}
                        </TableCell>
                        <TableCell>
                          <PlataformaBadge plataforma={pedido.plataforma} />
                        </TableCell>
                        <TableCell>{formatBRL(pedido.valorCusto.toString())}</TableCell>
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
        </TabsContent>

        <TabsContent value="financeiro">
          <Card>
            <CardContent className="p-0">
              {lojista.faturas.length === 0 ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma fatura emitida.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lojista.faturas.map((fatura) => (
                      <TableRow key={fatura.id}>
                        <TableCell className="font-mono text-xs">{fatura.numero}</TableCell>
                        <TableCell>
                          {formatDate(fatura.periodoInicio)} – {formatDate(fatura.periodoFim)}
                        </TableCell>
                        <TableCell>{formatBRL(fatura.valorTotal.toString())}</TableCell>
                        <TableCell>{formatDate(fatura.vencimento)}</TableCell>
                        <TableCell>
                          <StatusBadge status={fatura.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
