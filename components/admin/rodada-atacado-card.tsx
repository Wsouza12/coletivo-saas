"use client";

import { Boxes } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { RodadaAtacadoActions } from "@/components/admin/rodada-atacado-actions";
import { RodadaDetalhesDialog } from "@/components/admin/rodada-detalhes-dialog";

export type RodadaAtacadoCardData = {
  id: string;
  slug: string;
  status: string;
  metaUnidades: number;
  unidadesReservadas: number;
  minimoUnidadesPorReserva: number;
  taxaServicoPercentual: number;
  custoUnitario: number | any;
  precoFinalUnitario: number | any;
  totalReservas: number;
  produtoNome: string;
  produtoImagemUrl: string | null;
  unidadesPorCaixa: number;
  unidadesReservadasLoja: number;
  grupoMensagemEnviada: boolean;
  loopAtivo: boolean;
  loopIntervaloMinutos: number;
  variacao: { id: string; tipo: "COR" | "TAMANHO" | "VOLTAGEM"; nome: string; imagemUrl: string | null } | null;
  codigoRastreio: string | null;
  envioCodigo: string | null;
  envioLink: string | null;
  produtoCategoria: string;
};

// Visual baseado no mockup do usuário: banner com nome do produto, foto, "Xun por
// caixa", "taxa de serviço X% mais frete", preço/un e link de reserva — é
// literalmente o card que vai ser usado de base pra montar a mensagem do
// WhatsApp quando essa integração existir.
export function RodadaAtacadoCard({ rodada }: { rodada: RodadaAtacadoCardData }) {
  const progresso = Math.min(100, Math.round((rodada.unidadesReservadas / rodada.metaUnidades) * 100));

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="bg-warning/90 px-4 py-3 text-center">
        <span className="block text-sm font-bold text-foreground">{rodada.produtoNome}</span>
        {rodada.variacao ? (
          <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wide text-foreground/70">
            {rodada.variacao.tipo === "COR" ? "Cor" : rodada.variacao.tipo === "TAMANHO" ? "Tamanho" : "Voltagem"}: {rodada.variacao.nome}
          </span>
        ) : null}
      </div>

      <div className="relative h-40 w-full bg-muted">
        {rodada.produtoImagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rodada.produtoImagemUrl} alt={rodada.produtoNome} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Boxes className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="rounded-full bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground">
            {rodada.unidadesPorCaixa} und/caixa
          </span>
          <span className="text-muted-foreground">+ {rodada.taxaServicoPercentual}% taxa + frete (no checkout)</span>
        </div>

        <span className="text-base font-extrabold text-primary">{formatBRL(rodada.custoUnitario)}/un</span>

        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progresso}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {rodada.unidadesReservadas}/{rodada.metaUnidades}un ({progresso}%) — {rodada.totalReservas} reserva(s)
          </p>
          <p className="text-xs text-muted-foreground">Mínimo: {rodada.minimoUnidadesPorReserva}un</p>
          {rodada.unidadesReservadasLoja > 0 ? (
            <p className="text-xs font-medium text-primary">+{rodada.unidadesReservadasLoja}un reservadas pra sua loja</p>
          ) : null}
        </div>

        {rodada.status === "ABERTA" ? (
          <a
            href={`/atacado/${rodada.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            link aqui para reserva ↓
          </a>
        ) : rodada.codigoRastreio ? (
          <a
            href={`/r/rastreio/${rodada.codigoRastreio}`}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-xs font-medium text-primary underline-offset-2 hover:underline"
          >
            link do rastreio ↓
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">Caixa {rodada.status.toLowerCase()}</span>
        )}

        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <RodadaDetalhesDialog rodadaId={rodada.id} />
          <RodadaAtacadoActions
            rodadaId={rodada.id}
            status={rodada.status}
            grupoMensagemEnviada={rodada.grupoMensagemEnviada}
            loopAtivo={rodada.loopAtivo}
            loopIntervaloMinutos={rodada.loopIntervaloMinutos}
            metaUnidades={rodada.metaUnidades}
            minimoUnidadesPorReserva={rodada.minimoUnidadesPorReserva}
            taxaServicoPercentual={rodada.taxaServicoPercentual}
            unidadesReservadasLoja={rodada.unidadesReservadasLoja}
            envioCodigo={rodada.envioCodigo}
            envioLink={rodada.envioLink}
            produtoCategoria={rodada.produtoCategoria}
          />
        </div>
      </div>
    </div>
  );
}
