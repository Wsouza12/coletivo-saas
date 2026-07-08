import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Package, RotateCcw, Truck } from "lucide-react";
import { CopiarCodigo } from "@/components/atacado/CopiarCodigo";

export const dynamic = "force-dynamic";

export default async function RastreioCaixaPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const rodada = await prisma.rodadaAtacado.findUnique({
    where: { codigoRastreio: codigo },
    include: {
      produtoAtacado: true,
      reservas: { where: { status: "PAGO" }, orderBy: { createdAt: "asc" } }
    }
  });

  if (!rodada) {
    notFound();
  }

  const steps = [
    { label: "Caixa Aberta", desc: "Grupo reservando unidades" },
    { label: "Caixa Fechada", desc: "Meta atingida, aguardando separação" },
    { label: "Separando", desc: "Separação dos produtos no estoque" },
    { label: "Embalando", desc: "Embalagem e preparação da caixa" },
    { label: "Pronta para Envio", desc: "Caixa selada e aguardando coleta" },
    { label: "Enviada", desc: "Despachada para a transportadora" }
  ];

  const statusToStepIndex: Record<string, number> = {
    ABERTA: 0,
    FECHADA: 1,
    SEPARANDO: 2,
    EMBALANDO: 3,
    PRONTA_ENVIO: 4,
    ENVIADA: 5
  };

  const currentStatusIndex = statusToStepIndex[rodada.status] ?? 0;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Badge className="mb-2 bg-emerald-600 hover:bg-emerald-700 text-white">Atacado Coletivo</Badge>
          <h1 className="text-2xl font-bold tracking-tight">Rastreamento de Caixa</h1>
          <p className="text-sm text-muted-foreground">Código de Rastreio: <span className="font-semibold text-foreground">{rodada.codigoRastreio}</span></p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground">Status Atual</span>
          <Badge variant={rodada.status === "CANCELADA" ? "destructive" : "secondary"} className="mt-1 font-semibold uppercase">
            {rodada.status}
          </Badge>
        </div>
      </div>

      {rodada.envioCodigo && (
        <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CardContent className="flex flex-col md:flex-row justify-between items-center gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 text-white p-3 rounded-full shrink-0">
                <Truck className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Caixa Enviada por Transportadora</h3>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 flex items-center flex-wrap">
                  Código de Rastreamento: <span className="font-mono font-bold select-all bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded text-emerald-900 dark:text-emerald-100 ml-1.5">{rodada.envioCodigo}</span>
                  <CopiarCodigo codigo={rodada.envioCodigo} />
                </p>
              </div>
            </div>
            {rodada.envioLink && (
              <a
                href={rodada.envioLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto text-center bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow transition shrink-0"
              >
                Rastrear na Transportadora
              </a>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Info do Produto */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Produto da Caixa</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <div className="relative w-40 h-40 overflow-hidden rounded-lg bg-muted border">
              {rodada.produtoAtacado.imagemUrl ? (
                <Image
                  src={rodada.produtoAtacado.imagemUrl}
                  alt={rodada.produtoAtacado.nome}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-muted-foreground">Sem foto</div>
              )}
            </div>
            <div>
              <h2 className="font-bold text-foreground line-clamp-2">{rodada.produtoAtacado.nome}</h2>
              <p className="text-xs text-muted-foreground mt-1">{rodada.produtoAtacado.unidadesPorCaixa} unidades por caixa</p>
            </div>
          </CardContent>
        </Card>

        {/* Linha do Tempo */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold uppercase text-muted-foreground">Histórico de Rastreio</CardTitle>
          </CardHeader>
          <CardContent>
            {rodada.status === "CANCELADA" ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/15 text-destructive text-sm">
                <RotateCcw className="size-5 shrink-0" />
                <span>Esta caixa foi cancelada pelo administrador. Qualquer pagamento feito será estornado.</span>
              </div>
            ) : (
              <div className="relative pl-6 border-l border-muted space-y-8">
                {steps.map((step, idx) => {
                  const isCompleted = idx <= currentStatusIndex;
                  const isCurrent = idx === currentStatusIndex;

                  return (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[31px] top-0.5 rounded-full p-1 border bg-white ${
                        isCompleted ? "text-emerald-600 border-emerald-600" : "text-muted-foreground border-muted"
                      }`}>
                        {isCompleted ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${isCurrent ? "text-emerald-600" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.label}
                        </span>
                        <span className="text-xs text-muted-foreground mt-0.5">{step.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de Compradores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold uppercase text-muted-foreground flex items-center gap-2">
            <Package className="size-4 text-emerald-600" />
            Participantes desta Caixa
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-muted max-h-96 overflow-y-auto">
            {rodada.reservas.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma reserva paga nesta caixa ainda.</p>
            ) : (
              rodada.reservas.map((reserva, idx) => {
                const parts = reserva.compradorNome.split(" ");
                const firstName = parts[0];
                const lastNameInitial = parts[1] ? parts[1][0] + "." : "";
                const maskedName = `${firstName} ${lastNameInitial}`;

                return (
                  <div key={reserva.id} className="flex justify-between items-center px-6 py-3.5 text-sm hover:bg-muted/50 transition">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground w-6">{idx + 1}.</span>
                      <span className="font-medium text-foreground">{maskedName}</span>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {reserva.quantidade} un
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
