// Taxas reais de marketplace, conforme tabela vigente informada pelo admin (jun/2026).
// O ML já é consultado direto na API oficial (ver obterTaxaListagemML em lib/mercadolivre.ts),
// que retorna o sale_fee_amount real pra categoria/preço — não precisa de tabela fixa aqui.
// A Shopee não tem endpoint público de taxa, então a fórmula abaixo é a única forma de saber
// o valor real sem inventar um percentual genérico.

export type TipoVendedorShopee = "CNPJ" | "CPF_INDIVIDUAL";

export type TaxaShopee = {
  percentual: number;
  fixo: number;
  taxaTotal: number;
  liquido: number;
};

// CNPJ (e CPF com perfil padrão): faixas por preço, sem teto de R$100 — modelo
// atualizado da Shopee.
function taxaShopeeCnpj(preco: number): { percentual: number; fixo: number } {
  if (preco < 80) return { percentual: 20, fixo: 4 };
  if (preco < 100) return { percentual: 14, fixo: 16 };
  if (preco < 200) return { percentual: 14, fixo: 20 };
  return { percentual: 14, fixo: 26 };
}

// CPF individual (abaixo de 450 pedidos/90 dias): comissão fixa de 14% (12% base +
// 2% transação) + R$7 fixos. +6% se participar do programa de frete grátis com cupom.
function taxaShopeeCpfIndividual(freteGratisComCupom: boolean): { percentual: number; fixo: number } {
  return { percentual: freteGratisComCupom ? 20 : 14, fixo: 7 };
}

export function calcularTaxaShopee(
  preco: number,
  tipoVendedor: TipoVendedorShopee,
  freteGratisComCupom = false
): TaxaShopee {
  const { percentual, fixo } =
    tipoVendedor === "CPF_INDIVIDUAL" ? taxaShopeeCpfIndividual(freteGratisComCupom) : taxaShopeeCnpj(preco);

  const taxaTotal = Math.round((preco * (percentual / 100) + fixo) * 100) / 100;
  return { percentual, fixo, taxaTotal, liquido: Math.round((preco - taxaTotal) * 100) / 100 };
}

// Resolve, por iteração, o preço de venda na Shopee que entrega o lucro desejado
// DEPOIS da taxa real — a taxa muda de faixa conforme o próprio preço, igual ML.
export function calcularPrecoVendaShopeeComTaxa(
  custoReal: number,
  margemDesejada: number,
  tipoVendedor: TipoVendedorShopee,
  freteGratisComCupom = false
): { precoSugerido: number; taxaPercentual: number; taxaFixa: number } {
  const lucroDesejado = custoReal * (margemDesejada / 100);
  const alvo = custoReal + lucroDesejado;

  let preco = alvo;
  let taxa = calcularTaxaShopee(preco, tipoVendedor, freteGratisComCupom);
  for (let i = 0; i < 5; i++) {
    const novoPreco = (alvo + taxa.fixo) / (1 - taxa.percentual / 100);
    const novaTaxa = calcularTaxaShopee(novoPreco, tipoVendedor, freteGratisComCupom);
    preco = novoPreco;
    if (novaTaxa.percentual === taxa.percentual && novaTaxa.fixo === taxa.fixo) {
      taxa = novaTaxa;
      break;
    }
    taxa = novaTaxa;
  }

  return {
    precoSugerido: Math.round(preco * 100) / 100,
    taxaPercentual: taxa.percentual,
    taxaFixa: taxa.fixo,
  };
}

// O ML torna o frete grátis obrigatório (custeado parcialmente pelo vendedor) a
// partir de R$79 — não temos o valor real da tarifa de frete (varia por peso e
// reputação do vendedor), então só avisamos que ela existe, sem inventar o número.
export function freteGratisObrigatorioML(preco: number): boolean {
  return preco >= 79;
}
