import { notFound } from "next/navigation";
import { APP_NAME } from "@/lib/brand";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { AtacadoCheckout } from "@/components/atacado/atacado-checkout";
import { getConfiguracaoFinanceira } from "@/lib/configuracao-financeira";

export default async function RodadaAtacadoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [rodada, config] = await Promise.all([
    prisma.rodadaAtacado.findUnique({
      where: { slug },
      include: {
        produtoAtacado: {
          select: {
            nome: true,
            descricao: true,
            imagemUrl: true,
            coresVariadas: true,
            cores: { where: { tipo: { in: ["TAMANHO", "COR"] } }, orderBy: { ordem: "asc" } },
          },
        },
      },
    }),
    getConfiguracaoFinanceira(),
  ]);

  if (!rodada) notFound();

  const progresso = Math.min(100, Math.round((rodada.unidadesReservadas / rodada.metaUnidades) * 100));
  const imagem = rodada.produtoAtacado.imagemUrl;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-4">
          <span className="text-lg font-bold text-primary">{APP_NAME}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {imagem ? (
            <div className="aspect-square w-full bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagem}
                alt={rodada.produtoAtacado.nome}
                className="h-full w-full object-contain"
              />
            </div>
          ) : null}
          <div className="p-6">
            <h1 className="text-xl font-bold text-foreground">{rodada.produtoAtacado.nome}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{rodada.produtoAtacado.descricao}</p>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-primary">
                {formatBRL(Number(rodada.custoUnitario))}
              </span>
              <span className="text-xs text-muted-foreground">por unidade (+ taxa e frete no checkout)</span>
            </div>

            <div className="mt-4">
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${progresso}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {rodada.unidadesReservadas} de {rodada.metaUnidades} unidades reservadas ({progresso}%)
              </p>
            </div>

            {rodada.status !== "ABERTA" ? (
              <p className="mt-6 rounded-lg bg-muted p-3 text-sm font-medium text-foreground">
                {rodada.status === "FECHADA" && "Essa rodada já bateu a meta e está fechada para novas reservas."}
                {rodada.status === "CANCELADA" && "Essa rodada foi cancelada."}
                {rodada.status === "ENVIADA" && "Essa rodada já foi enviada para os participantes."}
              </p>
            ) : (
              <AtacadoCheckout
                rodadaId={rodada.id}
                custoUnitario={Number(rodada.custoUnitario)}
                taxaServicoPercentual={Number(rodada.taxaServicoPercentual)}
                minimoUnidadesPorReserva={Math.min(
                  rodada.minimoUnidadesPorReserva,
                  rodada.metaUnidades - rodada.unidadesReservadas
                )}
                unidadesRestantes={rodada.metaUnidades - rodada.unidadesReservadas}
                valorAssinaturaAtacado={Number(config.valorAssinaturaAtacado)}
                exigirAssinaturaAtacado={config.exigirAssinaturaAtacado}
                variacoes={rodada.produtoAtacado.cores}
                coresVariadas={rodada.produtoAtacado.coresVariadas}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
