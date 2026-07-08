import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { criarGrupoWhatsapp } from "@/lib/evolution";

const schema = z.object({
  nome: z.string().min(1),
  telefone: z.string().min(8),
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
    const grupo = await criarGrupoWhatsapp(parsed.data.nome, parsed.data.telefone.replace(/\D/g, ""));
    return NextResponse.json({ data: grupo }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "CRIAR_GRUPO_FALHOU", message: err instanceof Error ? err.message : "Erro ao criar grupo" } },
      { status: 422 }
    );
  }
}
