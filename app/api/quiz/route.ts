import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const quizSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  telefone: z.string().min(10, 'Telefone inválido'),
  vendeMarketplace: z.boolean(),
  desafioPrincipal: z.string().optional(),
  metaFaturamento: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = quizSchema.parse(body);

    const lead = await prisma.leadQuiz.create({
      data: {
        nome: data.nome,
        telefone: data.telefone,
        vendeMarketplace: data.vendeMarketplace,
        desafioPrincipal: data.desafioPrincipal,
        metaFaturamento: data.metaFaturamento,
        entrouNoGrupo: false, // Inicia como falso, pode ser atualizado se clicar no link
      },
    });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (error: any) {
    console.error('[QUIZ_ERROR]', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: error.flatten() } },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erro ao salvar lead do quiz' } },
      { status: 500 }
    );
  }
}
