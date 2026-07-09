// Evolution API (WhatsApp self-hosted, Railway) — grupos de compra coletiva.
// Contrato confirmado ao vivo (2026-06-23) contra a instância real antes de codificar:
// GET /group/fetchAllGroups/{instance} retornou os grupos reais (inclusive os de categoria
// dentro da comunidade "Compras Coletivas 2"), confirmando suporte a grupo, não só 1:1.

type GrupoWhatsapp = { id: string; nome: string; tamanho: number; isCommunity?: boolean; linkedParent?: string; };

// WhatsApp não aceita WebP como imagem normal (só como sticker). Buscamos a
// imagem do Supabase e convertemos para JPEG via sharp antes de enviar.
// Retorna { base64, mimetype, fileName } em JPEG sempre.
// Usa require() dinâmico pra evitar que o bundler tente resolver o sharp em build time.
async function prepararImagemParaWhatsApp(
  urlOrDataUrl: string
): Promise<{ base64: string; mimetype: "image/jpeg"; fileName: string }> {
  let buffer: Buffer;

  if (urlOrDataUrl.startsWith("data:")) {
    const b64 = urlOrDataUrl.split(",")[1];
    buffer = Buffer.from(b64, "base64");
  } else {
    const res = await fetch(urlOrDataUrl);
    if (!res.ok) throw new Error(`Falha ao baixar imagem (${res.status}): ${urlOrDataUrl}`);
    buffer = Buffer.from(await res.arrayBuffer());
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sharpModule = require("sharp");
  const jpeg = await sharpModule(buffer).jpeg({ quality: 85 }).toBuffer();
  return { base64: jpeg.toString("base64"), mimetype: "image/jpeg", fileName: "imagem.jpg" };
}

import { getConfig as getDbConfig } from "./config-app";

export async function getConfig() {
  const baseUrl = await getDbConfig("EVOLUTION_API_URL");
  const instance = await getDbConfig("EVOLUTION_INSTANCE");
  const apiKey = await getDbConfig("EVOLUTION_API_KEY");
  if (!baseUrl || !instance || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), instance, apiKey };
}

export async function listarGruposWhatsapp(): Promise<GrupoWhatsapp[]> {
  const config = await getConfig();
  if (!config) return [];

  const res = await fetch(
    `${config.baseUrl}/group/fetchAllGroups/${config.instance}?getParticipants=false`,
    { headers: { apikey: config.apiKey } }
  );
  if (!res.ok) throw new Error(`Evolution API: falha ao listar grupos (${res.status})`);

  const grupos: Array<{ id: string; subject: string; size: number; isCommunity?: boolean; linkedParent?: string }> = await res.json();
  return grupos.map((g) => ({ 
    id: g.id, 
    nome: g.subject, 
    tamanho: g.size,
    isCommunity: g.isCommunity,
    linkedParent: g.linkedParent
  }));
}

// Lista os grupos que pertencem a uma comunidade (campo linkedParent presente),
// já com o link de convite resolvido — usado pelo painel lateral de Avisos pra
// acesso rápido a qualquer grupo da comunidade, mesmo os que não têm vínculo
// cadastrado em GrupoWhatsappCategoria.
export async function listarGruposComunidade(): Promise<
  { id: string; nome: string; linkConvite: string | null }[]
> {
  const config = await getConfig();
  if (!config) return [];

  const res = await fetch(
    `${config.baseUrl}/group/fetchAllGroups/${config.instance}?getParticipants=false`,
    { headers: { apikey: config.apiKey } }
  );
  if (!res.ok) throw new Error(`Evolution API: falha ao listar grupos (${res.status})`);

  const grupos: Array<{ id: string; subject: string; linkedParent?: string }> = await res.json();
  const daComunidade = grupos.filter((g) => g.linkedParent);

  return Promise.all(
    daComunidade.map(async (g) => {
      try {
        const r = await fetch(
          `${config.baseUrl}/group/inviteCode/${config.instance}?groupJid=${g.id}`,
          { headers: { apikey: config.apiKey } }
        );
        if (!r.ok) return { id: g.id, nome: g.subject, linkConvite: null };
        const data: { inviteCode?: string; code?: string } = await r.json();
        const code = data.inviteCode ?? data.code;
        return { id: g.id, nome: g.subject, linkConvite: code ? `https://chat.whatsapp.com/${code}` : null };
      } catch {
        return { id: g.id, nome: g.subject, linkConvite: null };
      }
    })
  );
}

// WhatsApp exige pelo menos 1 participante pra criar grupo — telefone no formato
// internacional sem símbolos (ex: 5511999999999).
export async function criarGrupoWhatsapp(nome: string, telefoneParticipante: string): Promise<GrupoWhatsapp> {
  const config = await getConfig();
  if (!config) throw new Error("Evolution API não configurada");

  const res = await fetch(`${config.baseUrl}/group/create/${config.instance}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ subject: nome, participants: [telefoneParticipante] }),
  });
  if (!res.ok) throw new Error(`Evolution API: falha ao criar grupo (${res.status})`);

  const data: { id: string; subject: string } = await res.json();
  return { id: data.id, nome: data.subject, tamanho: 1 };
}

export async function enviarMensagemGrupo(
  grupoId: string,
  texto: string,
  quotedMsgId?: string,
  mentions?: string[]
): Promise<void> {
  const config = await getConfig();
  if (!config) return;

  const payload: any = { number: grupoId, text: texto };
  
  if (quotedMsgId || (mentions && mentions.length > 0)) {
    payload.options = { linkPreview: false };
    if (quotedMsgId) {
      payload.options.quoted = { key: { id: quotedMsgId } };
    }
    if (mentions && mentions.length > 0) {
      payload.options.mentions = mentions;
      payload.mentions = mentions;
      payload.mentioned = mentions;
    }
  } else {
    payload.options = { linkPreview: false };
  }

  const res = await fetch(`${config.baseUrl}/message/sendText/${config.instance}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Evolution API: falha ao enviar mensagem (${res.status})`);
}

export async function enviarImagemGrupo(
  grupoId: string,
  imagemUrl: string,
  legenda: string,
  mentions?: string[]
): Promise<void> {
  const config = await getConfig();
  if (!config) return;

  // WhatsApp rejeita WebP como imagem normal — convertemos sempre para JPEG via
  // sharp antes de enviar. Isso garante compatibilidade independente do formato
  // do upload original (PNG, WebP, AVIF, etc.).
  const imagem = await prepararImagemParaWhatsApp(imagemUrl);

  const payload: any = {
    number: grupoId,
    mediatype: "image",
    mimetype: imagem.mimetype,
    media: imagem.base64,
    caption: legenda,
    fileName: imagem.fileName,
  };

  if (mentions && mentions.length > 0) {
    payload.options = { mentions };
  }

  const res = await fetch(`${config.baseUrl}/message/sendMedia/${config.instance}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error("Erro detalhado da Evolution API ao enviar imagem de grupo:", errorText);
    throw new Error(`Evolution API: falha ao enviar imagem (${res.status}) - ${errorText}`);
  }
}

// Envia vídeo pro grupo. Diferente da imagem, não passa pelo sharp — manda a URL
// pública direto pro Evolution (mediatype=video), que baixa e reenvia.
export async function enviarVideoGrupo(
  grupoId: string,
  videoUrl: string,
  legenda: string
): Promise<void> {
  const config = await getConfig();
  if (!config) return;

  const res = await fetch(`${config.baseUrl}/message/sendMedia/${config.instance}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      number: grupoId,
      mediatype: "video",
      media: videoUrl,
      caption: legenda,
      fileName: "video.mp4",
    }),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error("Erro Evolution ao enviar vídeo:", errorText);
    throw new Error(`Evolution API: falha ao enviar vídeo (${res.status})`);
  }
}

// Otimização para disparo em massa (ex: Broadcaster) para evitar baixar e
// converter a imagem no Sharp várias vezes (o que causaria timeout na Vercel).
export async function enviarImagemMassa(
  grupoJids: string[],
  imagemUrl: string,
  legenda: string
): Promise<void> {
  const config = await getConfig();
  if (!config || grupoJids.length === 0) return;

  // Baixa e converte a imagem UMA ÚNICA VEZ
  const imagem = await prepararImagemParaWhatsApp(imagemUrl);

  // Dispara para cada grupo sequencialmente usando a mesma imagem em base64
  for (const jid of grupoJids) {
    try {
      const payload: any = {
        number: jid,
        mediatype: "image",
        mimetype: imagem.mimetype,
        media: imagem.base64,
        caption: legenda,
        fileName: imagem.fileName,
      };

      const res = await fetch(`${config.baseUrl}/message/sendMedia/${config.instance}`, {
        method: "POST",
        headers: { apikey: config.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error(`Falha ao enviar imagem para o grupo ${jid}: ${res.status}`);
      }
    } catch (err) {
      console.error(`Erro ao enviar imagem em massa para o grupo ${jid}:`, err);
    }
  }
}

// Igual ao enviarImagemMassa, mas com LEGENDA diferente por grupo (ex: Avisos
// recebe a mensagem com o link do grupo de Pedidos; o Pedidos recebe só o código).
// A imagem é baixada/convertida uma única vez e reaproveitada em todos.
export async function enviarImagemMassaComLegendas(
  itens: { jid: string; legenda: string }[],
  imagemUrl: string
): Promise<void> {
  const config = await getConfig();
  if (!config || itens.length === 0) return;

  const imagem = await prepararImagemParaWhatsApp(imagemUrl);

  for (const { jid, legenda } of itens) {
    try {
      const res = await fetch(`${config.baseUrl}/message/sendMedia/${config.instance}`, {
        method: "POST",
        headers: { apikey: config.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          number: jid,
          mediatype: "image",
          mimetype: imagem.mimetype,
          media: imagem.base64,
          caption: legenda,
          fileName: imagem.fileName,
        }),
      });
      if (!res.ok) console.error(`Falha ao enviar imagem para o grupo ${jid}: ${res.status}`);
    } catch (err) {
      console.error(`Erro ao enviar imagem (legenda própria) para o grupo ${jid}:`, err);
    }
  }
}

// Telefones cadastrados pelo comprador no checkout vêm sem o código do país
// (ex: "22992687004"), formato que basta pra grupo (que usa JID, não telefone)
// mas a Evolution API rejeita com 400 numa mensagem 1:1 — precisa do formato
// internacional completo (ex: "5522992687004"). Sistema é só Brasil, então
// assume DDI 55 quando ausente.
function normalizarTelefoneBR(telefone: string): string {
  const digitos = telefone.replace(/\D/g, "");
  if (digitos.startsWith("55") && digitos.length >= 12) return digitos;
  return `55${digitos}`;
}

// Mensagens 1:1 — mesmos endpoints dos grupos, só troca o destino (telefone em
// vez de JID de grupo).
export async function enviarMensagemIndividual(telefone: string, texto: string): Promise<void> {
  const config = await getConfig();
  if (!config) return;

  const res = await fetch(`${config.baseUrl}/message/sendText/${config.instance}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      number: normalizarTelefoneBR(telefone),
      text: texto,
    }),
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Evolution API: falha ao enviar mensagem individual (${res.status}) - ${errorBody}`);
  }
}

export async function enviarImagemIndividual(telefone: string, imagemUrl: string, legenda: string): Promise<void> {
  const config = await getConfig();
  if (!config) return;

  // Mesmo padrão — converte para JPEG antes de enviar.
  const imagem = await prepararImagemParaWhatsApp(imagemUrl);

  const res = await fetch(`${config.baseUrl}/message/sendMedia/${config.instance}`, {
    method: "POST",
    headers: { apikey: config.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      number: normalizarTelefoneBR(telefone),
      mediatype: "image",
      mimetype: imagem.mimetype,
      media: imagem.base64,
      caption: legenda,
      fileName: imagem.fileName,
    }),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error("Erro detalhado da Evolution API ao enviar imagem individual:", errorText);
    throw new Error(`Evolution API: falha ao enviar imagem individual (${res.status}) - ${errorText}`);
  }
}

export async function getConnectionState(): Promise<{ state: string }> {
  const config = await getConfig();
  if (!config) throw new Error("Configurações da Evolution API não encontradas");

  const res = await fetch(`${config.baseUrl}/instance/connectionState/${config.instance}`, {
    headers: { apikey: config.apiKey },
  });
  if (!res.ok) throw new Error("Falha ao buscar status de conexão");
  const data = await res.json();
  return { state: data.instance?.state || "unknown" };
}

export async function getConnectQrCode(): Promise<{ base64: string | null }> {
  const config = await getConfig();
  if (!config) throw new Error("Configurações da Evolution API não encontradas");

  const res = await fetch(`${config.baseUrl}/instance/connect/${config.instance}`, {
    headers: { apikey: config.apiKey },
  });
  if (!res.ok) throw new Error("Falha ao gerar QR Code");
  const data = await res.json();
  return { base64: data.base64 || null };
}

export async function logoutInstance(): Promise<void> {
  const config = await getConfig();
  if (!config) throw new Error("Configurações da Evolution API não encontradas");

  const res = await fetch(`${config.baseUrl}/instance/logout/${config.instance}`, {
    method: "DELETE",
    headers: { apikey: config.apiKey },
  });
  if (!res.ok) throw new Error("Falha ao desconectar instância");
}
