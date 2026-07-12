"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, X, Clock, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Solicitacao = {
  id: string;
  compradorNome: string | null;
  compradorNumero: string;
  codigoDigitado: string;
  status: "PENDENTE" | "APROVADA" | "REJEITADA";
  createdAt: Date | string;
  produtoAtacado: {
    id: string;
    nome: string;
    imagemUrl: string | null;
    codigo: string | null;
    unidadesPorCaixa: number;
    custoUnitario: any;
    isRascunho?: boolean;
  };
};

export function SolicitacoesList({ initialData, coresProduto }: { initialData: Solicitacao[], coresProduto: Record<string, any[]> }) {
  const router = useRouter();
  const [solicitacoes, setSolicitacoes] = useState(initialData);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [variacaoSelecionada, setVariacaoSelecionada] = useState<Record<string, string>>({});

  async function handleAprovar(solicitacao: Solicitacao) {
    const cores = coresProduto[solicitacao.produtoAtacado.id] || [];
    const variacaoId = variacaoSelecionada[solicitacao.id];

    if (cores.length > 0 && !variacaoId) {
      toast.error("Selecione a variação (cor/tamanho) antes de aprovar.");
      return;
    }

    if (!confirm(`Aprovar a abertura de caixa para ${solicitacao.produtoAtacado.nome}? O comprador será notificado e a caixa será aberta no WhatsApp.`)) return;

    setLoadingId(solicitacao.id);
    try {
      const res = await fetch(`/api/admin/atacado/solicitacoes/${solicitacao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APROVADA", variacaoId }),
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Erro ao aprovar");
      
      toast.success("Caixa aberta com sucesso!");
      setSolicitacoes(prev => prev.map(s => s.id === solicitacao.id ? { ...s, status: "APROVADA" } : s));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRejeitar(solicitacao: Solicitacao) {
    if (!confirm("Tem certeza que deseja rejeitar esta solicitação?")) return;
    setLoadingId(solicitacao.id);
    try {
      const res = await fetch(`/api/admin/atacado/solicitacoes/${solicitacao.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJEITADA" }),
      });
      if (!res.ok) throw new Error("Erro ao rejeitar");
      toast.success("Solicitação rejeitada.");
      setSolicitacoes(prev => prev.map(s => s.id === solicitacao.id ? { ...s, status: "REJEITADA" } : s));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingId(null);
    }
  }

  if (solicitacoes.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma solicitação encontrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
      {solicitacoes.map((s) => {
        const p = s.produtoAtacado;
        const cores = coresProduto[p.id] || [];
        
        return (
          <Card key={s.id} className={`flex flex-col overflow-hidden ${s.status !== "PENDENTE" ? "opacity-75" : ""}`}>
            <div className="flex gap-4 p-4 border-b">
              <div className="size-20 bg-muted rounded-md flex items-center justify-center overflow-hidden shrink-0">
                {p.imagemUrl ? (
                  <img src={p.imagemUrl} alt={p.nome} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="size-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="font-semibold text-sm truncate" title={p.nome}>{p.nome}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Código: <strong className="text-foreground">{p.codigo || s.codigoDigitado}</strong>
                </p>
                <div className="mt-2">
                  {s.status === "PENDENTE" && <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100"><Clock className="size-3 mr-1" /> Pendente</Badge>}
                  {s.status === "APROVADA" && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200"><Check className="size-3 mr-1" /> Aprovada</Badge>}
                  {s.status === "REJEITADA" && <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200"><X className="size-3 mr-1" /> Rejeitada</Badge>}
                </div>
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Solicitado por</p>
                <p className="font-medium">{s.compradorNome || s.compradorNumero.split("@")[0]}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  em {format(new Date(s.createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              {s.status === "PENDENTE" && cores.length > 0 && (
                <div className="mt-auto space-y-1">
                  <Label className="text-xs">Este produto tem variações. Escolha uma para abrir a caixa:</Label>
                  <Select
                    value={variacaoSelecionada[s.id]}
                    onValueChange={(val) => setVariacaoSelecionada(prev => ({ ...prev, [s.id]: val as string }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cores.map((cor: any) => (
                        <SelectItem key={cor.id} value={cor.id}>{cor.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {s.status === "PENDENTE" && (
              <div className="p-3 bg-muted/50 border-t flex gap-2">
                <Button 
                  className="flex-1" 
                  variant="outline" 
                  size="sm"
                  disabled={loadingId === s.id}
                  onClick={() => handleRejeitar(s)}
                >
                  <X className="size-4 mr-2" /> Rejeitar
                </Button>
                <Button 
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700" 
                  size="sm"
                  disabled={loadingId === s.id}
                  onClick={() => {
                    if (p.isRascunho) {
                      toast.info("Conclua o cadastro desse produto na Loja (vitrine) antes de abrir a caixa.");
                      router.push("/admin/atacado/produtos?q=" + encodeURIComponent(p.codigo || p.nome));
                    } else {
                      handleAprovar(s);
                    }
                  }}
                >
                  <Check className="size-4 mr-2" /> {p.isRascunho ? "Concluir Cadastro" : "Aprovar"}
                </Button>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
