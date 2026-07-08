import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CriarRodadaAtacadoDialog } from "@/components/admin/criar-rodada-atacado-dialog";
import { RodadaAtacadoCard } from "@/components/admin/rodada-atacado-card";
import { getConfiguracaoFinanceira } from "@/lib/configuracao-financeira";
import { RodadasFiltros } from "@/components/admin/rodadas-filtros";
import { SolicitacoesList } from "@/components/admin/solicitacoes-list";
import { DisparadorCaixasButton } from "@/components/admin/disparador-caixas-button";

export default async function AdminAtacadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim();
  const tab = sp.tab ?? "abertas";
  const filterStatus = sp.status;

  const where: any = {};

  if (q) {
    where.OR = [
      { produtoAtacado: { nome: { contains: q, mode: "insensitive" } } },
      { slug: { contains: q, mode: "insensitive" } },
      { codigoRastreio: { contains: q, mode: "insensitive" } },
    ];
  }

  if (tab === "abertas") {
    where.status = "ABERTA";
  } else if (tab === "fechadas") {
    if (filterStatus && filterStatus !== "all") {
      where.status = filterStatus;
    } else {
      where.status = { not: "ABERTA" };
    }
  } else {
    // Todas
    if (filterStatus && filterStatus !== "all") {
      where.status = filterStatus;
    }
  }

  const [rodadas, produtos, config, solicitacoes, countNaoAnunciadas] = await Promise.all([
    prisma.rodadaAtacado.findMany({
      where,
      include: {
        produtoAtacado: { select: { nome: true, imagemUrl: true, unidadesPorCaixa: true, categoria: true } },
        variacao: { select: { id: true, tipo: true, nome: true, imagemUrl: true } },
        _count: { select: { reservas: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.produtoAtacado.findMany({
      where: { ativo: true },
      select: {
        id: true,
        nome: true,
        codigo: true,
        custoUnitario: true,
        unidadesPorCaixa: true,
        imagemUrl: true,
        reservaLojaPadrao: true,
        coresVariadas: true,
        cores: { select: { id: true, tipo: true, nome: true, imagemUrl: true }, orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] },
      },
      orderBy: { nome: "asc" },
    }),
    getConfiguracaoFinanceira(),
    tab === "solicitacoes" ? prisma.solicitacaoAberturaCaixa.findMany({
      include: {
        produtoAtacado: {
          select: { id: true, nome: true, imagemUrl: true, codigo: true, unidadesPorCaixa: true, custoUnitario: true, isRascunho: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),
    prisma.rodadaAtacado.count({ where: { status: "ABERTA", grupoMensagemEnviada: false } }),
  ]);

  const coresMap = produtos.reduce((acc, p) => {
    acc[p.id] = p.cores;
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Atacado Coletivo</h1>
          <p className="text-sm text-muted-foreground">
            Rodadas de compra coletiva — acesso só pra quem tem assinatura mensal ativa (
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
              Number(config.valorAssinaturaAtacado)
            )}
            /mês).
          </p>
        </div>
        <div className="flex gap-2">
          <DisparadorCaixasButton naoAnunciadas={countNaoAnunciadas} />
          <CriarRodadaAtacadoDialog
            produtos={produtos.map((p) => ({ ...p, custoUnitario: Number(p.custoUnitario) }))}
            taxaServicoPadrao={Number(config.taxaServicoPadraoAtacado)}
          />
        </div>
      </div>

      {produtos.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Nenhum produto cadastrado no catálogo do atacado ainda. Cadastre um produto antes de
            criar uma rodada.
          </CardContent>
        </Card>
      ) : null}

      <RodadasFiltros />

      {tab === "solicitacoes" ? (
        <SolicitacoesList initialData={solicitacoes as any} coresProduto={coresMap} />
      ) : rodadas.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma caixa encontrada com os filtros atuais.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {rodadas.map((rodada) => (
            <RodadaAtacadoCard key={rodada.id} rodada={mapRodada(rodada)} />
          ))}
        </div>
      )}
    </div>
  );
}
function mapRodada(rodada: {
  id: string;
  slug: string;
  status: string;
  metaUnidades: number;
  unidadesReservadas: number;
  minimoUnidadesPorReserva: number;
  taxaServicoPercentual: unknown;
  precoFinalUnitario: unknown;
  custoUnitario: unknown;
  _count: { reservas: number };
  unidadesReservadasLoja: number;
  produtoAtacado: { nome: string; imagemUrl: string | null; unidadesPorCaixa: number; categoria: string };
  variacao: { id: string; tipo: "COR" | "TAMANHO" | "VOLTAGEM"; nome: string; imagemUrl: string | null } | null;
  grupoMensagemEnviada: boolean;
  loopAtivo: boolean;
  loopIntervaloMinutos: number;
  codigoRastreio: string | null;
  envioCodigo?: string | null;
  envioLink?: string | null;
}) {
  return {
    id: rodada.id,
    slug: rodada.slug,
    status: rodada.status,
    metaUnidades: rodada.metaUnidades,
    unidadesReservadas: rodada.unidadesReservadas,
    minimoUnidadesPorReserva: rodada.minimoUnidadesPorReserva,
    taxaServicoPercentual: Number(rodada.taxaServicoPercentual),
    precoFinalUnitario: Number(rodada.precoFinalUnitario),
    custoUnitario: Number(rodada.custoUnitario),
    totalReservas: rodada._count.reservas,
    produtoNome: rodada.produtoAtacado.nome,
    // Quando a rodada tem variação de cor com foto própria, usa essa foto no card.
    produtoImagemUrl: rodada.variacao?.imagemUrl ?? rodada.produtoAtacado.imagemUrl,
    unidadesPorCaixa: rodada.produtoAtacado.unidadesPorCaixa,
    unidadesReservadasLoja: rodada.unidadesReservadasLoja,
    grupoMensagemEnviada: rodada.grupoMensagemEnviada,
    variacao: rodada.variacao,
    loopAtivo: rodada.loopAtivo,
    loopIntervaloMinutos: rodada.loopIntervaloMinutos,
    codigoRastreio: rodada.codigoRastreio,
    envioCodigo: rodada.envioCodigo ?? null,
    envioLink: rodada.envioLink ?? null,
    produtoCategoria: rodada.produtoAtacado.categoria,
  };
}
