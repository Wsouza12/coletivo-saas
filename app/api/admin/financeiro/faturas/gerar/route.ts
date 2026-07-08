import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { gerarFaturasDoPeriodo } from "@/lib/financeiro";

const schema = z.object({
  periodoInicio: z.coerce.date(),
  periodoFim: z.coerce.date(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const faturas = await gerarFaturasDoPeriodo(parsed.data.periodoInicio, parsed.data.periodoFim);

  return NextResponse.json({ data: { faturas, total: faturas.length } }, { status: 201 });
}
