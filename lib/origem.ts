import { prisma } from "@/lib/prisma";

export const COOKIE_ORIGEM = "dropy_o";
export const ORIGEM_DIRETO = "direto";

// Normaliza um texto pra um código curto e seguro (sem acento/espaço).
export function slugCodigo(txt: string): string {
  return txt
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
    .slice(0, 40) || "origem";
}

// Código de origem de um grupo de WhatsApp (via categoria vinculada).
export async function codigoOrigemGrupo(grupoJid: string): Promise<string> {
  const v = await prisma.grupoWhatsappCategoria.findFirst({
    where: { grupoId: grupoJid },
    select: { categoria: true, grupoNome: true },
  });
  const base = v?.categoria || v?.grupoNome || "grupo";
  return `g_${slugCodigo(base)}`;
}

// Acrescenta ?o={codigo} a links /r/ e /atacado/ dentro de um texto (legenda).
// Não duplica se já houver ?o=. Preserva query existente.
export function marcarLinksOrigem(texto: string, codigo: string): string {
  return texto.replace(/https?:\/\/[^\s]+/g, (url) => {
    if (!/\/(r|atacado)\//.test(url)) return url;
    if (/[?&]o=/.test(url)) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}o=${encodeURIComponent(codigo)}`;
  });
}

// Rótulo amigável pra exibir no relatório.
const ROTULOS: Record<string, string> = {
  [ORIGEM_DIRETO]: "Direto / sem origem",
  instagram: "Instagram",
  instagram_bio: "Instagram — Bio",
  instagram_stories: "Instagram — Stories",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  kwai: "Kwai",
  telegram: "Telegram",
  wpp_status: "WhatsApp — Status",
  wpp_avulso: "WhatsApp — Divulgação avulsa",
};
export function rotuloOrigem(codigo: string): string {
  if (ROTULOS[codigo]) return ROTULOS[codigo];
  if (codigo.startsWith("g_")) return `Grupo: ${codigo.slice(2).replace(/_/g, " ")}`;
  return codigo.replace(/_/g, " ");
}
