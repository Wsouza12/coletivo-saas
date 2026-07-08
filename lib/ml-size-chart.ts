import { prisma } from "@/lib/prisma";
import { MercadoLivreClient, type MLSizeChartPayload } from "@/lib/mercadolivre";
import type { Produto, ProdutoVariacao } from "@prisma/client";

// Charts pertencem à conta do vendedor que os cria (POST /catalog/charts) — não dá pra
// compartilhar entre Lojistas diferentes, mesmo publicando o mesmo Produto do catálogo.
// Por isso o cache é por (lojistaId, produtoId), não só por produtoId.
export async function obterOuCriarSizeChart(
  lojistaId: string,
  produto: Produto,
  variacoesAtivas: ProdutoVariacao[],
  client: MercadoLivreClient,
  domainId: string,
  generoAtributo: { value_id?: string; value_name?: string } | undefined
): Promise<Record<string, string>> {
  const existente = await prisma.anuncioSizeChart.findUnique({
    where: { lojistaId_produtoId: { lojistaId, produtoId: produto.id } },
  });
  if (existente) {
    return existente.rowsByTamanho as Record<string, string>;
  }

  const atributosDominio = await client.getTechnicalSpecsGrids(domainId);
  const idsValidos = new Set(atributosDominio.map((a) => a.id));

  // Um row por tamanho (a medida é da peça, não da cor) — usa as medidas da primeira
  // variação encontrada com aquele tamanho, assumindo medida consistente entre cores
  // do mesmo tamanho (cenário normal: a peça P é do mesmo molde em qualquer cor).
  const porTamanho = new Map<string, ProdutoVariacao>();
  for (const v of variacoesAtivas) {
    if (!porTamanho.has(v.tamanho)) porTamanho.set(v.tamanho, v);
  }
  const tamanhosOrdenados = [...porTamanho.keys()];

  const rows: MLSizeChartPayload["rows"] = tamanhosOrdenados.map((tamanho) => {
    const variacao = porTamanho.get(tamanho)!;
    const medidas = (variacao.medidas as Record<string, string> | null) ?? {};
    const atributosLinha = [
      { id: "SIZE", values: [{ name: tamanho }] },
      ...Object.entries(medidas)
        .filter(([id]) => idsValidos.has(id))
        .map(([id, valor]) => ({
          id,
          // A doc do ML usa valores com unidade (ex: "70 cm") — admin digita só o
          // número, então completamos a unidade aqui em vez de exigir isso do form.
          values: [{ name: /\d$/.test(valor.trim()) ? `${valor.trim()} cm` : valor.trim() }],
        })),
    ];
    return { sites: ["MLB"] as ["MLB"], attributes: atributosLinha };
  });

  const measureType = atributosDominio.some((a) => a.id.startsWith("GARMENT_"))
    ? ("CLOTHING_MEASURE" as const)
    : ("BODY_MEASURE" as const);

  const nomeChart = `DropSync ${produto.sku}`.slice(0, 60);
  const payload: MLSizeChartPayload = {
    names: { MLB: nomeChart },
    domain_id: domainId,
    site_id: "MLB",
    type: "SPECIFIC",
    measure_type: measureType,
    main_attribute: { attributes: [{ site_id: "MLB", id: "SIZE" }] },
    attributes: generoAtributo
      ? [
          {
            id: "GENDER",
            values: [
              {
                id: generoAtributo.value_id,
                name: generoAtributo.value_name ?? "",
              },
            ],
          },
        ]
      : undefined,
    rows,
  };

  const resposta = await client.createSizeChart(payload);

  const rowsByTamanho: Record<string, string> = {};
  tamanhosOrdenados.forEach((tamanho, i) => {
    const rowId = resposta.rows[i]?.id;
    if (rowId) rowsByTamanho[tamanho] = rowId;
  });

  await prisma.anuncioSizeChart.create({
    data: {
      lojistaId,
      produtoId: produto.id,
      chartId: resposta.id,
      domainId,
      rowsByTamanho,
    },
  });

  return rowsByTamanho;
}
