import { NextResponse } from "next/server";
import { z } from "zod";
import { listarOpcoesFrete } from "@/lib/atacado";

const schema = z.object({
  produtoAtacadoId: z.string().min(1),
  cep: z.string().min(8).max(9),
  quantidade: z.coerce.number().int().min(1).max(100000).default(1),
});

// Estimativa de frete por quantidade, direto na vitrine pública — usada no
// modal de detalhes de produtos que ainda não têm rodada aberta (sem
// rodadaId pra resolver o frete pelo fluxo normal do checkout).
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  try {
    const opcoes = await listarOpcoesFrete({
      produtoAtacadoId: parsed.data.produtoAtacadoId,
      cepDestino: parsed.data.cep,
      quantidade: parsed.data.quantidade,
    });
    return NextResponse.json({ data: { opcoes } }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao calcular frete";
    return NextResponse.json({ error: { code: "FRETE_INDISPONIVEL", message } }, { status: 422 });
  }
}
