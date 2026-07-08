import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { ProdutoAtacadoList } from "@/components/admin/produto-atacado-list";
import { CriarProdutoAtacadoDialog } from "@/components/admin/criar-produto-atacado-dialog";
import { getConfiguracaoFinanceira } from "@/lib/configuracao-financeira";

export default async function AdminAtacadoProdutosPage() {
  const [produtos, fornecedores, config] = await Promise.all([
    prisma.produtoAtacado.findMany({
      include: {
        fornecedor: { select: { id: true, nome: true } },
        itensCatalogo: { select: { pagina: true, catalogo: { select: { nome: true } } }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fornecedorAtacado.findMany({ select: { id: true, nome: true }, orderBy: { nome: "asc" } }),
    getConfiguracaoFinanceira(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/atacado">
            <Button variant="ghost" size="sm" className="mb-2 -ml-2">
              <ArrowLeft className="size-4" />
              Voltar pra rodadas
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Catálogo do Atacado Coletivo</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro separado do catálogo normal — produto vendido em caixa fechada.
          </p>
        </div>
        <CriarProdutoAtacadoDialog fornecedores={fornecedores} />
      </div>

      <ProdutoAtacadoList
        produtos={produtos.map((p) => ({
          ...p,
          custoUnitario: Number(p.custoUnitario),
          precoCatalogo: p.precoCatalogo ? Number(p.precoCatalogo) : null,
          precoVendaSugerido: p.precoVendaSugerido ? Number(p.precoVendaSugerido) : null,
          pesoKg: Number(p.pesoKg),
          comprimentoCm: p.comprimentoCm,
          larguraCm: p.larguraCm,
          alturaCm: p.alturaCm,
          catalogoOrigem: p.itensCatalogo[0]
            ? { nome: p.itensCatalogo[0].catalogo.nome, pagina: p.itensCatalogo[0].pagina }
            : null,
        }))}
        fornecedores={fornecedores}
        taxaServicoPadrao={Number(config.taxaServicoPadraoAtacado)}
      />
    </div>
  );
}
