const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type PaginaProduto = {
  titulo: string;
  descricaoMeta: string;
  imagens: string[];
  textoVisivel: string;
  gtinDetectado: string | null;
};

// Sites com proteção anti-bot conhecida — usados só pra dar uma mensagem de
// erro mais útil ao admin (não muda a tentativa de leitura em si).
const SITES_BLOQUEIO_CONHECIDO: { regex: RegExp; nome: string }[] = [
  { regex: /alibaba\.com/i, nome: "Alibaba" },
  { regex: /aliexpress\.com/i, nome: "AliExpress" },
  { regex: /shopee\.com/i, nome: "Shopee" },
];

function nomeDoSite(url: string): string | null {
  for (const site of SITES_BLOQUEIO_CONHECIDO) {
    if (site.regex.test(url)) return site.nome;
  }
  return null;
}

function extrairMeta(html: string, ...names: string[]): string {
  for (const name of names) {
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
      "i"
    );
    const match = html.match(regex);
    if (match) return match[1].trim();
  }
  return "";
}

// og:image deveria sempre ser absoluto pela spec, mas alguns sites devolvem
// caminho relativo — sem resolver isso, a URL quebra ao tentar baixar a foto.
function extrairTodasMetaImagens(html: string, baseUrl: string): string[] {
  const regex = /<meta[^>]+property=["']og:image[^"']*["'][^>]+content=["']([^"']+)["']/gi;
  const imagens: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const absoluta = new URL(match[1], baseUrl).toString();
      if (!imagens.includes(absoluta)) imagens.push(absoluta);
    } catch {
      // URL irrecuperável — ignora essa imagem específica
    }
  }
  return imagens;
}

// Valida dígito verificador EAN-8/UPC-A/EAN-13/GTIN-14 (mod 10, pesos alternados
// 3/1 a partir do último dígito) — só aceita como GTIN real se o checksum bater,
// pra não confundir um número de 13 dígitos qualquer (preço, SKU, telefone) com
// um código de barras de verdade. Nunca inventa: só reconhece o que já é válido.
function checksumGtinValido(digitos: string): boolean {
  const nums = digitos.split("").map(Number);
  const check = nums.pop()!;
  let soma = 0;
  for (let i = 0; i < nums.length; i++) {
    const peso = (nums.length - i) % 2 === 1 ? 3 : 1;
    soma += nums[i] * peso;
  }
  const calculado = (10 - (soma % 10)) % 10;
  return calculado === check;
}

// Procura sequências de 8, 12, 13 ou 14 dígitos perto de palavras-chave de
// código de barras no HTML cru e valida o checksum — extração determinística,
// não pede pra IA "adivinhar" um número que tem que ser exato.
function extrairGtinDoHtml(html: string): string | null {
  const palavrasChave = /(gtin|ean|upc|c[oó]digo de barras|barcode)/i;
  const candidatos = html.matchAll(/\b\d{8}\b|\b\d{12,14}\b/g);
  for (const match of candidatos) {
    const digitos = match[0];
    if (![8, 12, 13, 14].includes(digitos.length)) continue;
    const inicio = Math.max(0, (match.index ?? 0) - 80);
    const contexto = html.slice(inicio, (match.index ?? 0) + digitos.length + 20);
    if (palavrasChave.test(contexto) && checksumGtinValido(digitos)) {
      return digitos;
    }
  }
  return null;
}

// Busca a página de um produto (ML/Shopee/Alibaba/AliExpress) e extrai o que der
// pra ler sem JS (meta tags de preview + texto visível) — melhor esforço, pode
// falhar em sites com proteção anti-bot forte (Alibaba/AliExpress com frequência).
export async function buscarPaginaProduto(url: string): Promise<PaginaProduto> {
  const site = nomeDoSite(url);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
  } catch {
    throw new Error(
      site
        ? `Não foi possível conectar ao ${site} — o site pode estar bloqueando acesso automático`
        : "Não foi possível conectar a este link"
    );
  }

  if (res.status === 403 || res.status === 429) {
    throw new Error(
      site
        ? `${site} bloqueou a leitura automática desta página (erro ${res.status}). Cole as informações manualmente ou use outro link.`
        : `O site bloqueou a leitura automática (erro ${res.status}). Cole as informações manualmente.`
    );
  }
  if (!res.ok) throw new Error(`Falha ao acessar a página (${res.status})`);

  const html = await res.text();

  const tituloMatch = html.match(/<title>([^<]+)<\/title>/i);
  const titulo = extrairMeta(html, "og:title", "twitter:title") || tituloMatch?.[1]?.trim() || "";
  const descricaoMeta = extrairMeta(html, "og:description", "description", "twitter:description");
  const imagens = extrairTodasMetaImagens(html, res.url || url);
  const gtinDetectado = extrairGtinDoHtml(html);

  const textoVisivel = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);

  if (!titulo && !descricaoMeta && imagens.length === 0) {
    throw new Error(
      site
        ? `Não foi possível extrair dados desta página do ${site} — ele costuma bloquear leitura automática. Cole as informações manualmente.`
        : "Não foi possível extrair dados desta página — o site pode estar bloqueando leitura automática"
    );
  }

  return { titulo, descricaoMeta, imagens, textoVisivel, gtinDetectado };
}
