import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { extrairItemIdML, MercadoLivreClient } from "@/lib/mercadolivre";

// Clona dados públicos de um anúncio/produto do Mercado Livre (API oficial) pra
// pré-preencher o cadastro de produto — admin revisa/ajusta antes de salvar.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Informe o link do anúncio" } },
      { status: 422 }
    );
  }

  // A API do ML exige um access_token válido mesmo pra dados públicos — usamos
  // qualquer integração ativa (a leitura não age em nome de ninguém).
  const integracao = await prisma.integracao.findFirst({
    where: { plataforma: "MERCADOLIVRE", ativa: true },
  });
  if (!integracao) {
    return NextResponse.json(
      {
        error: {
          code: "SEM_INTEGRACAO",
          message: "Nenhum lojista tem o Mercado Livre conectado ainda — conecte uma conta ML pra usar a importação",
        },
      },
      { status: 422 }
    );
  }

  try {
    const { id, tipo } = extrairItemIdML(url);

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

    const [item, descricao] = await Promise.all([
      tipo === "produto" ? client.getProdutoCatalogo(id) : client.getItemPublico(id),
      tipo === "item" ? client.getDescricaoItem(id) : Promise.resolve(""),
    ]);

    const marca = item.attributes.find((a) => a.id === "BRAND")?.value_name ?? "";
    const atributosMl = Object.fromEntries(
      item.attributes
        .filter((a) => a.id !== "BRAND" && (a.value_id || a.value_name))
        .map((a) => [a.id, { value_id: a.value_id ?? undefined, value_name: a.value_name ?? undefined }])
    );

    return NextResponse.json({
      data: {
        nome: item.title,
        descricao: descricao || item.title,
        categoriaMlId: item.category_id,
        marca,
        atributosMl,
        imagens: item.pictures.map((p) => p.secure_url || p.url),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: { code: "ML_ERROR", message: err instanceof Error ? err.message : "Erro ao importar do ML" } },
      { status: 502 }
    );
  }
}
