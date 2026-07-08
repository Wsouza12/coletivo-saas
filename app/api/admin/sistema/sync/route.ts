import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sincronizarPedidosExternos } from "@/lib/sync";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const data = await sincronizarPedidosExternos();
  return NextResponse.json({ data }, { status: 200 });
}
