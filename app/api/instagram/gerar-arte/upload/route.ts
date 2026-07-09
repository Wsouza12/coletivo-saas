import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const formData = await req.formData();
  const imagem = formData.get("imagem") as File | null;
  if (!imagem) return NextResponse.json({ error: { code: "VALIDATION", message: "Imagem obrigatória" } }, { status: 422 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"]/g, '').trim()!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY?.replace(/['"]/g, '').trim()!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  // Supabase Storage rejeita keys com acento/espaço/parênteses ("Invalid key").
  // Mantém só a extensão do nome original e usa um nome aleatório sanitizado.
  const ext = (imagem.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `instagram-arte/${Date.now()}_${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("produtos").upload(path, imagem, {
    contentType: imagem.type || "image/jpeg",
    upsert: false,
  });
  if (error) return NextResponse.json({ error: { code: "UPLOAD_FALHOU", message: error.message } }, { status: 500 });

  const { data } = supabase.storage.from("produtos").getPublicUrl(path);
  return NextResponse.json({ data: { url: data.publicUrl, path } });
}
