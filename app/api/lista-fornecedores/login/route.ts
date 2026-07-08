import { NextResponse } from "next/server";
import { z } from "zod";
import { autenticarCompra, COOKIE_LISTA } from "@/lib/lista-fornecedores";

// Login por CPF + telefone — sem link. Seta cookie de sessão e o /minha-lista lê.
const schema = z.object({
  compradorDoc: z.string().min(11),
  compradorTelefone: z.string().min(10),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION" } }, { status: 422 });
  }
  const compra = await autenticarCompra(parsed.data.compradorDoc, parsed.data.compradorTelefone);
  if (!compra) {
    return NextResponse.json({ error: { code: "NAO_ENCONTRADO", message: "Nenhuma compra paga encontrada com esse CPF + telefone." } }, { status: 404 });
  }
  const res = NextResponse.json({ data: { ok: true } });
  res.cookies.set(COOKIE_LISTA, compra.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
