// Wrapper para Instagram Platform API (nova — Login do Instagram)
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login

// Instagram App (diferente do Facebook App)
const IG_APP_ID = process.env.INSTAGRAM_APP_ID!;
const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET!;
const REDIRECT_URI = process.env.META_REDIRECT_URI!;
const GRAPH = "https://graph.instagram.com";

export function getInstagramAuthUrl(): string {
  const params = new URLSearchParams({
    force_reauth: "true",
    client_id: IG_APP_ID,
    redirect_uri: REDIRECT_URI,
    scope: "instagram_business_basic,instagram_business_content_publish",
    response_type: "code",
  });
  return `https://api.instagram.com/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  userId: string;
  username: string;
  expiry: Date;
}> {
  // 1. Short-lived token via Instagram OAuth
  const body = new URLSearchParams({
    client_id: IG_APP_ID,
    client_secret: IG_APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
    code,
  });
  const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
  });
  const shortJson = await shortRes.json();
  if (!shortRes.ok || !shortJson.access_token) {
    throw new Error(shortJson.error_message ?? shortJson.error?.message ?? "Falha ao obter token do Instagram");
  }

  // 2. Long-lived token (60 dias)
  const longRes = await fetch(
    `${GRAPH}/access_token?grant_type=ig_exchange_token&client_id=${IG_APP_ID}&client_secret=${IG_APP_SECRET}&access_token=${shortJson.access_token}`
  );
  const longJson = await longRes.json();
  if (!longRes.ok || !longJson.access_token) {
    throw new Error("Falha ao obter token de longa duração");
  }

  // 3. Buscar ID e username do usuário Instagram
  const meRes = await fetch(`${GRAPH}/me?fields=id,username&access_token=${longJson.access_token}`);
  const meJson = await meRes.json();
  if (!meJson.id) {
    throw new Error("Não foi possível obter dados da conta Instagram");
  }

  const expiry = new Date(Date.now() + (longJson.expires_in ?? 5184000) * 1000);

  return {
    accessToken: longJson.access_token,
    userId: meJson.id,
    username: meJson.username ?? "",
    expiry,
  };
}

export async function renovarToken(accessToken: string): Promise<{ accessToken: string; expiry: Date }> {
  const res = await fetch(`${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`);
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error("Falha ao renovar token");
  return {
    accessToken: json.access_token,
    expiry: new Date(Date.now() + (json.expires_in ?? 5184000) * 1000),
  };
}

type FormatoInstagram = "POST" | "STORY" | "REELS";

export async function publicarFotoInstagram({
  userId,
  accessToken,
  imageUrl,
  caption,
  formato,
}: {
  userId: string;
  accessToken: string;
  imageUrl: string;
  caption?: string;
  formato: FormatoInstagram;
}): Promise<string> {
  // Para STORY e REELS, usa media_type=IMAGE com is_stories=true / media_type=REELS
  const mediaParams: Record<string, string> = {
    access_token: accessToken,
    image_url: imageUrl,
  };

  if (formato === "STORY") {
    mediaParams.media_type = "STORIES";
  } else {
    if (caption) mediaParams.caption = caption;
    mediaParams.media_type = "IMAGE";
  }

  // 1. Criar container de mídia (nova API usa graph.instagram.com)
  const containerRes = await fetch(`${GRAPH}/v21.0/${userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mediaParams),
  });
  const containerJson = await containerRes.json();
  if (!containerRes.ok || !containerJson.id) {
    throw new Error(containerJson.error?.message ?? "Falha ao criar container de mídia no Instagram");
  }

  // 2. Aguardar processamento (Instagram precisa de ~1-2s)
  await new Promise((r) => setTimeout(r, 2000));

  // 3. Publicar
  const publishRes = await fetch(`${GRAPH}/v21.0/${userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: containerJson.id, access_token: accessToken }),
  });
  const publishJson = await publishRes.json();
  if (!publishRes.ok || !publishJson.id) {
    throw new Error(publishJson.error?.message ?? "Falha ao publicar no Instagram");
  }

  return publishJson.id;
}

export async function publicarCarrosselInstagram({
  userId,
  accessToken,
  imageUrls,
  caption,
}: {
  userId: string;
  accessToken: string;
  imageUrls: string[]; // máx 10
  caption?: string;
}): Promise<string> {
  // 1. Criar container filho para cada imagem
  const childIds: string[] = [];
  for (const imageUrl of imageUrls.slice(0, 10)) {
    const res = await fetch(`${GRAPH}/v21.0/${userId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: accessToken,
        image_url: imageUrl,
        media_type: "IMAGE",
        is_carousel_item: "true",
      }),
    });
    const json = await res.json();
    if (!res.ok || !json.id) throw new Error(json.error?.message ?? "Falha ao criar item do carrossel");
    childIds.push(json.id);
  }

  // 2. Criar container do carrossel
  const carouselRes = await fetch(`${GRAPH}/v21.0/${userId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      media_type: "CAROUSEL",
      children: childIds.join(","),
      ...(caption ? { caption } : {}),
    }),
  });
  const carouselJson = await carouselRes.json();
  if (!carouselRes.ok || !carouselJson.id) {
    throw new Error(carouselJson.error?.message ?? "Falha ao criar carrossel");
  }

  // 3. Aguardar processamento
  await new Promise((r) => setTimeout(r, 3000));

  // 4. Publicar
  const publishRes = await fetch(`${GRAPH}/v21.0/${userId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ creation_id: carouselJson.id, access_token: accessToken }),
  });
  const publishJson = await publishRes.json();
  if (!publishRes.ok || !publishJson.id) {
    throw new Error(publishJson.error?.message ?? "Falha ao publicar carrossel");
  }

  return publishJson.id;
}
