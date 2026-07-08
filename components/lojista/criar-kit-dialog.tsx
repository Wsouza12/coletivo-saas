"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProdutoPicker, type ProdutoParaPicker } from "@/components/lojista/produto-picker";

type ItemKit = { produtoId: string; quantidade: number };

export function CriarKitDialog({
  produtosCatalogo,
  produtoIdPreSelecionado,
}: {
  produtosCatalogo: ProdutoParaPicker[];
  produtoIdPreSelecionado?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [itens, setItens] = useState<ItemKit[]>([
    { produtoId: "", quantidade: 1 },
    { produtoId: "", quantidade: 1 },
  ]);
  const [loading, setLoading] = useState(false);
  const [gerandoIa, setGerandoIa] = useState(false);

  useEffect(() => {
    if (produtoIdPreSelecionado) {
      setItens([
        { produtoId: produtoIdPreSelecionado, quantidade: 1 },
        { produtoId: "", quantidade: 1 },
      ]);
      setOpen(true);
    }
  }, [produtoIdPreSelecionado]);

  function resetar() {
    setNome("");
    setDescricao("");
    setPrecoVenda("");
    setItens([{ produtoId: "", quantidade: 1 }, { produtoId: "", quantidade: 1 }]);
  }

  function addItem() {
    setItens([...itens, { produtoId: "", quantidade: 1 }]);
  }

  function updateItem(index: number, patch: Partial<ItemKit>) {
    setItens(itens.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }

  function removeItem(index: number) {
    setItens(itens.filter((_, i) => i !== index));
  }

  const itensValidos = itens.filter((i) => i.produtoId);
  const custoTotal = itensValidos.reduce((soma, item) => {
    const produto = produtosCatalogo.find((p) => p.id === item.produtoId);
    return soma + (produto ? Number(produto.precoAtacado) * item.quantidade : 0);
  }, 0);
  const venda = Number(precoVenda);
  const margem = venda > custoTotal ? venda - custoTotal : null;

  async function gerarComIa() {
    if (itensValidos.length < 2) {
      toast.error("Selecione pelo menos 2 produtos antes de gerar com IA");
      return;
    }
    setGerandoIa(true);
    const res = await fetch("/api/lojista/kits/gerar-ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        produtos: itensValidos.map((item) => ({
          nome: produtosCatalogo.find((p) => p.id === item.produtoId)?.nome ?? "",
          quantidade: item.quantidade,
        })),
      }),
    });
    setGerandoIa(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }));
      toast.error(error?.message ?? "Erro ao gerar com IA");
      return;
    }
    const { data } = await res.json();
    setNome(data.nome);
    setDescricao(data.descricao);
    toast.success("Título e descrição gerados — revise antes de salvar");
  }

  async function salvar() {
    if (!nome.trim()) {
      toast.error("Dê um nome ao kit");
      return;
    }
    if (itensValidos.length < 2) {
      toast.error("Um kit precisa de pelo menos 2 produtos diferentes");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/lojista/kits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        descricao: descricao.trim() || undefined,
        precoVenda: venda > 0 ? venda : undefined,
        itens: itensValidos,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }));
      toast.error(error?.message ?? "Erro ao criar kit");
      return;
    }
    toast.success("Kit criado");
    resetar();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetar();
      }}
    >
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Criar Novo Kit
      </Button>

      <DialogContent className="max-h-[85vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar novo kit</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Título do kit</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex: Kit Verão Completo" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Descrição do kit</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que compõe o kit (opcional)"
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Produtos do kit (mínimo 2)</Label>
            {itens.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  <ProdutoPicker
                    produtos={produtosCatalogo}
                    value={item.produtoId}
                    onChange={(produtoId) => updateItem(index, { produtoId })}
                    excluirIds={itens.map((i) => i.produtoId).filter(Boolean)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Qtd</Label>
                  <Input
                    type="number"
                    min="1"
                    className="w-20"
                    value={item.quantidade}
                    onChange={(e) => updateItem(index, { quantidade: Number(e.target.value) || 1 })}
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-fit" onClick={addItem}>
              + Adicionar produto
            </Button>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="w-fit gap-2"
            disabled={itensValidos.length < 2 || gerandoIa}
            onClick={gerarComIa}
          >
            <Sparkles className="size-4" />
            {gerandoIa ? "Gerando..." : "Gerar título e descrição com IA"}
          </Button>

          {itensValidos.length > 0 && (
            <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/40 p-3 text-sm">
              {itensValidos.map((item) => {
                const produto = produtosCatalogo.find((p) => p.id === item.produtoId);
                if (!produto) return null;
                return (
                  <div key={item.produtoId} className="flex justify-between text-muted-foreground">
                    <span>
                      {item.quantidade}x {produto.nome}
                    </span>
                    <span>{formatBRL(Number(produto.precoAtacado) * item.quantidade)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between border-t border-border pt-1 font-medium text-foreground">
                <span>Custo total</span>
                <span>{formatBRL(custoTotal)}</span>
              </div>
              {margem !== null && (
                <div className="flex justify-between text-success">
                  <span>Margem estimada</span>
                  <span>{formatBRL(margem)}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:max-w-xs">
            <Label>Preço de venda do kit</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
            />
          </div>

          <Button type="button" disabled={loading} onClick={salvar} className="w-fit">
            {loading ? "Criando..." : "Criar kit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
