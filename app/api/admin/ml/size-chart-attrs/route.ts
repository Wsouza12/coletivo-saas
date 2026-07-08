import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  MercadoLivreClient,
  categoriaExigeSizeChart,
  obterDomainIdDaCategoria,
} from "@/lib/mercadolivre";

// Dado o category_id já resolvido no cadastro do produto, descobre se essa categoria
// exige size chart (GENDER com grid_template_required) e, se sim, retorna os atributos
// de medida válidos pro domínio (GET /domains/{domain}/technical_specs) — usado pelo
// editor de variações pra renderizar os campos de medida dinamicamente, sem fixar
// nomes de atributo no código (cada domínio de vestuário usa um conjunto diferente).
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId")?.trim();
  if (!categoryId) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Informe categoryId" } },
      { status: 422 }
    );
  }

  try {
    const exigeSizeChart = await categoriaExigeSizeChart(categoryId);
    if (!exigeSizeChart) {
      return NextResponse.json({ data: { exigeSizeChart: false, domainId: null, atributos: [] } });
    }

    const domainId = await obterDomainIdDaCategoria(categoryId);
    if (!domainId) {
      return NextResponse.json({ data: { exigeSizeChart: true, domainId: null, atributos: [] } });
    }

    // Mesma situação de outros endpoints "públicos" do ML: exige token, mas não age em
    // nome de ninguém — usamos qualquer integração ML ativa de algum lojista.
    const integracao = await prisma.integracao.findFirst({
      where: { plataforma: "MERCADOLIVRE", ativa: true },
    });
    if (!integracao) {
      return NextResponse.json(
        {
          error: {
            code: "SEM_INTEGRACAO",
            message:
              "Nenhum lojista tem o Mercado Livre conectado ainda — conecte uma conta ML pra usar a tabela de medidas",
          },
        },
        { status: 422 }
      );
    }

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

    const atributos = await client.getTechnicalSpecsGrids(domainId);

    return NextResponse.json({
      data: {
        exigeSizeChart: true,
        domainId,
        atributos: atributos.map((a) => ({ id: a.id, nome: a.name, tipo: a.value_type })),
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "ML_ERROR",
          message: err instanceof Error ? err.message : "Erro ao consultar a API do Mercado Livre",
        },
      },
      { status: 502 }
    );
  }
}
