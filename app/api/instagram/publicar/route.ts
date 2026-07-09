import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicarFotoInstagram } from "@/lib/instagram";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"]/g, '').trim()!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY?.replace(/['"]/g, '').trim()!;
  return createClient(supabaseUrl, supabaseKey);
}

async function uploadTemp(blob: Blob, nome: string): Promise<string> {
  const supabase = getSupabase();
  // Sanitiza a key — Supabase rejeita acento/espaço/parênteses ("Invalid key").
  const ext = (nome.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `instagram-temp/${Date.now()}_${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("produtos").upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  const { data } = supabase.storage.from("produtos").getPublicUrl(path);
  return data.publicUrl;
}

async function deletarTemp(url: string) {
  try {
    const supabase = getSupabase();
    const marker = "/produtos/";
    const idx = url.indexOf(marker);
    if (idx === -1) return;
    const path = url.slice(idx + marker.length);
    await supabase.storage.from("produtos").remove([path]);
  } catch {
    // falha silenciosa — arquivo temporário fica mas não bloqueia o fluxo
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const config = await prisma.configuracaoFinanceira.findFirst({
    select: { instagramAccessToken: true, instagramUserId: true },
  });
  if (!config?.instagramAccessToken || !config.instagramUserId) {
    return NextResponse.json(
      { error: { code: "NAO_CONECTADO", message: "Instagram não conectado. Conecte primeiro em Divulgar Catálogos." } },
      { status: 422 }
    );
  }

  const formData = await req.formData();
  const imagem = formData.get("imagem") as File | null;
  const caption = (formData.get("caption") as string | null) ?? "";
  const formato = ((formData.get("formato") as string | null) ?? "POST") as "POST" | "STORY";

  if (!imagem) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Imagem obrigatória" } }, { status: 422 });
  }

  let tempUrl: string | null = null;
  try {
    tempUrl = await uploadTemp(imagem, imagem.name || "pagina.jpg");

    const postId = await publicarFotoInstagram({
      userId: config.instagramUserId,
      accessToken: config.instagramAccessToken,
      imageUrl: tempUrl,
      caption: formato === "POST" ? caption : undefined,
      formato,
    });

    return NextResponse.json({ data: { postId } }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "PUBLICAR_FALHOU", message: err instanceof Error ? err.message : "Erro ao publicar" } },
      { status: 422 }
    );
  } finally {
    if (tempUrl) await deletarTemp(tempUrl);
  }
}
