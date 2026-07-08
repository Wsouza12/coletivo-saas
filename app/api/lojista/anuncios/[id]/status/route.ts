import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { MercadoLivreClient } from "@/lib/mercadolivre";
import { ShopeeClient } from "@/lib/shopee";

const schema = z.object({
  status: z.enum(["PUBLICADO", "PAUSADO", "REMOVIDO"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const anuncio = await prisma.anuncio.findFirst({
    where: { id, lojistaId: session.user.lojistaId },
  });
  if (!anuncio) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Anúncio não encontrado" } },
      { status: 404 }
    );
  }

  if (anuncio.plataformaItemId) {
    try {
      const integracao = await prisma.integracao.findUnique({
        where: {
          lojistaId_plataforma: { lojistaId: session.user.lojistaId, plataforma: anuncio.plataforma },
        },
      });

      if (integracao?.ativa) {
        if (anuncio.plataforma === "MERCADOLIVRE") {
          const client = new MercadoLivreClient(decrypt(integracao.accessToken), {
            refreshToken: decrypt(integracao.refreshToken),
            onRefresh: async (tokens) => {
              await prisma.integracao.update({
                where: { id: integracao.id },
                data: {
                  accessToken: encrypt(tokens.access_token),
                  refreshToken: encrypt(tokens.refresh_token),
                  tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
                },
              });
            },
          });
          // ML não tem "remover" via essa API simples — pausar é o mais
          // próximo disponível também para REMOVIDO.
          if (parsed.data.status === "PUBLICADO") await client.activateItem(anuncio.plataformaItemId);
          else await client.pauseItem(anuncio.plataformaItemId);
        } else {
          const client = new ShopeeClient(
            process.env.SHOPEE_PARTNER_ID ?? "",
            process.env.SHOPEE_PARTNER_KEY ?? "",
            decrypt(integracao.accessToken),
            integracao.accountId
          );
          // Shopee só expõe unlist nesta API — "reativar" (relist) não está
          // disponível no wrapper atual.
          if (parsed.data.status !== "PUBLICADO") {
            await client.unlistItem(Number(anuncio.plataformaItemId));
          }
        }
      }
    } catch (err) {
      console.error(`Falha ao sincronizar status do anúncio ${id} na plataforma:`, err);
    }
  }

  const atualizado = await prisma.anuncio.update({
    where: { id },
    data: {
      status: parsed.data.status,
      pausadoPor: parsed.data.status === "PAUSADO" ? "Pausado pelo lojista" : null,
    },
  });

  return NextResponse.json({ data: atualizado }, { status: 200 });
}
