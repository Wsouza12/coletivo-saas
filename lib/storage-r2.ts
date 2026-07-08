import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.R2_BUCKET_CATALOGOS ?? "dropsync-catalogos";

function getClient() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 não configurado (R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY)");
  }
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT ?? `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function publicUrlFor(path: string): string {
  const base = process.env.R2_PUBLIC_URL_CATALOGOS;
  if (!base) throw new Error("R2_PUBLIC_URL_CATALOGOS não configurado — habilite o acesso público no bucket");
  return `${base.replace(/\/$/, "")}/${path}`;
}

// PDFs de catálogo costumam passar do limite de payload de uma função
// serverless da Vercel (~4.5MB) — por isso o upload é feito direto do
// navegador pro R2 com uma URL assinada (PUT), sem passar pelo servidor.
export async function criarUploadUrlCatalogoFornecedor(
  fornecedorId: string
): Promise<{ signedUrl: string; path: string; publicUrl: string }> {
  const client = getClient();
  const path = `${fornecedorId}/${crypto.randomUUID()}.pdf`;

  const signedUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: BUCKET, Key: path, ContentType: "application/pdf" }),
    { expiresIn: 300 }
  );

  return { signedUrl, path, publicUrl: publicUrlFor(path) };
}

/** Faz upload de thumbnail PNG (base64) de página de catálogo direto para o R2 */
export async function uploadThumbCatalogo(
  catalogoId: string,
  pagina: number,
  base64: string
): Promise<string> {
  const client = getClient();
  const path = `thumbs/${catalogoId}/p${pagina}.jpg`;
  const buffer = Buffer.from(base64, "base64");
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: path,
      Body: buffer,
      ContentType: "image/jpeg",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return publicUrlFor(path);
}

export async function deleteCatalogoFornecedorPdfPorUrl(url: string): Promise<void> {
  const base = process.env.R2_PUBLIC_URL_CATALOGOS;
  if (!base) return;
  const marker = `${base.replace(/\/$/, "")}/`;
  if (!url.startsWith(marker)) return;
  const path = url.slice(marker.length);

  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: path }));
}
