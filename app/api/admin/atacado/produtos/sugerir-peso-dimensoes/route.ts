import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sugerirPesoDimensoes } from "@/lib/groq";

const schema = z.object({ nome: z.string().min(2), categoria: z.string().optional() });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  try {
    const dados = await sugerirPesoDimensoes(parsed.data.nome, parsed.data.categoria);
    return NextResponse.json({ data: dados }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao sugerir peso/dimensões";
    return NextResponse.json({ error: { code: "IA_FALHOU", message } }, { status: 422 });
  }
}
