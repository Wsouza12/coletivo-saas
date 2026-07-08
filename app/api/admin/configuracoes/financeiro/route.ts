import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { configuracaoFinanceiraSchema } from "@/lib/validations";
import { getConfiguracaoFinanceira, updateConfiguracaoFinanceira } from "@/lib/configuracao-financeira";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const config = await getConfiguracaoFinanceira();
  return NextResponse.json({ data: config }, { status: 200 });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const parsed = configuracaoFinanceiraSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const config = await updateConfiguracaoFinanceira(parsed.data);
  return NextResponse.json({ data: config }, { status: 200 });
}
