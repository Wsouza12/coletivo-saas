import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buscarProdutosCosmos, consultarGtinCosmos } from "@/lib/cosmos";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const gtin = typeof body?.gtin === "string" ? body.gtin.trim() : "";
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!gtin && !query) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Informe o GTIN/EAN ou o nome do produto" } },
      { status: 422 }
    );
  }

  try {
    if (gtin) {
      const produto = await consultarGtinCosmos(gtin);
      return NextResponse.json({ data: { produto } });
    }
    const candidatos = await buscarProdutosCosmos(query);
    return NextResponse.json({ data: { candidatos } });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "GTIN_NAO_ENCONTRADO", message: err instanceof Error ? err.message : "Erro ao consultar Cosmos" } },
      { status: 502 }
    );
  }
}
