import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gerarTituloDescricaoKit } from "@/lib/groq";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.lojistaId) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const produtos = Array.isArray(body?.produtos) ? body.produtos : [];
  const produtosValidos = produtos.filter(
    (p: unknown): p is { nome: string; quantidade: number } =>
      !!p &&
      typeof p === "object" &&
      typeof (p as { nome?: unknown }).nome === "string" &&
      typeof (p as { quantidade?: unknown }).quantidade === "number"
  );

  if (produtosValidos.length < 2) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Informe pelo menos 2 produtos do kit" } },
      { status: 422 }
    );
  }

  try {
    const resultado = await gerarTituloDescricaoKit(produtosValidos);
    return NextResponse.json({ data: resultado });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "IA_ERROR", message: err instanceof Error ? err.message : "Erro ao gerar com IA" } },
      { status: 502 }
    );
  }
}
