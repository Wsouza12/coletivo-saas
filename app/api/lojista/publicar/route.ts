import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishAnuncioSchema } from "@/lib/validations";
import { decrypt, encrypt } from "@/lib/crypto";
import {
  MercadoLivreClient,
  resolverAtributosParaPublicacao,
  categoriaExigeSizeChart,
  obterDomainIdDaCategoria,
  resolverValorAtributoVariacao,
  type MLVariationPayload,
} from "@/lib/mercadolivre";
import { obterOuCriarSizeChart } from "@/lib/ml-size-chart";
import { ShopeeClient } from "@/lib/shopee";
import { checarRateLimit } from "@/lib/rate-limit";
import { analisarFotoCapa } from "@/lib/groq";

const LIMITE_PUBLICACOES_POR_MINUTO = 10;

// O erro do ML vem como "Erro ML (400): {json com cause[].message}" — extrai só
// as mensagens humanas do array "cause" (erros de validação reais, ignorando
// "warning") em vez de devolver o JSON cru pro lojista.
function traduzirErroML(mensagem: string): string {
  const jsonMatch = mensagem.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return mensagem;
  try {
    const data = JSON.parse(jsonMatch[0]) as {
      cause?: { type?: string; message?: string }[];
      message?: string;
    };
    const mensagensErro = (data.cause ?? [])
      .filter((c) => c.type === "error" && c.message)
      .map((c) => c.message as string);
    if (mensagensErro.length > 0) return mensagensErro.join(" / ");
    return data.message ?? mensagem;
  } catch {
    return mensagem;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  if (session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
  }

  const { permitido } = await checarRateLimit(
    "publicar",
    session.user.lojistaId,
    LIMITE_PUBLICACOES_POR_MINUTO
  );
  if (!permitido) {
    return NextResponse.json(
      {
        error: {
          code: "RATE_LIMIT",
          message: `Limite de ${LIMITE_PUBLICACOES_POR_MINUTO} publicações por minuto excedido. Tente novamente em breve.`,
        },
      },
      { status: 429 }
    );
  }

  const parsed = publishAnuncioSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION", message: parsed.error.flatten() } },
      { status: 422 }
    );
  }

  const { produtoId, kitId, plataforma, titulo, precoVenda, freteGratis } = parsed.data;
  const lojistaId = session.user.lojistaId;

  if (kitId) {
    return publicarKit({ kitId, lojistaId, plataforma, titulo, precoVenda, freteGratis });
  }
  if (!produtoId) {
    return NextResponse.json({ error: { code: "VALIDATION", message: "Informe produtoId" } }, { status: 422 });
  }

  const produto = await prisma.produto.findUnique({
    where: { id: produtoId },
    include: {
      imagens: { orderBy: { ordem: "asc" } },
      variacoes: { where: { ativo: true }, orderBy: { ordem: "asc" } },
    },
  });
  if (!produto || !produto.ativo) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Produto não encontrado" } },
      { status: 404 }
    );
  }
  if (produto.estoque <= 0) {
    return NextResponse.json(
      { error: { code: "SEM_ESTOQUE", message: "Produto sem estoque disponível" } },
      { status: 422 }
    );
  }
  if (precoVenda <= Number(produto.precoAtacado)) {
    return NextResponse.json(
      {
        error: {
          code: "PRECO_INVALIDO",
          message: "Preço de venda deve ser maior que o preço de atacado",
        },
      },
      { status: 422 }
    );
  }

  const integracao = await prisma.integracao.findUnique({
    where: { lojistaId_plataforma: { lojistaId, plataforma } },
  });
  if (!integracao || !integracao.ativa) {
    return NextResponse.json(
      {
        error: {
          code: "INTEGRACAO_NAO_CONECTADA",
          message: `Conecte sua conta ${plataforma === "MERCADOLIVRE" ? "Mercado Livre" : "Shopee"} antes de publicar`,
        },
      },
      { status: 409 }
    );
  }

  const existente = await prisma.anuncio.findUnique({
    where: { lojistaId_produtoId_plataforma: { lojistaId, produtoId, plataforma } },
  });
  if (existente && existente.status !== "REMOVIDO" && existente.status !== "ERRO") {
    return NextResponse.json(
      {
        error: {
          code: "ANUNCIO_JA_EXISTE",
          message: "Você já tem um anúncio deste produto nesta plataforma",
          anuncioExistente: existente,
        },
      },
      { status: 409 }
    );
  }

  let plataformaItemId: string | null = null;
  let url: string | null = null;
  // Preenchido só quando a categoria exige size chart — usado depois de salvar o
  // Anuncio (precisa do anuncioId, que só existe após o upsert final) pra criar os
  // registros de AnuncioVariacao com o id real retornado pelo ML por variação.
  let variacoesPublicadas:
    | { produtoVariacaoId: string; plataformaVariationId: string; precoVenda: number }[]
    | undefined;

  try {
    if (plataforma === "MERCADOLIVRE") {
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

      // A categoria é sempre a definida pelo admin no cadastro do produto — nunca
      // adivinhada a partir do título do anúncio (texto editável pelo lojista, sem
      // controle de qualidade). Detectar categoria por um título de marketing já
      // causou anúncio publicado em categoria errada e fechado pelo ML; melhor
      // bloquear e pedir pro admin classificar o produto do que arriscar de novo.
      if (!produto.categoriaMlId) {
        return NextResponse.json(
          {
            error: {
              code: "CATEGORIA_NAO_DEFINIDA",
              message:
                "Este produto ainda não tem categoria do Mercado Livre definida no cadastro. Peça pro admin clicar em \"Detectar categoria\" no cadastro do produto antes de publicar.",
            },
          },
          { status: 422 }
        );
      }
      const categoryId = produto.categoriaMlId;
      const atributosManuais =
        (produto.atributosMl as Record<string, { value_id?: string; value_name?: string }> | null) ?? {};
      const { attributes, faltando } = await resolverAtributosParaPublicacao(
        categoryId,
        atributosManuais,
        produto
      );

      // Bloqueia ANTES de chamar o ML: deixar a API rejeitar devolve um JSON
      // técnico ilegível pro lojista — aqui já sabemos exatamente o que falta
      // e quem (admin, no cadastro do produto) precisa preencher.
      if (faltando.length > 0) {
        return NextResponse.json(
          {
            error: {
              code: "ATRIBUTOS_OBRIGATORIOS_FALTANDO",
              message: `Esta categoria do Mercado Livre exige os seguintes dados, que ainda não foram preenchidos no cadastro do produto: ${faltando.map((f) => f.name).join(", ")}. Peça pro admin completar essas características antes de publicar.`,
              atributosFaltando: faltando,
            },
          },
          { status: 422 }
        );
      }

      // Categorias de roupa com GENDER marcado como grid_template_required exigem
      // variações reais de tamanho com size chart — sem isso o ML rejeita com
      // "Attribute [SIZE_GRID_ID] is missing". Bloqueia antes de tentar, com a mesma
      // lógica de "avisar o que falta" já usada pros atributos obrigatórios.
      const exigeSizeChart = await categoriaExigeSizeChart(categoryId);
      if (exigeSizeChart && (!produto.temVariacoes || produto.variacoes.length === 0)) {
        return NextResponse.json(
          {
            error: {
              code: "VARIACOES_NAO_CADASTRADAS",
              message:
                "Esta categoria do Mercado Livre exige variações reais de tamanho (com medidas) para publicar. Peça pro admin cadastrar os tamanhos do produto antes de publicar.",
            },
          },
          { status: 422 }
        );
      }

      // O ML usa a primeira foto do array como capa do anúncio — a ordem salva
      // no cadastro (drag/ordem) não garante que a "principal" seja a primeira,
      // então reordena aqui pra capa enviada ser sempre a marcada como principal.
      const imagensOrdenadas = [...produto.imagens].sort((a, b) =>
        a.principal === b.principal ? 0 : a.principal ? -1 : 1
      );

      // Checagem best-effort com IA de visão: várias categorias do ML reprovam
      // a revisão de qualidade se a capa não tiver fundo branco/neutro. Falha
      // da própria checagem (rede/quota da IA) não deve travar a publicação —
      // só bloqueia quando a IA respondeu e identificou o problema de fato.
      const capa = imagensOrdenadas[0];
      if (capa) {
        try {
          const analise = await analisarFotoCapa(capa.url);
          if (!analise.fundoAdequado) {
            return NextResponse.json(
              {
                error: {
                  code: "CAPA_FUNDO_INADEQUADO",
                  message: `Foto de capa reprovada pela revisão de qualidade: ${analise.motivo}. Troque a foto principal no cadastro do produto e tente publicar novamente.`,
                },
              },
              { status: 422 }
            );
          }
        } catch (err) {
          console.error("Falha ao analisar foto de capa com IA (não bloqueante):", err);
        }
      }

      let variations: MLVariationPayload[] | undefined;

      if (exigeSizeChart) {
        const domainId = await obterDomainIdDaCategoria(categoryId);
        if (!domainId) {
          return NextResponse.json(
            {
              error: {
                code: "DOMINIO_ML_NAO_ENCONTRADO",
                message: "Não foi possível identificar o domínio ML desta categoria para montar a tabela de medidas.",
              },
            },
            { status: 502 }
          );
        }

        const generoAtributo = atributosManuais.GENDER;
        const rowsByTamanho = await obterOuCriarSizeChart(
          lojistaId,
          produto,
          produto.variacoes,
          client,
          domainId,
          generoAtributo
        );

        variations = await Promise.all(
          produto.variacoes.map(async (v) => {
            const sizeCombo = await resolverValorAtributoVariacao(categoryId, "SIZE", v.tamanho);
            const attributeCombinations = [
              sizeCombo ?? { name: "Tamanho", value_name: v.tamanho },
            ];
            if (v.cor) {
              const corCombo = await resolverValorAtributoVariacao(categoryId, "COLOR", v.cor);
              if (corCombo) attributeCombinations.push(corCombo);
            }

            const rowId = rowsByTamanho[v.tamanho];
            const precoVariacao = precoVenda + Number(v.precoAjuste ?? 0);

            return {
              attribute_combinations: attributeCombinations,
              price: precoVariacao,
              available_quantity: v.estoque,
              attributes: rowId ? [{ id: "SIZE_GRID_ROW_ID", value_name: rowId }] : undefined,
              picture_ids: undefined,
            };
          })
        );
      }

      const item = await client.publishItem({
        title: titulo,
        category_id: categoryId,
        ...(variations
          ? { variations }
          : { price: precoVenda, available_quantity: produto.estoque }),
        currency_id: "BRL",
        listing_type_id: "gold_special",
        condition: "new",
        pictures: imagensOrdenadas.map((img) => ({ source: img.url })),
        shipping: { mode: "me2", free_shipping: freteGratis },
        attributes,
      });
      plataformaItemId = item.id;
      url = item.permalink;

      // Casa cada variação retornada pelo ML com a ProdutoVariacao de origem pelo
      // SIZE da combinação (sempre presente) — guarda pra criar AnuncioVariacao depois
      // do upsert do Anuncio, já que o anuncioId só existe a partir daquele ponto.
      if (variations && item.variations) {
        // Chave composta (tamanho + cor) — casar só pelo tamanho perderia a distinção
        // quando o mesmo tamanho existe em mais de uma cor (ex: Azul/M, Preto/M).
        const porCombo = new Map(produto.variacoes.map((v) => [`${v.tamanho}::${v.cor}`, v]));
        variacoesPublicadas = item.variations
          .map((respVar) => {
            const sizeCombo = respVar.attribute_combinations.find((c) => c.id === "SIZE");
            const corCombo = respVar.attribute_combinations.find((c) => c.id === "COLOR");
            const tamanho = sizeCombo?.value_name;
            if (!tamanho) return null;
            const variacao = porCombo.get(`${tamanho}::${corCombo?.value_name ?? ""}`);
            if (!variacao) return null;
            return {
              produtoVariacaoId: variacao.id,
              plataformaVariationId: String(respVar.id),
              precoVenda: precoVenda + Number(variacao.precoAjuste ?? 0),
            };
          })
          .filter((v): v is NonNullable<typeof v> => v !== null);
      }
    } else {
      const client = new ShopeeClient(
        process.env.SHOPEE_PARTNER_ID ?? "",
        process.env.SHOPEE_PARTNER_KEY ?? "",
        decrypt(integracao.accessToken),
        integracao.accountId
      );

      // TODO: resolver category_id real via Shopee Category API e subir as
      // imagens pelo Media Space antes do add_item — aqui usamos um valor
      // placeholder, então a chamada real só funciona com esses dois passos
      // implementados.
      const item = await client.addItem({
        item_name: titulo,
        description: produto.descricao,
        item_sku: produto.sku,
        weight: Number(produto.pesoKg),
        category_id: 0,
        price_info: [{ currency: "BRL", original_price: precoVenda }],
        stock_info: [{ stock_type: 1, current_stock: produto.estoque }],
        image: { image_id_list: [] },
      });
      plataformaItemId = String(item.item_id);
    }
  } catch (err) {
    const mensagemOriginal = err instanceof Error ? err.message : "Erro desconhecido ao publicar";
    const mensagem = traduzirErroML(mensagemOriginal);
    console.error(`Falha ao publicar anúncio (${plataforma}):`, mensagemOriginal);

    const anuncioErro = existente
      ? await prisma.anuncio.update({
          where: { id: existente.id },
          data: { titulo, precoVenda, status: "ERRO", pausadoPor: mensagem },
        })
      : await prisma.anuncio.create({
          data: { lojistaId, produtoId, plataforma, titulo, precoVenda, status: "ERRO", pausadoPor: mensagem },
        });

    return NextResponse.json(
      {
        error: {
          code: "PUBLICACAO_FALHOU",
          message: `${mensagem} — corrija no cadastro do produto e tente publicar de novo.`,
          anuncio: anuncioErro,
        },
      },
      { status: 502 }
    );
  }

  const anuncio = existente
    ? await prisma.anuncio.update({
        where: { id: existente.id },
        data: {
          titulo,
          precoVenda,
          freteGratis,
          status: "PUBLICADO",
          publicadoEm: new Date(),
          pausadoPor: null,
          plataformaItemId,
          url,
        },
      })
    : await prisma.anuncio.create({
        data: {
          lojistaId,
          produtoId,
          plataforma,
          titulo,
          precoVenda,
          freteGratis,
          status: "PUBLICADO",
          publicadoEm: new Date(),
          plataformaItemId,
          url,
        },
      });

  // Só existe a partir daqui o anuncioId real — republicação (existente) pode ter
  // variações de uma tentativa anterior, então substitui em vez de duplicar.
  if (variacoesPublicadas) {
    await prisma.anuncioVariacao.deleteMany({ where: { anuncioId: anuncio.id } });
    await prisma.anuncioVariacao.createMany({
      data: variacoesPublicadas.map((v) => ({
        anuncioId: anuncio.id,
        produtoVariacaoId: v.produtoVariacaoId,
        plataformaVariationId: v.plataformaVariationId,
        precoVenda: v.precoVenda,
      })),
    });
  }

  return NextResponse.json({ data: anuncio }, { status: 201 });
}

// Publica um Kit (combo de produtos do catálogo num anúncio só). Mais simples que o
// fluxo de produto único: sem variações/size chart (kit não tem tamanho/cor próprio) —
// usa a categoria/atributos do primeiro produto do kit como categoria do anúncio
// combo, prática comum de "kit"/"combo" no ML. Estoque do kit é limitado pelo produto
// que teria menos unidades disponíveis (gargalo da combinação).
async function publicarKit(input: {
  kitId: string;
  lojistaId: string;
  plataforma: "MERCADOLIVRE" | "SHOPEE";
  titulo: string;
  precoVenda: number;
  freteGratis: boolean;
}): Promise<NextResponse> {
  const { kitId, lojistaId, plataforma, titulo, precoVenda, freteGratis } = input;

  const kit = await prisma.kit.findUnique({
    where: { id: kitId },
    include: { itens: { include: { produto: { include: { imagens: { orderBy: { ordem: "asc" } } } } } } },
  });
  if (!kit || kit.lojistaId !== lojistaId || !kit.ativo) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Kit não encontrado" } }, { status: 404 });
  }
  if (kit.itens.some((i) => !i.produto.ativo)) {
    return NextResponse.json(
      {
        error: {
          code: "PRODUTO_INVALIDO",
          message: "Um dos produtos deste kit foi desativado do catálogo — edite o kit antes de publicar",
        },
      },
      { status: 422 }
    );
  }

  const estoqueDisponivel = Math.min(...kit.itens.map((i) => Math.floor(i.produto.estoque / i.quantidade)));
  if (estoqueDisponivel <= 0) {
    return NextResponse.json(
      { error: { code: "SEM_ESTOQUE", message: "Algum produto do kit está sem estoque suficiente" } },
      { status: 422 }
    );
  }

  const precoCusto = kit.itens.reduce(
    (soma, i) => soma + i.quantidade * Number(i.produto.precoAtacado),
    0
  );
  if (precoVenda <= precoCusto) {
    return NextResponse.json(
      {
        error: {
          code: "PRECO_INVALIDO",
          message: `Preço de venda deve ser maior que o custo total do kit (R$${precoCusto.toFixed(2)})`,
        },
      },
      { status: 422 }
    );
  }

  const integracao = await prisma.integracao.findUnique({
    where: { lojistaId_plataforma: { lojistaId, plataforma } },
  });
  if (!integracao || !integracao.ativa) {
    return NextResponse.json(
      {
        error: {
          code: "INTEGRACAO_NAO_CONECTADA",
          message: `Conecte sua conta ${plataforma === "MERCADOLIVRE" ? "Mercado Livre" : "Shopee"} antes de publicar`,
        },
      },
      { status: 409 }
    );
  }

  const existente = await prisma.anuncio.findUnique({
    where: { lojistaId_kitId_plataforma: { lojistaId, kitId, plataforma } },
  });
  if (existente && existente.status !== "REMOVIDO" && existente.status !== "ERRO") {
    return NextResponse.json(
      {
        error: {
          code: "ANUNCIO_JA_EXISTE",
          message: "Você já tem um anúncio deste kit nesta plataforma",
          anuncioExistente: existente,
        },
      },
      { status: 409 }
    );
  }

  const produtoPrincipal = kit.itens[0].produto;
  const descricaoKit =
    `Kit com ${kit.itens.length} produtos:\n` +
    kit.itens.map((i) => `- ${i.quantidade}x ${i.produto.nome}`).join("\n") +
    `\n\n${produtoPrincipal.descricao}`;

  let plataformaItemId: string | null = null;
  let url: string | null = null;

  try {
    if (plataforma === "MERCADOLIVRE") {
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

      if (!produtoPrincipal.categoriaMlId) {
        return NextResponse.json(
          {
            error: {
              code: "CATEGORIA_NAO_DEFINIDA",
              message:
                "O produto principal deste kit ainda não tem categoria do Mercado Livre definida — peça pro admin detectar a categoria dele antes de publicar o kit.",
            },
          },
          { status: 422 }
        );
      }
      const categoryId = produtoPrincipal.categoriaMlId;

      // Kit não tem tamanho/cor próprio — categorias que exigem size chart não fazem
      // sentido pra combo (cada produto do kit teria seu próprio tamanho). Bloqueia
      // em vez de tentar e falhar com erro técnico do ML.
      const exigeSizeChart = await categoriaExigeSizeChart(categoryId);
      if (exigeSizeChart) {
        return NextResponse.json(
          {
            error: {
              code: "CATEGORIA_INCOMPATIVEL_COM_KIT",
              message:
                "A categoria do produto principal deste kit exige tabela de medidas (tamanho/cor) — categorias assim não são compatíveis com anúncio de kit. Escolha outro produto como principal ou publique os produtos separadamente.",
            },
          },
          { status: 422 }
        );
      }

      const atributosManuais =
        (produtoPrincipal.atributosMl as Record<string, { value_id?: string; value_name?: string }> | null) ?? {};
      const { attributes, faltando } = await resolverAtributosParaPublicacao(
        categoryId,
        atributosManuais,
        produtoPrincipal
      );
      if (faltando.length > 0) {
        return NextResponse.json(
          {
            error: {
              code: "ATRIBUTOS_OBRIGATORIOS_FALTANDO",
              message: `O produto principal deste kit precisa destes dados preenchidos no cadastro: ${faltando.map((f) => f.name).join(", ")}.`,
              atributosFaltando: faltando,
            },
          },
          { status: 422 }
        );
      }

      // Anúncio de kit precisa mostrar todos os produtos que compõem a combinação,
      // não só o do primeiro item — senão o comprador só vê um dos produtos na foto.
      // Pega a foto principal de cada produto do kit, máx 12 (limite do ML).
      const imagensOrdenadas = kit.itens
        .flatMap((i) => {
          const ordenadasDoProduto = [...i.produto.imagens].sort((a, b) =>
            a.principal === b.principal ? 0 : a.principal ? -1 : 1
          );
          return ordenadasDoProduto.slice(0, 1);
        })
        .concat(
          kit.itens.flatMap((i) =>
            [...i.produto.imagens].sort((a, b) => (a.principal === b.principal ? 0 : a.principal ? -1 : 1)).slice(1)
          )
        )
        .slice(0, 12);

      const item = await client.publishItem({
        title: titulo,
        category_id: categoryId,
        price: precoVenda,
        available_quantity: estoqueDisponivel,
        currency_id: "BRL",
        listing_type_id: "gold_special",
        condition: "new",
        pictures: imagensOrdenadas.map((img) => ({ source: img.url })),
        shipping: { mode: "me2", free_shipping: freteGratis },
        attributes,
      });
      plataformaItemId = item.id;
      url = item.permalink;
    } else {
      const client = new ShopeeClient(
        process.env.SHOPEE_PARTNER_ID ?? "",
        process.env.SHOPEE_PARTNER_KEY ?? "",
        decrypt(integracao.accessToken),
        integracao.accountId
      );

      const item = await client.addItem({
        item_name: titulo,
        description: descricaoKit,
        item_sku: `KIT-${kit.id.slice(-8)}`,
        weight: kit.itens.reduce((soma, i) => soma + i.quantidade * Number(i.produto.pesoKg), 0),
        category_id: 0,
        price_info: [{ currency: "BRL", original_price: precoVenda }],
        stock_info: [{ stock_type: 1, current_stock: estoqueDisponivel }],
        image: { image_id_list: [] },
      });
      plataformaItemId = String(item.item_id);
    }
  } catch (err) {
    const mensagemOriginal = err instanceof Error ? err.message : "Erro desconhecido ao publicar";
    const mensagem = traduzirErroML(mensagemOriginal);
    console.error(`Falha ao publicar kit (${plataforma}):`, mensagemOriginal);

    const anuncioErro = existente
      ? await prisma.anuncio.update({
          where: { id: existente.id },
          data: { titulo, precoVenda, status: "ERRO", pausadoPor: mensagem },
        })
      : await prisma.anuncio.create({
          data: { lojistaId, kitId, plataforma, titulo, precoVenda, status: "ERRO", pausadoPor: mensagem },
        });

    return NextResponse.json(
      {
        error: {
          code: "PUBLICACAO_FALHOU",
          message: `${mensagem} — corrija e tente publicar de novo.`,
          anuncio: anuncioErro,
        },
      },
      { status: 502 }
    );
  }

  const anuncio = existente
    ? await prisma.anuncio.update({
        where: { id: existente.id },
        data: {
          titulo,
          precoVenda,
          freteGratis,
          status: "PUBLICADO",
          publicadoEm: new Date(),
          pausadoPor: null,
          plataformaItemId,
          url,
        },
      })
    : await prisma.anuncio.create({
        data: {
          lojistaId,
          kitId,
          plataforma,
          titulo,
          precoVenda,
          freteGratis,
          status: "PUBLICADO",
          publicadoEm: new Date(),
          plataformaItemId,
          url,
        },
      });

  return NextResponse.json({ data: anuncio }, { status: 201 });
}
