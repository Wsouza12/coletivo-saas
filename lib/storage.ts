import { createClient } from "@supabase/supabase-js";

const BUCKET = "produtos";
const BUCKET_ETAPAS = "etapas-pedidos"; // bucket privado — prova interna de envio, nunca exposta a cliente/lojista
// Catálogos de fornecedor (PDF) migraram para Cloudflare R2 — ver lib/storage-r2.ts.
// O plano Free da Supabase Storage limita uploads a ~50MB, insuficiente pra esses arquivos.

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"]/g, '').trim();
  const key = process.env.SUPABASE_SERVICE_KEY?.replace(/['"]/g, '').trim();
  if (!url || !key) {
    throw new Error("Supabase Storage não configurado (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY)");
  }
  return createClient(url, key);
}

export async function uploadProdutoImagem(file: File, produtoId: string): Promise<string> {
  const supabase = getClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${produtoId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload da imagem: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Recorte de crop do catálogo (base64 → bucket "produtos", prefixo crops/).
// Reaproveita o bucket existente pra não precisar criar/config outro.
export async function uploadCropImagem(base64: string, cropId: string): Promise<string> {
  const supabase = getClient();
  const path = `crops/${cropId}.jpg`;
  const buffer = Buffer.from(base64, "base64");

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: "image/jpeg",
    upsert: true, // reindexação sobrescreve
  });
  if (error) throw new Error(`Falha no upload do crop: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Mídia de postagem agendada (print de catálogo, upload de imagem/vídeo).
// Aceita base64 (data URL ou puro) OU um File; devolve URL pública.
export async function uploadPostagemMidia(
  data: string | File,
  ext = "jpg",
  contentType = "image/jpeg",
): Promise<string> {
  const supabase = getClient();
  const path = `postagens/${crypto.randomUUID()}.${ext}`;

  let payload: Buffer | File;
  if (typeof data === "string") {
    const b64 = data.includes(",") ? data.split(",")[1] : data;
    payload = Buffer.from(b64, "base64");
  } else {
    payload = data;
  }

  const { error } = await supabase.storage.from(BUCKET).upload(path, payload, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload da mídia: ${error.message}`);

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return pub.publicUrl;
}

export async function deleteProdutoImagemPorUrl(url: string): Promise<void> {
  const supabase = getClient();
  const marker = `/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return;
  const path = url.slice(idx + marker.length);
  await supabase.storage.from(BUCKET).remove([path]);
}

// Foto de prova de envio — bucket privado, path interno salvo em EtapaPedido.fotoUrl.
export async function uploadEtapaFoto(file: File, pedidoId: string, etapa: string): Promise<string> {
  const supabase = getClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${pedidoId}/${etapa}_${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET_ETAPAS).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload da foto de prova: ${error.message}`);

  return path;
}

// URL assinada de curta duração — só admin deve chamar isso.
export async function getEtapaFotoSignedUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = getClient();
  const { data, error } = await supabase.storage.from(BUCKET_ETAPAS).createSignedUrl(path, expiresInSeconds);
  if (error || !data) throw new Error(`Falha ao gerar URL assinada: ${error?.message}`);
  return data.signedUrl;
}

export async function downloadEtapaFoto(path: string): Promise<Blob> {
  const supabase = getClient();
  const { data, error } = await supabase.storage.from(BUCKET_ETAPAS).download(path);
  if (error || !data) throw new Error(`Falha ao baixar foto de prova: ${error?.message}`);
  return data;
}
