import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFinanceiroResumo } from "@/lib/financeiro";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const resumo = await getFinanceiroResumo();
  return NextResponse.json({ data: resumo }, { status: 200 });
}
