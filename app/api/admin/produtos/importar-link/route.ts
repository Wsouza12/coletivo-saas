import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buscarPaginaProduto } from "@/lib/scraper";
import { extrairDadosProdutoDeConteudo, extrairDadosProdutoDeNome } from "@/lib/groq";

// Preenchimento por IA a partir de um link (ML, Shopee, Alibaba, AliExpress) ou,
// quando não há link, a partir só do nome do produto — melhor esforço: funciona
// bem em sites com meta tags de preview, pode falhar em sites com proteção
// anti-bot forte. NCM/categoria voltam sempre como sugestão.
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
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";

  if (!url && !nome) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Informe um link ou o nome do produto" } },
      { status: 422 }
    );
  }
  if (url && !/^https?:\/\//i.test(url)) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: "Link inválido" } },
      { status: 422 }
    );
  }

  try {
    if (url) {
      const pagina = await buscarPaginaProduto(url);
      const dados = await extrairDadosProdutoDeConteudo(pagina);
      // GTIN extraído por regex+checksum da página é mais confiável que o que a
      // IA "lê" do texto — prevalece sobre o valor da IA quando encontrado.
      const gtin = pagina.gtinDetectado ?? dados.gtin;
      return NextResponse.json({ data: { ...dados, gtin, imagens: pagina.imagens } });
    }

    const dados = await extrairDadosProdutoDeNome(nome);
    return NextResponse.json({ data: { ...dados, imagens: [] } });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "IMPORT_ERROR",
          message:
            err instanceof Error
              ? err.message
              : "Não foi possível importar dados deste produto",
        },
      },
      { status: 502 }
    );
  }
}
