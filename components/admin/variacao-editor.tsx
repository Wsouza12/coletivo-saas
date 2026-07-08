"use client";

import { useEffect, useState } from "react";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Variacao = {
  tamanho: string;
  sizeValueId?: string;
  cor?: string;
  corValueId?: string;
  estoque: number;
  precoAjuste?: number;
  medidas?: Record<string, string>;
  ordem: number;
  ativo: boolean;
};

type AtributoMedida = { id: string; nome: string };

const TAMANHOS_PADRAO = ["P", "M", "G", "GG"];

// Editor de variações reais por tamanho — estoque/preço por tamanho, e bloco de medidas
// físicas (cm) sempre preenchido manualmente pelo admin, nunca por IA (medida real do
// produto, não algo que se possa adivinhar). Os campos de medida são descobertos
// dinamicamente via /api/admin/ml/size-chart-attrs, então funcionam pra qualquer
// domínio de vestuário do ML sem precisar fixar nomes de atributo no código.
export function VariacaoEditor({
  categoryId,
  variacoes,
  onChange,
}: {
  categoryId: string;
  variacoes: Variacao[];
  onChange: (variacoes: Variacao[]) => void;
}) {
  const [atributosMedida, setAtributosMedida] = useState<AtributoMedida[]>([]);
  const [exigeSizeChart, setExigeSizeChart] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setAtributosMedida([]);
      setExigeSizeChart(false);
      return;
    }
    setCarregando(true);
    fetch(`/api/admin/ml/size-chart-attrs?categoryId=${encodeURIComponent(categoryId)}`)
      .then((res) => res.json())
      .then(({ data }) => {
        setExigeSizeChart(!!data?.exigeSizeChart);
        setAtributosMedida(
          (data?.atributos ?? []).map((a: { id: string; nome: string }) => ({ id: a.id, nome: a.nome }))
        );
      })
      .catch(() => {
        setExigeSizeChart(false);
        setAtributosMedida([]);
      })
      .finally(() => setCarregando(false));
  }, [categoryId]);

  function addVariacao(tamanho = "") {
    onChange([
      ...variacoes,
      { tamanho, estoque: 0, ordem: variacoes.length, ativo: true, medidas: {} },
    ]);
  }

  function addTamanhosPadrao(cor = "") {
    const existentes = new Set(variacoes.map((v) => `${v.tamanho}::${v.cor ?? ""}`));
    const novos = TAMANHOS_PADRAO.filter((t) => !existentes.has(`${t}::${cor}`)).map((tamanho, i) => ({
      tamanho,
      cor,
      estoque: 0,
      ordem: variacoes.length + i,
      ativo: true,
      medidas: {},
    }));
    onChange([...variacoes, ...novos]);
  }

  function updateVariacao(index: number, patch: Partial<Variacao>) {
    onChange(variacoes.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function updateMedida(index: number, atributoId: string, valor: string) {
    const atual = variacoes[index];
    updateVariacao(index, { medidas: { ...atual.medidas, [atributoId]: valor } });
  }

  function removeVariacao(index: number) {
    onChange(variacoes.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {exigeSizeChart && (
        <p className="rounded-md bg-primary/5 p-2 text-xs text-muted-foreground">
          Esta categoria do Mercado Livre exige tabela de medidas (size chart) pra publicar com
          variações de tamanho — preencha as medidas reais de cada tamanho abaixo. Sem isso, a
          publicação no ML será bloqueada antes de tentar (com mensagem clara) em vez de falhar
          com erro técnico.
        </p>
      )}

      {variacoes.map((v, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Cor</Label>
              <Input
                className="w-28"
                value={v.cor ?? ""}
                onChange={(e) => updateVariacao(index, { cor: e.target.value })}
                placeholder="opcional"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Tamanho</Label>
              <Input
                className="w-24"
                value={v.tamanho}
                onChange={(e) => updateVariacao(index, { tamanho: e.target.value })}
                placeholder="P, 38..."
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Estoque</Label>
              <Input
                type="number"
                min="0"
                className="w-24"
                value={v.estoque}
                onChange={(e) => updateVariacao(index, { estoque: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Ajuste de preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                className="w-32"
                value={v.precoAjuste ?? ""}
                onChange={(e) =>
                  updateVariacao(index, {
                    precoAjuste: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="opcional"
              />
            </div>
            {atributosMedida.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setExpandido(expandido === index ? null : index)}
              >
                Medidas
                {expandido === index ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => removeVariacao(index)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          {expandido === index && atributosMedida.length > 0 && (
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-2 sm:grid-cols-4">
              {atributosMedida.map((attr) => (
                <div key={attr.id} className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">{attr.nome}</Label>
                  <Input
                    value={v.medidas?.[attr.id] ?? ""}
                    onChange={(e) => updateMedida(index, attr.id, e.target.value)}
                    placeholder="cm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="w-fit" onClick={() => addVariacao()}>
          + Adicionar tamanho
        </Button>
        <Button type="button" variant="outline" className="w-fit" onClick={() => addTamanhosPadrao()}>
          + Adicionar P, M, G, GG
        </Button>
      </div>
      {carregando && <span className="text-xs text-muted-foreground">Verificando categoria no ML...</span>}
    </div>
  );
}
