import { NextResponse } from "next/server";
import { z } from "zod";
import { cadastrarCompraPaga, COOKIE_LISTA } from "@/lib/lista-fornecedores";

// Cadastro do comprador DEPOIS do pagamento confirmado. Preenche CPF/nome/telefone
// e loga (cookie) pra acessar a lista.
const schema = z.object({
  compraId: z.string().min(1),
  compradorNome: z.string().min(2),
  compradorDoc: z.string().min(11),
  compradorTelefone: z.string().min(10),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Preencha nome, CPF e WhatsApp." } }, { status: 422 });
  }
  try {
    const compra = await cadastrarCompraPaga(parsed.data);
    const res = NextResponse.json({ data: { ok: true } });
    res.cookies.set(COOKIE_LISTA, compra.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  } catch (err) {
    return NextResponse.json(
      { error: { code: "CADASTRO_FALHOU", message: err instanceof Error ? err.message : "Erro" } },
      { status: 422 }
    );
  }
}
