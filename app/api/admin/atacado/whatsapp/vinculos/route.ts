import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Rota leve: retorna só os vínculos do banco, sem chamar Evolution API.
// Usada nos modais de seleção de grupo (não precisa da lista live de grupos).
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const vinculos = await prisma.grupoWhatsappCategoria.findMany({
    select: { categoria: true, grupoId: true, grupoNome: true },
    orderBy: { categoria: "asc" },
  });

  return NextResponse.json({ data: { vinculos } });
}
