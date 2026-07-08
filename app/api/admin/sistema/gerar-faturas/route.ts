import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executarGeracaoQuinzenal } from "@/lib/financeiro";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const faturas = await executarGeracaoQuinzenal();
  return NextResponse.json({ data: { geradas: faturas.length } }, { status: 200 });
}
