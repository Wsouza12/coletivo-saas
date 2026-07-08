import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gerarConteudoInstagram } from "@/lib/groq";
import { z } from "zod";

const schema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  marca: z.string().optional().nullable(),
  precoVendaSugerido: z.number().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  try {
    const resultado = await gerarConteudoInstagram(parsed.data);
    return NextResponse.json({ data: resultado }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "GROQ_FALHOU", message: err instanceof Error ? err.message : "Erro ao gerar conteúdo" } },
      { status: 500 }
    );
  }
}
