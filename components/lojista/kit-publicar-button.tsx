"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/format";
import { calcularTaxaShopee, freteGratisObrigatorioML, type TipoVendedorShopee } from "@/lib/taxas-marketplace";

export function KitPublicarButton({
  kitId,
  nomeKit,
  custoTotal,
  precoVendaSugerido,
  plataformasConectadas,
  plataformasJaPublicadas = [],
  tipoVendedorShopee,
}: {
  kitId: string;
  nomeKit: string;
  custoTotal: number;
  precoVendaSugerido?: number;
  plataformasConectadas: string[];
  plataformasJaPublicadas?: string[];
  tipoVendedorShopee: TipoVendedorShopee;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const plataformasDisponiveis = plataformasConectadas.filter(
    (p) => !plataformasJaPublicadas.includes(p)
  );
  const [plataforma, setPlataforma] = useState<"MERCADOLIVRE" | "SHOPEE">(
    (plataformasDisponiveis[0] as "MERCADOLIVRE" | "SHOPEE") ?? "MERCADOLIVRE"
  );
  const [titulo, setTitulo] = useState(nomeKit.slice(0, 60));
  const [precoVenda, setPrecoVenda] = useState(precoVendaSugerido ? String(precoVendaSugerido) : "");
  const [loading, setLoading] = useState(false);
  const venda = Number(precoVenda) || 0;
  const taxaShopee = plataforma === "SHOPEE" && venda > 0 ? calcularTaxaShopee(venda, tipoVendedorShopee) : null;

  async function publicar() {
    setLoading(true);
    const res = await fetch("/api/lojista/publicar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kitId,
        plataforma,
        titulo,
        precoVenda: Number(precoVenda),
        freteGratis: false,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }));
      toast.error(error?.message ?? "Erro ao publicar kit");
      return;
    }
    toast.success("Kit publicado");
    setOpen(false);
    router.refresh();
  }

  if (plataformasConectadas.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">Conecte uma plataforma pra publicar</span>
    );
  }

  if (plataformasDisponiveis.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">Já publicado em todas as plataformas conectadas</span>
    );
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Vincular e Publicar nos Marketplaces
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar kit: {nomeKit}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Custo total do kit: {formatBRL(custoTotal)} — o preço de venda precisa ser maior que isso.
          </p>
          <div className="flex flex-col gap-2">
            <Label>Plataforma</Label>
            <Select value={plataforma} onValueChange={(v) => v && setPlataforma(v as "MERCADOLIVRE" | "SHOPEE")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plataformasDisponiveis.includes("MERCADOLIVRE") && (
                  <SelectItem value="MERCADOLIVRE">Mercado Livre</SelectItem>
                )}
                {plataformasDisponiveis.includes("SHOPEE") && <SelectItem value="SHOPEE">Shopee</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Título do anúncio</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={60} />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Preço de venda (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={precoVenda}
              onChange={(e) => setPrecoVenda(e.target.value)}
            />
            {taxaShopee && (
              <p className="text-xs text-muted-foreground">
                Taxa Shopee ({tipoVendedorShopee === "CNPJ" ? "CNPJ" : "CPF individual"}): {taxaShopee.percentual}% +{" "}
                {formatBRL(taxaShopee.fixo)} fixo = {formatBRL(taxaShopee.taxaTotal)} — líquido após taxa:{" "}
                <span className="font-medium text-success">{formatBRL(taxaShopee.liquido - custoTotal)}</span>
              </p>
            )}
            {plataforma === "MERCADOLIVRE" && freteGratisObrigatorioML(venda) && (
              <p className="text-xs text-warning">
                A partir de R$79, o Mercado Livre exige frete grátis pro comprador — o vendedor arca
                com parte da tarifa de frete (varia por peso e reputação da conta).
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button disabled={loading} onClick={publicar}>
            {loading ? "Publicando..." : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
}
