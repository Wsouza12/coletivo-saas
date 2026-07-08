import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getConfigStatus, setConfig, CHAVES_CONFIG } from "@/lib/config-app";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  const status = await getConfigStatus();
  return NextResponse.json({ data: { status } });
}

const schema = z.object({
  chave: z.enum(CHAVES_CONFIG),
  valor: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: { code: "VALIDATION" } }, { status: 422 });
  try {
    await setConfig(parsed.data.chave, parsed.data.valor.trim());
    return NextResponse.json({ data: { ok: true } });
  } catch (e) {
    return NextResponse.json({ error: { code: "SAVE_FALHOU", message: e instanceof Error ? e.message : "Erro" } }, { status: 500 });
  }
}
