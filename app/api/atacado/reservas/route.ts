import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { criarReservaAtacadoSchema } from "@/lib/validations";
import { verificarAssinatura, criarReserva } from "@/lib/atacado";
import { COOKIE_ORIGEM } from "@/lib/origem";

// Reserva numa rodada — bloqueada por assinatura ativa. O checkout público já
// verifica isso antes de mostrar o formulário, mas a checagem real (que
// importa de verdade) acontece aqui de novo, no servidor. Dados do comprador
// (nome/email/telefone) vêm da assinatura já cadastrada, não são reenviados.
export async function POST(req: Request) {
  const parsed = criarReservaAtacadoSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  const config = await prisma.configuracaoFinanceira.findFirst();
  const exigirAssinatura = config?.exigirAssinaturaAtacado ?? true;

  let assinaturaId: string | undefined;

  const { ativa, assinaturaId: id } = await verificarAssinatura(parsed.data.compradorDoc);

  if (ativa && id) {
    assinaturaId = id;
  } else if (exigirAssinatura) {
    return NextResponse.json(
      {
        error: {
          code: "SEM_ASSINATURA_ATIVA",
          message: "Você não faz parte do grupo de compras coletivas. Assine pra poder reservar.",
        },
      },
      { status: 403 }
    );
  }

  const origem = (await cookies()).get(COOKIE_ORIGEM)?.value || undefined;

  try {
    const resultado = await criarReserva({
      rodadaId: parsed.data.rodadaId,
      assinaturaId,
      quantidade: parsed.data.quantidade,
      variacoes: parsed.data.variacoes,
      compradorNome: parsed.data.compradorNome,
      compradorDoc: parsed.data.compradorDoc,
      compradorEmail: "sem-email@dropsync.com.br", // campo obrigatório no DB, mas não no novo fluxo UI
      compradorTelefone: parsed.data.compradorTelefone,
      cep: parsed.data.cep,
      enderecoEntrega: parsed.data.enderecoEntrega,
      opcaoFreteId: parsed.data.opcaoFreteId,
      origem,
    });
    return NextResponse.json({ data: resultado }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao criar reserva";
    return NextResponse.json({ error: { code: "RESERVA_FALHOU", message } }, { status: 422 });
  }
}
