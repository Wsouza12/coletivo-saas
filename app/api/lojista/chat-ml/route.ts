import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { responderPerguntaML } from "@/lib/groq";

const chatMlSchema = z.object({
  anuncioId: z.string().min(1),
  pergunta: z.string().min(1, "Pergunta é obrigatória"),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const body = await req.json();
  const parsed = chatMlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const anuncio = await prisma.anuncio.findUnique({
    where: { id: parsed.data.anuncioId },
    include: { produto: true },
  });

  if (!anuncio || anuncio.lojistaId !== session.user.lojistaId) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  if (anuncio.plataforma !== "MERCADOLIVRE") {
    return NextResponse.json(
      { error: { code: "INVALID_PLATFORM", message: "Chat automático disponível apenas para anúncios do Mercado Livre" } },
      { status: 422 }
    );
  }
  if (!anuncio.produto) {
    return NextResponse.json(
      { error: { code: "INVALID_PLATFORM", message: "Chat automático ainda não está disponível para anúncios de kit" } },
      { status: 422 }
    );
  }

  const resposta = await responderPerguntaML(parsed.data.pergunta, {
    nome: anuncio.produto.nome,
    descricao: anuncio.produto.descricao,
    atributos: anuncio.produto.atributos as Record<string, string> | undefined,
  });

  return NextResponse.json({ data: { resposta } }, { status: 200 });
}
