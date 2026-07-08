const ML_BASE = "https://api.mercadolibre.com";

export type MLCategoriaCandidata = {
  categoryId: string;
  categoryName: string;
  domainName: string;
};

// Mesma API real de descoberta (nunca a IA inventando category_id) — mas roda o título
// original e as variações de busca sugeridas pela IA (lib/groq.ts), juntando até 3
// candidatos REAIS e distintos pro admin escolher, em vez de aplicar o primeiro
// resultado direto. Resolve o caso "Creatina Gummies" sem reintroduzir a heurística de
// simplificar automaticamente o título (que já provou devolver categoria errada sem
// aviso) — aqui o ML continua sendo a única fonte do category_id, só com mais opções
// reais visíveis pro humano confirmar.
export async function descobrirCandidatosCategoriaML(
  titulo: string,
  variacoesBusca: string[]
): Promise<MLCategoriaCandidata[]> {
  const buscas = [titulo, ...variacoesBusca];
  const vistos = new Set<string>();
  const candidatos: MLCategoriaCandidata[] = [];

  for (const busca of buscas) {
    if (!busca.trim() || candidatos.length >= 3) continue;
    const params = new URLSearchParams({ q: busca, limit: "2" });
    const res = await fetch(`${ML_BASE}/sites/MLB/domain_discovery/search?${params.toString()}`);
    if (!res.ok) continue;
    const data: { category_id: string; category_name: string; domain_name: string }[] = await res.json();
    for (const item of data) {
      if (candidatos.length >= 3 || vistos.has(item.category_id)) continue;
      vistos.add(item.category_id);
      candidatos.push({
        categoryId: item.category_id,
        categoryName: item.category_name,
        domainName: item.domain_name,
      });
    }
  }

  return candidatos;
}

// domain_id (ex: "MLB-SPORT_SHORTS") é diferente de category_id — necessário pra consultar
// a ficha técnica de size chart (/domains/{domain}/technical_specs). Confirmado ao vivo na
// API real: GET /categories/{id}.settings.catalog_domain retorna o mesmo valor que
// domain_discovery/search[0].domain_id, sem precisar re-buscar por título.
export async function obterDomainIdDaCategoria(categoryId: string): Promise<string | null> {
  const res = await fetch(`${ML_BASE}/categories/${categoryId}`);
  if (!res.ok) throw new Error(`Falha ao buscar categoria ML: ${await res.text()}`);
  const data: { settings?: { catalog_domain?: string | null } } = await res.json();
  return data.settings?.catalog_domain ?? null;
}

// GENDER com tags.grid_template_required é o único sinal real de que a categoria exige
// SIZE_GRID_ID — o próprio SIZE_GRID_ID não tem tags (confirmado ao vivo na API real:
// /categories/{id}/attributes pra uma categoria de shorts esportivos).
export async function categoriaExigeSizeChart(categoryId: string): Promise<boolean> {
  const atributos = await getAtributosCategoriaML(categoryId);
  const gender = atributos.find((a) => a.id === "GENDER");
  return !!gender?.tags?.grid_template_required;
}

export type MLTechnicalSpecAttribute = {
  id: string;
  name: string;
  value_type: string;
  // Neste endpoint as tags vêm como array de strings (ex: ["grid_filter","required"]) —
  // diferente de /categories/{id}/attributes, que devolve tags como objeto de booleans.
  // Confirmado ao vivo: são formatos diferentes entre os dois endpoints do ML.
  tags?: string[];
  values?: { id: string; name: string }[];
};

type MLTechnicalSpecComponent = {
  attributes?: MLTechnicalSpecAttribute[];
  components?: MLTechnicalSpecComponent[];
};

type MLTechnicalSpecGroup = {
  id?: string;
  section?: string;
  components?: MLTechnicalSpecComponent[];
};

// Taxa REAL de venda do ML pra um preço/categoria/tipo de anúncio — endpoint
// público oficial, não estimativa. Usado pra sugerir preço de venda já
// considerando a comissão de verdade, em vez da IA "chutar" uma taxa típica.
export async function obterTaxaListagemML(
  categoryId: string,
  price: number,
  listingTypeId: "gold_special" | "gold_pro" = "gold_special"
): Promise<{ taxaFixa: number; taxaPercentual: number }> {
  const params = new URLSearchParams({
    price: String(price),
    category_id: categoryId,
    listing_type_id: listingTypeId,
  });
  const res = await fetch(`${ML_BASE}/sites/MLB/listing_prices?${params.toString()}`);
  if (!res.ok) throw new Error(`Falha ao consultar taxas do ML: ${await res.text()}`);
  const data: { sale_fee_amount: number; listing_type_id: string }[] = await res.json();
  const item = data.find((d) => d.listing_type_id === listingTypeId) ?? data[0];
  if (!item) throw new Error("ML não retornou taxa para essa categoria/preço");
  return {
    taxaFixa: 0,
    taxaPercentual: price > 0 ? item.sale_fee_amount / price : 0,
  };
}

// Extrai o ID (ex: MLB1234567890) de qualquer formato de link do ML e identifica se é
// um anúncio normal (/items) ou uma página de ficha técnica de catálogo (/p/ → /products).
export function extrairItemIdML(url: string): { id: string; tipo: "item" | "produto" } {
  const match = url.match(/MLB-?(\d+)/i);
  if (!match) throw new Error("Não foi possível identificar o ID do anúncio no link informado");
  const tipo = /\/p\/MLB/i.test(url) ? "produto" : "item";
  return { id: `MLB${match[1]}`, tipo };
}

export type MLPublicItem = {
  id: string;
  title: string;
  category_id: string;
  price?: number;
  pictures: { url: string; secure_url: string }[];
  attributes: { id: string; value_id: string | null; value_name: string | null }[];
};

export type MLCategoryAttribute = {
  id: string;
  name: string;
  value_type: string;
  tags?: Record<string, boolean>;
  values?: { id: string; name: string }[];
};

export type MLAttributeValue = { id: string; value_name?: string; value_id?: string };

export async function getAtributosCategoriaML(categoryId: string): Promise<MLCategoryAttribute[]> {
  const res = await fetch(`${ML_BASE}/categories/${categoryId}/attributes`);
  if (!res.ok) throw new Error(`Falha ao buscar atributos da categoria ML: ${await res.text()}`);
  return res.json();
}

// Só os atributos obrigatórios — usado pra montar o formulário dinâmico no cadastro do produto.
// Inclui "required" (sempre obrigatório) e "conditional_required" (obrigatório condicional,
// ex: GTIN — confirmado direto na API real: /categories/{id}/attributes retorna
// tags.conditional_required:true pro GTIN, não "catalog_required").
export async function getAtributosObrigatoriosML(categoryId: string): Promise<MLCategoryAttribute[]> {
  const atributos = await getAtributosCategoriaML(categoryId);
  return atributos.filter((a) => a.tags?.required || a.tags?.conditional_required);
}

// Atributos obrigatórios variam por categoria (BRAND, MODEL, COMPATIBLE_CELLPHONE etc.)
// e não dá pra adivinhar com IA. Valores genéricos/"Universal"/"Genérica" também NÃO
// são preenchidos automaticamente aqui mesmo quando a categoria oferece essa opção —
// o algoritmo de qualidade do ML rebaixa anúncios com características genéricas
// ("dados incorretos"), então o ideal é sempre o admin informar o valor real no
// cadastro do produto. Esta função nunca inventa valor — sempre retorna vazio;
// existe só pra manter compatibilidade com produtos sem atributosMl preenchido,
// que devem ser revisados manualmente em vez de publicados com atributo ausente.
export async function preencherAtributosObrigatoriosML(categoryId: string): Promise<MLAttributeValue[]> {
  await getAtributosObrigatoriosML(categoryId);
  return [];
}

// Resolve o "name" real do atributo (attribute_combinations usa "name", não "id" —
// confirmado no payload real de POST /items com variations) e o value_id quando a
// categoria tiver uma lista fechada de valores com esse nome exato; senão usa o texto
// digitado como value_name livre. Usado pra montar SIZE/COLOR de cada variação publicada.
export async function resolverValorAtributoVariacao(
  categoryId: string,
  attrId: string,
  valorTexto: string
): Promise<MLVariationAttributeCombination | null> {
  const atributos = await getAtributosCategoriaML(categoryId);
  const attr = atributos.find((a) => a.id === attrId);
  if (!attr) return null;
  const valor = attr.values?.find((v) => v.name.toLowerCase() === valorTexto.toLowerCase());
  return valor
    ? { name: attr.name, value_id: valor.id }
    : { name: attr.name, value_name: valorTexto };
}

// IDs padrão de atributo do ML que já temos como campo dedicado no cadastro do
// produto — mapeia direto pro dado real informado pelo admin, em vez de deixar
// de fora só porque o admin preencheu em "marca/modelo/GTIN/MPN" e não na lista
// de atributos manuais do ML.
const CAMPO_PRODUTO_POR_ATRIBUTO: Record<string, "marca" | "modelo" | "gtin" | "mpn"> = {
  BRAND: "marca",
  MODEL: "modelo",
  GTIN: "gtin",
  MPN: "mpn",
};

// Monta os atributos finais pra publicação: prioriza o que o admin preencheu
// manualmente em atributosMl, complementa com marca/modelo/GTIN/MPN dos campos
// dedicados do produto quando o atributo correspondente exigir isso, e retorna
// junto a lista de atributos obrigatórios que NINGUÉM preencheu — pra bloquear
// a publicação com uma mensagem clara em vez de deixar o ML rejeitar com um
// erro técnico ilegível pro lojista.
export async function resolverAtributosParaPublicacao(
  categoryId: string,
  atributosManuais: Record<string, { value_id?: string; value_name?: string }>,
  produto: { marca?: string | null; modelo?: string | null; gtin?: string | null; mpn?: string | null }
): Promise<{ attributes: MLAttributeValue[]; faltando: { id: string; name: string }[] }> {
  const obrigatorios = await getAtributosObrigatoriosML(categoryId);
  const attributes: MLAttributeValue[] = [];
  const faltando: { id: string; name: string }[] = [];

  for (const attr of obrigatorios) {
    const manual = atributosManuais[attr.id];
    if (manual?.value_id || manual?.value_name) {
      attributes.push({ id: attr.id, ...manual });
      continue;
    }

    const campo = CAMPO_PRODUTO_POR_ATRIBUTO[attr.id];
    const valorProduto = campo ? produto[campo] : null;
    if (valorProduto) {
      attributes.push({ id: attr.id, value_name: valorProduto });
      continue;
    }

    faltando.push({ id: attr.id, name: attr.name });
  }

  // GTIN e EMPTY_GTIN_REASON são alternativos, não os dois obrigatórios juntos —
  // confirmado na própria API do ML (/categories/{id}/attributes): quando o
  // produto não tem código de barras real, a categoria aceita declarar o motivo
  // (ex: "O produto não tem código cadastrado") em vez do código. Preencher
  // qualquer um dos dois satisfaz o requisito.
  const gtinPreenchido = attributes.some((a) => a.id === "GTIN");
  const motivoPreenchido = attributes.some((a) => a.id === "EMPTY_GTIN_REASON");
  if (gtinPreenchido || motivoPreenchido) {
    const indexGtin = faltando.findIndex((f) => f.id === "GTIN");
    if (indexGtin >= 0) faltando.splice(indexGtin, 1);
    const indexMotivo = faltando.findIndex((f) => f.id === "EMPTY_GTIN_REASON");
    if (indexMotivo >= 0) faltando.splice(indexMotivo, 1);
  }

  return { attributes, faltando };
}

export type MlTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: number;
};

export function getMlAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.ML_APP_ID ?? "",
    redirect_uri: process.env.ML_REDIRECT_URI ?? "",
    state,
  });
  return `https://auth.mercadolivre.com.br/authorization?${params.toString()}`;
}

export async function exchangeMlCode(code: string): Promise<MlTokenResponse> {
  const res = await fetch(`${ML_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ML_APP_ID ?? "",
      client_secret: process.env.ML_SECRET ?? "",
      code,
      redirect_uri: process.env.ML_REDIRECT_URI ?? "",
    }),
  });
  if (!res.ok) throw new Error(`Falha ao trocar code por token ML: ${await res.text()}`);
  return res.json();
}

export async function refreshMlToken(refreshToken: string): Promise<MlTokenResponse> {
  const res = await fetch(`${ML_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.ML_APP_ID ?? "",
      client_secret: process.env.ML_SECRET ?? "",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Falha ao renovar token ML: ${await res.text()}`);
  return res.json();
}

export async function getMlUser(accessToken: string): Promise<{ id: number; nickname: string }> {
  const res = await fetch(`${ML_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Falha ao buscar usuário ML: ${await res.text()}`);
  return res.json();
}

// Cada variação tem seu próprio preço/estoque/combinação de atributos — confirmado no
// payload real documentado pelo ML (POST /items com array "variations"). attribute_combinations
// usa "name" (não "id") como chave do atributo, ao contrário do "attributes" de item único.
export type MLVariationAttributeCombination = {
  name: string;
  value_id?: string;
  value_name?: string;
};

export type MLVariationPayload = {
  attribute_combinations: MLVariationAttributeCombination[];
  price: number;
  available_quantity: number;
  attributes?: MLAttributeValue[]; // ex: SIZE_GRID_ROW_ID por variação
  picture_ids?: string[];
};

// Payload de criação de size chart (POST /catalog/charts) — confirmado via documentação
// oficial do ML. "rows" usa "values" (array) mesmo pra valor único, por padrão da API.
export type MLSizeChartPayload = {
  names: Record<string, string>;
  domain_id: string;
  site_id: "MLB";
  type: "SPECIFIC";
  measure_type: "CLOTHING_MEASURE" | "BODY_MEASURE" | "MIXED_MEASURE";
  main_attribute: { attributes: { site_id: "MLB"; id: string }[] };
  attributes?: { id: string; values: { id?: string; name: string }[] }[];
  rows: {
    sites: ["MLB"];
    attributes: { id: string; values: { name: string }[] }[];
  }[];
};

export type MLSizeChartResponse = {
  id: string;
  domain_id: string;
  rows: { id: string }[]; // rows[].id no formato "<chartId>:<rowNumber>"
};

export type MLItemPayload = {
  title: string;
  category_id: string;
  price?: number;
  currency_id: "BRL";
  available_quantity?: number;
  listing_type_id: "gold_special";
  condition: "new";
  pictures: { source: string }[];
  shipping: { mode: "me2"; free_shipping: boolean };
  attributes?: MLAttributeValue[];
  // Quando presente, price/available_quantity no nível raiz não são enviados — cada
  // variação tem os seus. Usado só pra categorias que exigem size chart (roupa com
  // tamanho real) — produtos sem variação seguem o caminho de item único como sempre.
  variations?: MLVariationPayload[];
};

export type MLOrder = {
  id: number;
  status: string;
  date_created: string;
  total_amount: number;
  buyer: { id: number; nickname: string };
  order_items: {
    // variation_id é o ID real da variação publicada (confirmado na doc oficial com
    // exemplo de camiseta tamanho M/cor Preto) — presente só quando o item vendido tem
    // variações; ausente em item sem variação.
    item: { id: string; title: string; variation_id?: number };
    quantity: number;
    unit_price: number;
  }[];
  shipping?: { id: number };
};

export type MLShipmentAddress = {
  receiver_address: {
    receiver_name: string;
    street_name: string;
    street_number: string;
    comment?: string;
    neighborhood?: { name: string };
    city: { name: string };
    state: { name: string; id: string };
    zip_code: string;
  };
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wrapper autenticado da API do Mercado Livre.
 * Renova o access_token sozinho em 401 (1 retry) e faz backoff exponencial em 429.
 */
export class MercadoLivreClient {
  private accessToken: string;
  private refreshTokenValue?: string;
  private onRefresh?: (tokens: MlTokenResponse) => Promise<void> | void;

  constructor(
    accessToken: string,
    options?: {
      refreshToken?: string;
      onRefresh?: (tokens: MlTokenResponse) => Promise<void> | void;
    }
  ) {
    this.accessToken = accessToken;
    this.refreshTokenValue = options?.refreshToken;
    this.onRefresh = options?.onRefresh;
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    jaTentouRefresh = false,
    tentativaBackoff = 0
  ): Promise<T> {
    const res = await fetch(`${ML_BASE}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${this.accessToken}` },
    });

    if (res.status === 401 && !jaTentouRefresh && this.refreshTokenValue) {
      const tokens = await refreshMlToken(this.refreshTokenValue);
      this.accessToken = tokens.access_token;
      this.refreshTokenValue = tokens.refresh_token;
      await this.onRefresh?.(tokens);
      return this.request<T>(path, init, true, tentativaBackoff);
    }

    if (res.status === 429 && tentativaBackoff < 3) {
      await sleep(2 ** tentativaBackoff * 500);
      return this.request<T>(path, init, jaTentouRefresh, tentativaBackoff + 1);
    }

    if (!res.ok) {
      throw new Error(`Erro ML (${res.status}): ${await res.text()}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  async publishItem(data: MLItemPayload): Promise<{
    id: string;
    permalink: string;
    variations?: { id: number; attribute_combinations: { id: string; name: string; value_id?: string; value_name?: string }[] }[];
  }> {
    return this.request("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async pauseItem(itemId: string): Promise<void> {
    await this.request(`/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paused" }),
    });
  }

  async activateItem(itemId: string): Promise<void> {
    await this.request(`/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
  }

  // Zera o estoque de UMA variação específica sem pausar o anúncio inteiro — usado
  // quando só um tamanho/cor esgota, mantendo os outros à venda.
  async updateVariationStock(itemId: string, variationId: string, availableQuantity: number): Promise<void> {
    await this.request(`/items/${itemId}/variations/${variationId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available_quantity: availableQuantity }),
    });
  }

  // Cria um size chart (POST /catalog/charts) — pertence à conta do vendedor que cria,
  // por isso não pode ser compartilhado entre Lojistas diferentes (ver AnuncioSizeChart).
  // ATENÇÃO: formato confirmado pela documentação oficial pra fluxo cross-border (site_id
  // "CBT"); usamos site_id "MLB" aqui pro fluxo doméstico seguindo a mesma estrutura — a
  // doc afirma "o formato de associação é o mesmo pra todos os domínios", mas o
  // comportamento exato pra MLB direto não foi testado contra a API real ainda. Se a
  // criação falhar, o erro real do ML (não um 404 genérico) deve aparecer pro chamador.
  async createSizeChart(data: MLSizeChartPayload): Promise<MLSizeChartResponse> {
    return this.request("/catalog/charts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async getOrders(sellerId: string, since: Date): Promise<MLOrder[]> {
    const params = new URLSearchParams({
      seller: sellerId,
      "order.date_created.from": since.toISOString(),
      sort: "date_desc",
    });
    const data = await this.request<{ results: MLOrder[] }>(`/orders/search?${params.toString()}`);
    return data.results;
  }

  async getOrder(orderId: string): Promise<MLOrder> {
    return this.request(`/orders/${orderId}`);
  }

  // O endereço de entrega não vem no pedido — precisa buscar o shipment.
  async getShipment(shipmentId: number): Promise<MLShipmentAddress> {
    return this.request(`/shipments/${shipmentId}`);
  }

  // Endpoints públicos do ML passaram a exigir um access_token válido — qualquer
  // integração ativa serve, já que é leitura de dado público, não ação em nome de ninguém.
  async getItemPublico(itemId: string): Promise<MLPublicItem> {
    return this.request(`/items/${itemId}`);
  }

  // Ficha técnica de catálogo (links no formato /p/MLB...) — sem price, que é por anúncio.
  async getProdutoCatalogo(productId: string): Promise<MLPublicItem> {
    return this.request(`/products/${productId}`);
  }

  // Ficha técnica de size chart do domínio — define quais atributos de medida são válidos
  // pra criar/ler um chart desse domínio (ex: FOOT_LENGTH pra calçados). Confirmado ao vivo
  // (token real, domínio MLB-PANTS): a resposta aninha os atributos em
  // input.groups[].components[].components[]...attributes[] (componente GRID com
  // sub-componentes), não em input.attributes[] como assumido antes — por isso o editor de
  // variações nunca mostrava o bloco de medidas, mesmo com a categoria certa.
  // Retorna só os atributos de LINHA (medida por tamanho): exclui os que têm a tag
  // "grid_filter" (esses são filtros de nível do chart inteiro, ex: BRAND/GENDER/AGE_GROUP,
  // preenchidos uma vez só, não por tamanho) e os "hidden"/"read_only". Categorias sem
  // nenhum atributo de medida real (ex: Calças/MLB-PANTS, que só tem BRAND/GENDER/AGE_GROUP)
  // legitimamente retornam [] — não é bug, o ML não define coluna de medida pra esse domínio.
  async getTechnicalSpecsGrids(domainId: string): Promise<MLTechnicalSpecAttribute[]> {
    const data = await this.request<{ input?: { groups?: MLTechnicalSpecGroup[] } }>(
      `/domains/${domainId}/technical_specs?section=grids`
    );

    const vistos = new Set<string>();
    const resultado: MLTechnicalSpecAttribute[] = [];

    function coletar(components: MLTechnicalSpecComponent[] | undefined) {
      for (const comp of components ?? []) {
        for (const attr of comp.attributes ?? []) {
          const tags = attr.tags ?? [];
          if (tags.includes("grid_filter") || tags.includes("hidden") || tags.includes("read_only")) continue;
          if (vistos.has(attr.id)) continue;
          vistos.add(attr.id);
          resultado.push(attr);
        }
        coletar(comp.components);
      }
    }

    for (const group of data.input?.groups ?? []) {
      coletar(group.components);
    }

    return resultado;
  }

  async getDescricaoItem(itemId: string): Promise<string> {
    try {
      const data = await this.request<{ plain_text?: string }>(`/items/${itemId}/description`);
      return data.plain_text ?? "";
    } catch {
      return "";
    }
  }

  static async refreshToken(refreshToken: string): Promise<MlTokenResponse> {
    return refreshMlToken(refreshToken);
  }
}
