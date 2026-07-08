import { prisma } from "@/lib/prisma";
import { obterTaxaListagemML } from "@/lib/mercadolivre";
import { calcularPrecoVendaShopeeComTaxa, calcularTaxaShopee, freteGratisObrigatorioML } from "@/lib/taxas-marketplace";

const SINGLETON_ID = "default";

export async function getConfiguracaoFinanceira() {
  return prisma.configuracaoFinanceira.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
}

export async function updateConfiguracaoFinanceira(data: {
  margemPadrao?: number;
  margemOperacional?: number;
  taxaEstimadaShopee?: number;
  tipoVendedorShopee?: "CNPJ" | "CPF_INDIVIDUAL";
  cepOrigem?: string;
  valorAssinaturaAtacado?: number;
  taxaServicoPadraoAtacado?: number;
  exigirAssinaturaAtacado?: boolean;
  loopDescansoInicio?: number;
  loopDescansoFim?: number;
  precoListaFornecedores?: number;
  precoCatalogosSemContato?: number;
  precoUpsellComunidade?: number;
  margemSegurancaFrete?: number;
}) {
  await getConfiguracaoFinanceira();
  return prisma.configuracaoFinanceira.update({
    where: { id: SINGLETON_ID },
    data,
  });
}

// precoAtacado sugerido = custoReal × (1 + margemPadrao%) × (1 + margemOperacional%)
export function calcularPrecoAtacado(
  custoReal: number,
  margemPadrao: number,
  margemOperacional: number
): number {
  const preco = custoReal * (1 + margemPadrao / 100) * (1 + margemOperacional / 100);
  return Math.round(preco * 100) / 100;
}

// Sugere preço de venda que garante a margem desejada DEPOIS da taxa da
// plataforma — no ML usa a taxa real (API oficial /listing_prices), na
// Shopee usa o percentual estimado configurável (sem API pública de taxa).
// Itera porque a taxa do ML muda com o próprio preço (tabela por faixa).
export async function calcularPrecoVendaComTaxa(params: {
  custoReal: number;
  margemDesejada: number; // % sobre o custo, depois de taxa
  plataforma: "MERCADOLIVRE" | "SHOPEE";
  categoriaMlId?: string | null;
}): Promise<{
  precoSugerido: number;
  taxaPercentual: number;
  taxaValor: number;
  lucroLiquido: number;
  taxaPlataforma: string;
  freteGratisObrigatorio?: boolean;
}> {
  const { custoReal, margemDesejada, plataforma, categoriaMlId } = params;
  const lucroDesejado = custoReal * (margemDesejada / 100);
  const alvo = custoReal + lucroDesejado;

  if (plataforma === "MERCADOLIVRE" && categoriaMlId) {
    let preco = alvo;
    let taxaPercentual = 0;
    // 3 iterações converge bem pra tabela de taxas do ML (faixas por preço)
    for (let i = 0; i < 3; i++) {
      try {
        const taxa = await obterTaxaListagemML(categoriaMlId, preco);
        taxaPercentual = taxa.taxaPercentual;
        preco = alvo / (1 - taxaPercentual);
      } catch {
        break;
      }
    }
    const precoSugerido = Math.round(preco * 100) / 100;
    const taxaValor = Math.round(precoSugerido * taxaPercentual * 100) / 100;
    return {
      precoSugerido,
      taxaPercentual: Math.round(taxaPercentual * 10000) / 100,
      taxaValor,
      lucroLiquido: Math.round((precoSugerido - taxaValor - custoReal) * 100) / 100,
      taxaPlataforma: "Mercado Livre (taxa real consultada na API)",
      freteGratisObrigatorio: freteGratisObrigatorioML(preco),
    };
  }

  if (plataforma === "SHOPEE") {
    const config = await getConfiguracaoFinanceira();
    const { precoSugerido, taxaPercentual, taxaFixa } = calcularPrecoVendaShopeeComTaxa(
      custoReal,
      margemDesejada,
      config.tipoVendedorShopee
    );
    const taxaReal = calcularTaxaShopee(precoSugerido, config.tipoVendedorShopee);
    return {
      precoSugerido,
      taxaPercentual,
      taxaValor: taxaReal.taxaTotal,
      lucroLiquido: Math.round((precoSugerido - taxaReal.taxaTotal - custoReal) * 100) / 100,
      taxaPlataforma: `Shopee (${taxaPercentual}% + R$${taxaFixa.toFixed(2)} fixo — taxa real conforme tipo de vendedor ${config.tipoVendedorShopee === "CNPJ" ? "CNPJ" : "CPF individual"}, configurável em Configurações → Financeiro)`,
    };
  }

  const config = await getConfiguracaoFinanceira();
  const taxaEstimada = Number(config.taxaEstimadaShopee) / 100;
  const preco = alvo / (1 - taxaEstimada);
  const precoSugerido = Math.round(preco * 100) / 100;
  const taxaValor = Math.round(precoSugerido * taxaEstimada * 100) / 100;
  return {
    precoSugerido,
    taxaPercentual: Number(config.taxaEstimadaShopee),
    taxaValor,
    lucroLiquido: Math.round((precoSugerido - taxaValor - custoReal) * 100) / 100,
    taxaPlataforma: "Mercado Livre (categoria não definida — usando estimativa)",
  };
}
