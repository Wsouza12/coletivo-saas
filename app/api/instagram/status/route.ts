import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renovarToken } from "@/lib/instagram";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const config = await prisma.configuracaoFinanceira.findFirst({
    select: { instagramAccessToken: true, instagramUserId: true, instagramUsername: true, instagramTokenExpiry: true },
  });

  if (!config?.instagramAccessToken || !config.instagramUserId) {
    return NextResponse.json({ data: { conectado: false } });
  }

  // Renovar token se expira em menos de 10 dias
  let token = config.instagramAccessToken;
  if (config.instagramTokenExpiry) {
    const diasRestantes = (config.instagramTokenExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diasRestantes < 10) {
      try {
        const renovado = await renovarToken(token);
        token = renovado.accessToken;
        const cfg = await prisma.configuracaoFinanceira.findFirst();
        if (cfg) {
          await prisma.configuracaoFinanceira.update({
            where: { id: cfg.id },
            data: { instagramAccessToken: renovado.accessToken, instagramTokenExpiry: renovado.expiry },
          });
        }
      } catch {
        // falha silenciosa na renovação — token atual ainda pode funcionar
      }
    }
  }

  return NextResponse.json({
    data: {
      conectado: true,
      username: config.instagramUsername,
      expiry: config.instagramTokenExpiry,
    },
  });
}
