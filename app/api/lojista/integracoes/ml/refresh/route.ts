import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { refreshMlToken } from "@/lib/mercadolivre";

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const integracao = await prisma.integracao.findUnique({
    where: { lojistaId_plataforma: { lojistaId: session.user.lojistaId, plataforma: "MERCADOLIVRE" } },
  });
  if (!integracao) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Integração Mercado Livre não encontrada" } },
      { status: 404 }
    );
  }

  try {
    const tokens = await refreshMlToken(decrypt(integracao.refreshToken));
    const atualizada = await prisma.integracao.update({
      where: { id: integracao.id },
      data: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        ativa: true,
      },
    });
    return NextResponse.json({ data: { tokenExpiry: atualizada.tokenExpiry } }, { status: 200 });
  } catch (err) {
    console.error("Falha ao renovar token ML manualmente:", err);
    return NextResponse.json(
      { error: { code: "REFRESH_FAILED", message: "Não foi possível renovar o token" } },
      { status: 502 }
    );
  }
}
