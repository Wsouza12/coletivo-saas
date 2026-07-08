import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sugerirPrecoVenda } from "@/lib/groq";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const categoria = typeof body?.categoria === "string" ? body.categoria.trim() : "";
  const custoReal = Number(body?.custoReal);

  if (!nome || !categoria || !custoReal || custoReal <= 0) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Informe nome, categoria e custo real" } },
      { status: 422 }
    );
  }

  try {
    const resultado = await sugerirPrecoVenda({ nome, categoria, custoReal });
    return NextResponse.json({ data: resultado });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "IA_ERROR", message: err instanceof Error ? err.message : "Erro ao sugerir preço" } },
      { status: 502 }
    );
  }
}
