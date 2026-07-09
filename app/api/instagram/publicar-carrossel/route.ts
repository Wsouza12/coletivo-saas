import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicarCarrosselInstagram } from "@/lib/instagram";
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
  const path = `instagram-temp/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
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
    await supabase.storage.from("produtos").remove([url.slice(idx + marker.length)]);
  } catch {}
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
      { error: { code: "NAO_CONECTADO", message: "Instagram não conectado." } },
      { status: 422 }
    );
  }

  const formData = await req.formData();
  const caption = (formData.get("caption") as string | null) ?? "";
  const imagens = formData.getAll("imagens") as File[];

  if (imagens.length === 0) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Nenhuma imagem enviada" } }, { status: 422 });
  }
  if (imagens.length === 1) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Carrossel precisa de pelo menos 2 imagens" } },
      { status: 422 }
    );
  }

  const tempUrls: string[] = [];
  try {
    // Upload de todas as imagens em paralelo
    const uploads = await Promise.all(
      imagens.map((img, i) => uploadTemp(img, `slide_${i + 1}.jpg`))
    );
    tempUrls.push(...uploads);

    const postId = await publicarCarrosselInstagram({
      userId: config.instagramUserId,
      accessToken: config.instagramAccessToken,
      imageUrls: tempUrls,
      caption: caption || undefined,
    });

    return NextResponse.json({ data: { postId, slides: tempUrls.length } }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "PUBLICAR_FALHOU", message: err instanceof Error ? err.message : "Erro ao publicar carrossel" } },
      { status: 422 }
    );
  } finally {
    await Promise.all(tempUrls.map(deletarTemp));
  }
}
