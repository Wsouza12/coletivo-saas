import { NextResponse } from "next/server";
import { z } from "zod";
import { criarCompraLista } from "@/lib/lista-fornecedores";

// Público — cria a compra da lista de fornecedores e devolve o Pix.
const schema = z.object({
  compradorNome: z.string().min(2),
  compradorDoc: z.string().min(11),
  compradorTelefone: z.string().min(10),
  compradorEmail: z.string().email().optional().or(z.literal("")),
  tipo: z.enum(["COMPLETA", "CATALOGOS"]).optional(),
  incluiComunidade: z.boolean().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }
  try {
    const r = await criarCompraLista({
      compradorNome: parsed.data.compradorNome,
      compradorDoc: parsed.data.compradorDoc,
      compradorTelefone: parsed.data.compradorTelefone,
      compradorEmail: parsed.data.compradorEmail || undefined,
      tipo: parsed.data.tipo,
      incluiComunidade: parsed.data.incluiComunidade,
    });
    return NextResponse.json({ data: r }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "COMPRA_FALHOU", message: err instanceof Error ? err.message : "Erro" } },
      { status: 422 }
    );
  }
}
