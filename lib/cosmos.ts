// Cosmos API (Bluesoft) — consulta de produtos por GTIN/EAN. Alternativa à API
// oficial da GS1 Brasil (que exige associação + liberação prévia, ainda não
// disponível) pra trazer dados reais do fabricante a partir do código de barras.
// Contrato confirmado ao vivo em 2026-06-22: GET /gtins/{codigo}.json com header
// X-Cosmos-Token, retorna description/brand/ncm/gpc/category reais do cadastro.

export type CosmosProduto = {
  gtin: number;
  description: string;
  brand: { name: string; picture?: string } | null;
  ncm: { code: string; description: string; full_description: string } | null;
  gpc: { code: string; description: string } | null;
  category: { id: number; description: string } | null;
  thumbnail: string | null;
};

export async function buscarProdutosCosmos(query: string): Promise<CosmosProduto[]> {
  const token = process.env.COSMOS_API_TOKEN;
  if (!token) {
    throw new Error("COSMOS_API_TOKEN não configurado — consulta de GTIN indisponível");
  }

  const params = new URLSearchParams({ query, per_page: "5" });
  const res = await fetch(`https://api.cosmos.bluesoft.com.br/products?${params.toString()}`, {
    headers: {
      "X-Cosmos-Token": token,
      "User-Agent": "Cosmos-API-Request",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Falha ao buscar na Cosmos (${res.status}): ${await res.text()}`);
  }

  const data: { products: CosmosProduto[] } = await res.json();
  return data.products;
}

export async function consultarGtinCosmos(gtin: string): Promise<CosmosProduto> {
  const token = process.env.COSMOS_API_TOKEN;
  if (!token) {
    throw new Error("COSMOS_API_TOKEN não configurado — consulta de GTIN indisponível");
  }

  const res = await fetch(`https://api.cosmos.bluesoft.com.br/gtins/${encodeURIComponent(gtin)}.json`, {
    headers: {
      "X-Cosmos-Token": token,
      "User-Agent": "Cosmos-API-Request",
      "Content-Type": "application/json",
    },
  });

  if (res.status === 404) {
    throw new Error("GTIN não encontrado na base da Cosmos");
  }
  if (!res.ok) {
    throw new Error(`Falha ao consultar Cosmos (${res.status}): ${await res.text()}`);
  }

  return res.json();
}
