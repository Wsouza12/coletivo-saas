import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { MercadoLivreClient } from "@/lib/mercadolivre";
import { ShopeeClient } from "@/lib/shopee";
import { criarNotificacao, criarNotificacaoBroadcastLojistas } from "@/lib/notificacoes-internas";

// Quando o estoque de um produto zera, pausa automaticamente todos os
// anúncios PUBLICADOs vinculados a ele (em qualquer lojista) — evita venda
// sem estoque disponível. Melhor-esforço por anúncio: a falha de pausar um
// não impede os demais nem a notificação. Também avisa TODOS os lojistas
// ativos (não só quem já tem anúncio publicado) — útil pra quem está de olho
// nesse produto pra publicar e ainda não publicou.
export async function pausarAnunciosPorEstoqueZerado(produtoId: string): Promise<void> {
  const produto = await prisma.produto.findUnique({ where: { id: produtoId }, select: { nome: true, sku: true } });
  if (!produto) return;

  const anuncios = await prisma.anuncio.findMany({
    where: { produtoId, status: "PUBLICADO" },
    include: { produto: true, lojista: true },
  });

  // Sem anúncio PUBLICADO pra pausar = ou ninguém publicou ainda, ou esse
  // produto já zerou e foi pausado antes (próximo pedido pro mesmo produto
  // zerado chamaria essa função de novo). Nos dois casos não há nada de novo
  // pra avisar — sem esse corte, a notificação de "estoque zerado" repetia a
  // cada novo pedido do mesmo produto já esgotado.
  if (anuncios.length === 0) return;

  await criarNotificacaoBroadcastLojistas({
    tipo: "ESTOQUE_ZERADO",
    titulo: "Estoque zerado no catálogo",
    mensagem: `O produto "${produto.nome}" (SKU ${produto.sku}) ficou sem estoque — anúncios publicados dele foram pausados automaticamente.`,
    link: "/catalogo",
  });

  for (const anuncio of anuncios) {
    try {
      const integracao = await prisma.integracao.findUnique({
        where: { lojistaId_plataforma: { lojistaId: anuncio.lojistaId, plataforma: anuncio.plataforma } },
      });

      if (integracao?.ativa && anuncio.plataformaItemId) {
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
          await client.pauseItem(anuncio.plataformaItemId);
        } else {
          const client = new ShopeeClient(
            process.env.SHOPEE_PARTNER_ID ?? "",
            process.env.SHOPEE_PARTNER_KEY ?? "",
            decrypt(integracao.accessToken),
            integracao.accountId
          );
          await client.unlistItem(Number(anuncio.plataformaItemId));
        }
      }

      await prisma.anuncio.update({
        where: { id: anuncio.id },
        data: { status: "PAUSADO", pausadoPor: "Estoque zerado (automático)" },
      });

      await criarNotificacao({
        destinatario: "LOJISTA",
        lojistaId: anuncio.lojistaId,
        tipo: "ANUNCIO_PAUSADO_AUTOMATICO",
        titulo: "Anúncio pausado por falta de estoque",
        mensagem: `"${anuncio.titulo}" foi pausado automaticamente porque o estoque de ${anuncio.produto?.nome} zerou.`,
        link: "/meus-anuncios",
      });
    } catch (err) {
      console.error(`Falha ao pausar anúncio ${anuncio.id} por estoque zerado:`, err);
    }
  }

  await criarNotificacao({
    destinatario: "ADMIN",
    tipo: "ESTOQUE_ZERADO",
    titulo: "Estoque zerado",
    mensagem: `O produto "${anuncios[0].produto?.nome}" zerou o estoque — ${anuncios.length} anúncio(s) pausado(s) automaticamente.`,
    link: "/admin/produtos",
  });
}

// Kit não tem estoque próprio — a quantidade disponível dele é o gargalo dos
// produtos que o compõem (min de estoque/quantidade entre os itens). Por isso,
// sempre que o estoque de QUALQUER produto muda, precisa checar todo kit que o
// usa: mesmo que o produto em si ainda tenha estoque, pode não ser suficiente
// pra montar o kit (ex: kit usa 2un e só resta 1). Diferente de
// pausarAnunciosPorEstoqueZerado, não exige produto.estoque === 0.
export async function pausarKitsPorProdutoComEstoqueInsuficiente(produtoId: string): Promise<void> {
  const kitItens = await prisma.kitItem.findMany({
    where: { produtoId },
    include: {
      kit: {
        include: { itens: { include: { produto: { select: { estoque: true } } } } },
      },
    },
  });

  for (const { kit } of kitItens) {
    if (!kit.ativo) continue;
    const estoqueDisponivel = Math.min(...kit.itens.map((i) => Math.floor(i.produto.estoque / i.quantidade)));
    if (estoqueDisponivel > 0) continue;

    const anuncios = await prisma.anuncio.findMany({
      where: { kitId: kit.id, status: "PUBLICADO" },
    });

    for (const anuncio of anuncios) {
      try {
        const integracao = await prisma.integracao.findUnique({
          where: { lojistaId_plataforma: { lojistaId: anuncio.lojistaId, plataforma: anuncio.plataforma } },
        });

        if (integracao?.ativa && anuncio.plataformaItemId) {
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
            await client.pauseItem(anuncio.plataformaItemId);
          } else {
            const client = new ShopeeClient(
              process.env.SHOPEE_PARTNER_ID ?? "",
              process.env.SHOPEE_PARTNER_KEY ?? "",
              decrypt(integracao.accessToken),
              integracao.accountId
            );
            await client.unlistItem(Number(anuncio.plataformaItemId));
          }
        }

        await prisma.anuncio.update({
          where: { id: anuncio.id },
          data: { status: "PAUSADO", pausadoPor: "Estoque insuficiente pra montar o kit (automático)" },
        });

        await criarNotificacao({
          destinatario: "LOJISTA",
          lojistaId: anuncio.lojistaId,
          tipo: "ANUNCIO_PAUSADO_AUTOMATICO",
          titulo: "Kit pausado por falta de estoque",
          mensagem: `"${anuncio.titulo}" foi pausado automaticamente porque um dos produtos do kit "${kit.nome}" ficou sem estoque suficiente pra montar a combinação.`,
          link: "/kits",
        });
      } catch (err) {
        console.error(`Falha ao pausar anúncio de kit ${anuncio.id} por estoque insuficiente:`, err);
      }
    }
  }
}

// Quando zera o estoque de UMA variação (tamanho/cor), zera só a disponibilidade
// daquela variação no ML via PUT /items/{itemId}/variations/{variationId} — o
// anúncio continua ativo e vendendo as demais variações normalmente. Diferente
// de pausarAnunciosPorEstoqueZerado, que pausa o anúncio inteiro (só usado pra
// produto sem variação).
export async function pausarVariacaoPorEstoqueZerado(produtoVariacaoId: string): Promise<void> {
  const anunciosVariacao = await prisma.anuncioVariacao.findMany({
    where: {
      produtoVariacaoId,
      anuncio: { status: "PUBLICADO", plataforma: "MERCADOLIVRE" },
    },
    include: {
      produtoVariacao: true,
      anuncio: { include: { produto: true, lojista: true } },
    },
  });

  for (const av of anunciosVariacao) {
    const { anuncio } = av;
    if (!av.plataformaVariationId || !anuncio.plataformaItemId) continue;

    try {
      const integracao = await prisma.integracao.findUnique({
        where: { lojistaId_plataforma: { lojistaId: anuncio.lojistaId, plataforma: "MERCADOLIVRE" } },
      });
      if (!integracao?.ativa) continue;

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

      await client.updateVariationStock(anuncio.plataformaItemId, av.plataformaVariationId, 0);

      const rotulo = [av.produtoVariacao.tamanho, av.produtoVariacao.cor].filter(Boolean).join(" / ");
      await criarNotificacao({
        destinatario: "LOJISTA",
        lojistaId: anuncio.lojistaId,
        tipo: "ANUNCIO_PAUSADO_AUTOMATICO",
        titulo: "Variação pausada por falta de estoque",
        mensagem: `O tamanho/cor "${rotulo}" de "${anuncio.titulo}" foi zerado automaticamente — as outras variações continuam disponíveis.`,
        link: "/meus-anuncios",
      });
    } catch (err) {
      console.error(`Falha ao zerar variação ${produtoVariacaoId} no anúncio ${anuncio.id}:`, err);
    }
  }
}
