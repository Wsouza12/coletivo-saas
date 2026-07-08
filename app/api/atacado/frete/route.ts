import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { listarOpcoesFrete } from "@/lib/atacado";

const schema = z.object({
  rodadaId: z.string().min(1),
  cep: z.string().min(8).max(9),
  quantidade: z.number().int().min(1),
});

// Pré-visualização do frete no checkout, antes de confirmar a reserva — mesma
// lógica usada internamente em criarReserva, exposta separada pro usuário ver
// o total antes de preencher o resto do formulário. Recebe rodadaId (não
// produtoId) pra não expor o id interno do produto no checkout público.
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  const rodada = await prisma.rodadaAtacado.findUnique({ where: { id: parsed.data.rodadaId } });
  if (!rodada) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }

  try {
    const opcoes = await listarOpcoesFrete({
      produtoAtacadoId: rodada.produtoAtacadoId,
      cepDestino: parsed.data.cep,
      quantidade: parsed.data.quantidade,
    });
    return NextResponse.json({ data: { opcoes } }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao calcular frete";
    return NextResponse.json({ error: { code: "FRETE_INDISPONIVEL", message } }, { status: 422 });
  }
}
