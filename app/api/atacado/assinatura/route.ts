import { NextResponse } from "next/server";
import { iniciarAssinaturaAtacadoSchema } from "@/lib/validations";
import { iniciarAssinatura, verificarAssinatura } from "@/lib/atacado";

// Checa se o CPF/CNPJ informado já tem assinatura ativa — usado pelo checkout
// público antes de liberar o botão de reservar.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doc = searchParams.get("doc");
  if (!doc) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "doc é obrigatório" } }, { status: 422 });
  }

  const [resultado, config] = await Promise.all([
    verificarAssinatura(doc),
    import("@/lib/prisma").then(m => m.prisma.configuracaoFinanceira.findFirst())
  ]);

  return NextResponse.json({
    data: {
      ...resultado,
      taxaServicoAssinanteAtacado: Number(config?.taxaServicoAssinanteAtacado ?? 10)
    }
  }, { status: 200 });
}

// Inicia (ou reaproveita) a assinatura mensal e devolve o link de pagamento Pix/MP.
export async function POST(req: Request) {
  const parsed = iniciarAssinaturaAtacadoSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION", message: parsed.error.flatten() } }, { status: 422 });
  }

  try {
    const resultado = await iniciarAssinatura(parsed.data);
    return NextResponse.json({ data: resultado }, { status: 201 });
  } catch (err) {
    console.error("Falha ao iniciar assinatura de atacado:", err);
    return NextResponse.json({ error: { code: "INTERNAL" } }, { status: 500 });
  }
}
