import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";

// Chaves que o Painel do Desenvolvedor gerencia (criptografadas no banco).
// DATABASE_URL e NEXTAUTH_SECRET NÃO entram aqui — são bootstrap (ficam no .env).
export const CHAVES_CONFIG = [
  "GROQ_API_KEY", "JINA_API_KEY",
  "MP_ACCESS_TOKEN", "MP_WEBHOOK_SECRET",
  "EVOLUTION_API_URL", "EVOLUTION_INSTANCE", "EVOLUTION_API_KEY",
  "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_CATALOGOS", "R2_ENDPOINT", "R2_PUBLIC_URL_CATALOGOS",
  "MELHOR_ENVIO_TOKEN", "RESEND_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_KEY",
  "NEXT_PUBLIC_APP_NAME", "NEXT_PUBLIC_APP_URL",
] as const;

// Cache em memória por instância (serverless) com TTL curto — evita bater no
// banco a cada chamada, mas pega mudanças do painel em segundos.
let cache: Map<string, string | null> = new Map();
let cacheEm = 0;
const TTL_MS = 30_000;

async function carregar(): Promise<void> {
  if (Date.now() - cacheEm < TTL_MS && cache.size > 0) return;
  const novo = new Map<string, string | null>();
  try {
    const linhas = await prisma.configApp.findMany();
    for (const l of linhas) {
      try { novo.set(l.chave, decrypt(l.valor)); } catch { novo.set(l.chave, null); }
    }
  } catch {
    // sem tabela/DB ainda — segue só com env
  }
  cache = novo;
  cacheEm = Date.now();
}

// Resolve uma chave: banco (descriptografado) → process.env → undefined.
export async function getConfig(chave: string): Promise<string | undefined> {
  await carregar();
  const doDb = cache.get(chave);
  if (doDb) return doDb;
  return process.env[chave] || undefined;
}

// Hidrata process.env com as chaves do banco (chamado no startup via
// instrumentation.ts). Assim os wrappers existentes (groq/jina/mp/evolution/r2…)
// leem as chaves do painel sem precisar mudar nada neles.
// NEXT_PUBLIC_* são inlinadas no build — não dá pra setar em runtime, então ficam
// só no .env da Vercel (o painel apenas mostra o status).
export async function hidratarEnv(): Promise<void> {
  try {
    const linhas = await prisma.configApp.findMany();
    for (const l of linhas) {
      if (l.chave.startsWith("NEXT_PUBLIC_")) continue;
      try { process.env[l.chave] = decrypt(l.valor); } catch { /* ignora chave corrompida */ }
    }
  } catch { /* sem tabela/DB ainda — segue só com env */ }
}

// Salva (criptografado) e invalida o cache.
export async function setConfig(chave: string, valor: string): Promise<void> {
  const enc = encrypt(valor);
  await prisma.configApp.upsert({
    where: { chave },
    create: { chave, valor: enc },
    update: { valor: enc },
  });
  cacheEm = 0; // força recarregar
}

// Status de cada chave: definida no banco, no env, ou faltando (sem expor o valor).
export async function getConfigStatus(): Promise<{ chave: string; origem: "banco" | "env" | "faltando" }[]> {
  await carregar();
  return CHAVES_CONFIG.map((chave) => {
    if (cache.get(chave)) return { chave, origem: "banco" as const };
    if (process.env[chave]) return { chave, origem: "env" as const };
    return { chave, origem: "faltando" as const };
  });
}
