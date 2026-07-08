"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ConfiguracoesFinanceiroForm({
  initialMargemPadrao,
  initialMargemOperacional,
  initialCepOrigem,
  initialValorAssinaturaAtacado,
  initialTaxaServicoPadraoAtacado,
  initialExigirAssinaturaAtacado,
  initialLoopDescansoInicio,
  initialLoopDescansoFim,
  initialPrecoListaFornecedores,
  initialPrecoCatalogosSemContato,
  initialPrecoUpsellComunidade,
  initialMargemSegurancaFrete,
}: {
  initialMargemPadrao: number;
  initialMargemOperacional: number;
  initialCepOrigem?: string | null;
  initialValorAssinaturaAtacado: number;
  initialTaxaServicoPadraoAtacado: number;
  initialExigirAssinaturaAtacado: boolean;
  initialLoopDescansoInicio: number;
  initialLoopDescansoFim: number;
  initialPrecoListaFornecedores: number;
  initialPrecoCatalogosSemContato: number;
  initialPrecoUpsellComunidade: number;
  initialMargemSegurancaFrete: number;
}) {
  const [margemPadrao, setMargemPadrao] = useState(String(initialMargemPadrao));
  const [margemOperacional, setMargemOperacional] = useState(String(initialMargemOperacional));
  const [cepOrigem, setCepOrigem] = useState(initialCepOrigem ?? "");
  const [valorAssinaturaAtacado, setValorAssinaturaAtacado] = useState(String(initialValorAssinaturaAtacado));
  const [taxaServicoPadraoAtacado, setTaxaServicoPadraoAtacado] = useState(String(initialTaxaServicoPadraoAtacado));
  const [exigirAssinaturaAtacado, setExigirAssinaturaAtacado] = useState(initialExigirAssinaturaAtacado);
  const [loopDescansoInicio, setLoopDescansoInicio] = useState(initialLoopDescansoInicio);
  const [loopDescansoFim, setLoopDescansoFim] = useState(initialLoopDescansoFim);
  const [precoListaFornecedores, setPrecoListaFornecedores] = useState(String(initialPrecoListaFornecedores));
  const [precoCatalogosSemContato, setPrecoCatalogosSemContato] = useState(String(initialPrecoCatalogosSemContato));
  const [precoUpsellComunidade, setPrecoUpsellComunidade] = useState(String(initialPrecoUpsellComunidade));
  const [margemSegurancaFrete, setMargemSegurancaFrete] = useState(String(initialMargemSegurancaFrete));
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/admin/configuracoes/financeiro", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        margemPadrao: Number(margemPadrao),
        margemOperacional: Number(margemOperacional),
        valorAssinaturaAtacado: Number(valorAssinaturaAtacado),
        taxaServicoPadraoAtacado: Number(taxaServicoPadraoAtacado),
        exigirAssinaturaAtacado,
        loopDescansoInicio,
        loopDescansoFim,
        precoListaFornecedores: Number(precoListaFornecedores),
        precoCatalogosSemContato: Number(precoCatalogosSemContato),
        precoUpsellComunidade: Number(precoUpsellComunidade),
        margemSegurancaFrete: Number(margemSegurancaFrete),
        ...(cepOrigem ? { cepOrigem } : {}),
      }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Erro ao salvar margens");
      return;
    }
    toast.success("Margens atualizadas");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Usadas para sugerir automaticamente o preço de atacado a partir do custo real no cadastro
        de produto: preço = custo × (1 + margem padrão%) × (1 + margem operacional%).
      </p>
      <div className="flex flex-col gap-2">
        <Label>Margem padrão (%)</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={margemPadrao}
          onChange={(e) => setMargemPadrao(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Margem operacional (%)</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={margemOperacional}
          onChange={(e) => setMargemOperacional(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>CEP de origem (remetente)</Label>
        <Input
          value={cepOrigem}
          onChange={(e) => setCepOrigem(e.target.value)}
          placeholder="00000-000"
          maxLength={9}
        />
        <span className="text-xs text-muted-foreground">
          Usado pro cálculo real de frete (Melhor Envio) nas reservas de compra coletiva — Fase 6.
        </span>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <span className="text-sm font-medium text-foreground">Frete - Melhor Envio</span>
        <Label>Margem de segurança (%)</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          value={margemSegurancaFrete}
          onChange={(e) => setMargemSegurancaFrete(e.target.value)}
          required
        />
        <span className="text-xs text-muted-foreground">
          Percentual adicionado ao valor da cotação real do Melhor Envio para cobrir eventuais diferenças na postagem (lucro sobre frete).
        </span>
      </div>


      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <span className="text-sm font-medium text-foreground">Atacado Coletivo</span>
        <Label>Valor da assinatura mensal (R$)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={valorAssinaturaAtacado}
          onChange={(e) => setValorAssinaturaAtacado(e.target.value)}
          required
        />
        <span className="text-xs text-muted-foreground">
          Cobrado do comprador final pra liberar reserva nas rodadas de compra coletiva.
        </span>

        <Label>Taxa de serviço padrão (%)</Label>
        <Input
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={taxaServicoPadraoAtacado}
          onChange={(e) => setTaxaServicoPadraoAtacado(e.target.value)}
          required
        />
        <span className="text-xs text-muted-foreground">
          Valor pré-preenchido ao criar uma nova rodada — cada rodada ainda pode ajustar a taxa
          individualmente na criação.
        </span>

        <div className="flex items-center space-x-2 pt-2">
          <Switch
            id="exigir-assinatura"
            checked={exigirAssinaturaAtacado}
            onCheckedChange={setExigirAssinaturaAtacado}
          />
          <Label htmlFor="exigir-assinatura" className="font-normal">
            Exigir que compradores tenham uma Assinatura ativa (Atacado) para reservar cotas
          </Label>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Label className="font-medium">Horário de descanso do loop</Label>
          <p className="text-xs text-muted-foreground">
            Nenhuma mensagem automática é enviada nesse intervalo. Ex: 23h – 6h = silêncio da noite.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs">Das</Label>
              <select
                value={loopDescansoInicio}
                onChange={(e) => setLoopDescansoInicio(Number(e.target.value))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00h</option>
                ))}
              </select>
            </div>
            <span className="mt-5 text-muted-foreground">–</span>
            <div className="flex flex-col gap-1 flex-1">
              <Label className="text-xs">Até</Label>
              <select
                value={loopDescansoFim}
                onChange={(e) => setLoopDescansoFim(Number(e.target.value))}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00h</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Configurado: silêncio das <strong>{String(loopDescansoInicio).padStart(2, "0")}h</strong> até as <strong>{String(loopDescansoFim).padStart(2, "0")}h</strong> (horário de Brasília).
          </p>
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-fit">
        {loading ? "Salvando..." : "Salvar margens"}
      </Button>
    </form>
  );
}
