import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buscarNcm } from "@/lib/ncm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const resultados = await buscarNcm(q);

  return NextResponse.json({ data: resultados });
}
