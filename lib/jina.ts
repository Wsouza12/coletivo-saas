// Jina AI CLIP v2 — embeddings visuais e de texto (768→1024 dims)
// Modelo: jina-clip-v2 | Grátis: 1M tokens/mês | https://jina.ai

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const MODEL = "jina-clip-v2";

function getKey() {
  const key = process.env.JINA_API_KEY;
  if (!key) throw new Error("JINA_API_KEY não configurada");
  return key;
}

type JinaInput =
  | { text: string }
  | { image: string }; // data:mime;base64,... ou URL pública

async function embed(inputs: JinaInput[]): Promise<number[][]> {
  const res = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getKey()}`,
    },
    body: JSON.stringify({ model: MODEL, input: inputs }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Jina AI erro ${res.status}: ${txt}`);
  }
  const json = await res.json();
  return json.data.map((d: any) => d.embedding as number[]);
}

/** Gera embedding de uma imagem a partir de base64 (qualquer formato) */
export async function embedImagem(base64: string, mimeType = "image/jpeg"): Promise<number[]> {
  const [embedding] = await embed([
    { image: `data:${mimeType};base64,${base64}` },
  ]);
  return embedding;
}

/** Gera embedding de texto (descrição de produto, OCR, etc.) */
export async function embedTexto(texto: string): Promise<number[]> {
  const [embedding] = await embed([{ text: texto }]);
  return embedding;
}

/** Formata embedding number[] para string pgvector '[0.1,0.2,...]' */
export function formatarVetor(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
