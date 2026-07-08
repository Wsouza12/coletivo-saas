import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProdutoForm } from "@/components/admin/produto-form";

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const produto = await prisma.produto.findUnique({
    where: { id },
    include: {
      imagens: { orderBy: { ordem: "asc" } },
      variacoes: { orderBy: { ordem: "asc" } },
    },
  });

  if (!produto) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-foreground">Editar Produto</h1>
      <ProdutoForm
        produto={{
          id: produto.id,
          sku: produto.sku,
          nome: produto.nome,
          descricao: produto.descricao,
          categoria: produto.categoria,
          subcategoria: produto.subcategoria,
          precoAtacado: produto.precoAtacado.toString(),
          custoReal: produto.custoReal?.toString() ?? null,
          ncm: produto.ncm,
          pesoKg: produto.pesoKg.toString(),
          dimensoes: produto.dimensoes as
            | { comprimento: number; largura: number; altura: number }
            | null,
          estoque: produto.estoque,
          estoqueMinimo: produto.estoqueMinimo,
          tags: produto.tags,
          atributos: produto.atributos as Record<string, string> | null,
          marca: produto.marca,
          modelo: produto.modelo,
          gtin: produto.gtin,
          mpn: produto.mpn,
          condicao: produto.condicao,
          tipoAnuncio: produto.tipoAnuncio,
          garantiaTipo: produto.garantiaTipo,
          garantiaPrazo: produto.garantiaPrazo,
          garantiaCondicoes: produto.garantiaCondicoes,
          categoriaMlId: produto.categoriaMlId,
          atributosMl: produto.atributosMl as Record<string, { value_id?: string; value_name?: string }> | null,
          descricaoHtml: produto.descricaoHtml,
          ativo: produto.ativo,
          destaque: produto.destaque,
          imagens: produto.imagens,
          temVariacoes: produto.temVariacoes,
          variacoes: produto.variacoes.map((v) => ({
            tamanho: v.tamanho,
            sizeValueId: v.sizeValueId,
            cor: v.cor,
            corValueId: v.corValueId,
            estoque: v.estoque,
            precoAjuste: v.precoAjuste?.toString() ?? null,
            medidas: v.medidas as Record<string, string> | null,
            ordem: v.ordem,
            ativo: v.ativo,
          })),
        }}
      />
    </div>
  );
}
