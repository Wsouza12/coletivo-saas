import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { descobrirCandidatosCategoriaML, getAtributosObrigatoriosML } from "@/lib/mercadolivre";
import { sugerirVariacoesBuscaCategoriaML } from "@/lib/groq";

// Busca até 3 categorias reais candidatas do ML pro título informado (nunca aplica
// direto) — a IA só sugere variações de busca mais genéricas pra cobrir o caso onde o
// título de marketing completo confunde a busca literal do ML (ex: "Creatina Gummies"
// cai em "Suplementos para Cavalos"); o admin escolhe entre os resultados REAIS.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim() : "";
  if (!titulo) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Informe o título do produto" } },
      { status: 422 }
    );
  }

  try {
    let variacoesBusca: string[] = [];
    try {
      variacoesBusca = await sugerirVariacoesBuscaCategoriaML(titulo);
    } catch (err) {
      // Falha da IA (quota/rede) não deve travar a busca — segue só com o título original.
      console.error("Falha ao sugerir variações de busca com IA (não bloqueante):", err);
    }

    const candidatos = await descobrirCandidatosCategoriaML(titulo, variacoesBusca);
    if (candidatos.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "ML_ERROR",
            message: "Nenhuma categoria encontrada para esse título — tente um título mais simples",
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: { candidatos } });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "ML_ERROR", message: err instanceof Error ? err.message : "Erro ao consultar ML" } },
      { status: 502 }
    );
  }
}

// Dado um categoryId já confirmado pelo admin, devolve os atributos obrigatórios
// dessa categoria pra montar o formulário dinâmico no cadastro do produto.
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const categoryId = typeof body?.categoryId === "string" ? body.categoryId.trim() : "";
  if (!categoryId) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Informe o categoryId" } },
      { status: 422 }
    );
  }

  try {
    const atributos = await getAtributosObrigatoriosML(categoryId);
    return NextResponse.json({
      data: {
        atributos: atributos.map((a) => ({
          id: a.id,
          nome: a.name,
          tipo: a.value_type,
          valores: a.values?.map((v) => ({ id: v.id, nome: v.name })) ?? null,
        })),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "ML_ERROR", message: err instanceof Error ? err.message : "Erro ao consultar ML" } },
      { status: 502 }
    );
  }
}
