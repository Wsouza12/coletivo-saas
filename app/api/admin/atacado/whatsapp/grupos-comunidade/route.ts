import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { listarGruposComunidade } from "@/lib/evolution";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  try {
    const grupos = await listarGruposComunidade();
    return NextResponse.json({ data: grupos }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao listar grupos da comunidade";
    return NextResponse.json({ error: { code: "EVOLUTION_FALHOU", message } }, { status: 502 });
  }
}
