import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { otimizarAnuncioML } from "@/lib/ml-otimizador";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const descricao = typeof body?.descricao === "string" ? body.descricao.trim() : "";
  const categoria = typeof body?.categoria === "string" ? body.categoria.trim() : "";
  const atributos = typeof body?.atributos === "object" && body?.atributos ? body.atributos : undefined;

  if (!nome || !descricao || !categoria) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Informe nome, descrição e categoria" } },
      { status: 422 }
    );
  }

  try {
    const resultado = await otimizarAnuncioML({ nome, descricao, categoria, atributos });
    return NextResponse.json({ data: resultado });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "IA_ERROR", message: err instanceof Error ? err.message : "Erro ao otimizar com IA" } },
      { status: 502 }
    );
  }
}
