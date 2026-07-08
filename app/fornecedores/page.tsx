import { prisma } from "@/lib/prisma";
import { ListaLandingVSL } from "@/components/lista/landing-vsl";

export const dynamic = "force-dynamic";

export default async function FornecedoresLandingPage() {
  const [config, totalFornecedores, totalCatalogos] = await Promise.all([
    prisma.configuracaoFinanceira.findFirst({
      select: { precoListaFornecedores: true, precoCatalogosSemContato: true, precoUpsellComunidade: true },
    }),
    prisma.fornecedorAtacado.count(),
    prisma.catalogoFornecedor.count(),
  ]);

  return (
    <ListaLandingVSL
      precoCompleta={Number(config?.precoListaFornecedores ?? 97)}
      precoCatalogos={Number(config?.precoCatalogosSemContato ?? 47)}
      precoUpsell={Number(config?.precoUpsellComunidade ?? 7)}
      totalFornecedores={totalFornecedores}
      totalCatalogos={totalCatalogos}
    />
  );
}
