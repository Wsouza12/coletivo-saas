import { prisma } from "@/lib/prisma";
import type { PedidoMapeado } from "@/lib/mappers/types";
import { sendPedidoRecebidoAdmin } from "@/lib/email";
import { criarNotificacao } from "@/lib/notificacoes-internas";
import {
  pausarAnunciosPorEstoqueZerado,
  pausarVariacaoPorEstoqueZerado,
  pausarKitsPorProdutoComEstoqueInsuficiente,
} from "@/lib/estoque-sync";

/**
 * Cria um Pedido + ItemPedido a partir de um pedido externo já mapeado
 * (ML/Shopee). Idempotente: se plataformaOrderId já existe, não duplica.
 * Resolve produtoId/anuncioId via Anuncio.plataformaItemId, e valorCusto via
 * o preço de atacado atual do produto. Decrementa o estoque do produto a
 * cada venda confirmada.
 */
export async function upsertPedidoDeExterno(
  lojistaId: string,
  pedidoMapeado: PedidoMapeado
): Promise<{ criado: boolean; pedidoId: string | null; semVinculo?: boolean }> {
  const existente = await prisma.pedido.findUnique({
    where: { plataformaOrderId: pedidoMapeado.plataformaOrderId },
  });
  if (existente) {
    return { criado: false, pedidoId: existente.id };
  }

  const anuncios = await prisma.anuncio.findMany({
    where: {
      lojistaId,
      plataforma: pedidoMapeado.plataforma,
      plataformaItemId: { in: pedidoMapeado.itens.map((i) => i.plataformaItemId) },
    },
    include: {
      produto: true,
      variacoes: true,
      kit: { include: { itens: { include: { produto: true } } } },
    },
  });

  // Anúncio de Kit não vira 1 ItemPedido só — explode em 1 linha por produto real do
  // kit (quantidade vendida x quantidade do produto dentro do kit), pra fulfillment
  // no admin mostrar exatamente o que separar/embalar, igual a uma venda normal.
  const itensParaCriar = pedidoMapeado.itens.flatMap((item) => {
    const anuncio = anuncios.find((a) => a.plataformaItemId === item.plataformaItemId);
    if (!anuncio) return [];

    if (anuncio.kit) {
      return anuncio.kit.itens.map((ki) => ({
        produtoId: ki.produtoId,
        produtoVariacaoId: null as string | null,
        quantidade: item.quantidade * ki.quantidade,
        precoUnit: ki.produto.precoAtacado,
        anuncioId: anuncio.id,
      }));
    }

    if (!anuncio.produto) return [];
    // Casa pelo plataformaVariationId real retornado pelo ML — produto sem
    // variação publicada simplesmente não tem nenhuma AnuncioVariacao pra casar.
    const anuncioVariacao = item.plataformaVariationId
      ? anuncio.variacoes.find((v) => v.plataformaVariationId === item.plataformaVariationId)
      : undefined;
    return [
      {
        produtoId: anuncio.produtoId as string,
        produtoVariacaoId: anuncioVariacao?.produtoVariacaoId ?? null,
        quantidade: item.quantidade,
        precoUnit: anuncio.produto.precoAtacado,
        anuncioId: anuncio.id,
      },
    ];
  });

  // Nenhum item do pedido tem Anuncio cadastrado — em vez de descartar com
  // erro (e perder a venda da sincronização pra sempre), registra como
  // pendência de vínculo manual e notifica lojista + admin.
  if (itensParaCriar.length === 0) {
    await registrarVendaSemVinculo(lojistaId, pedidoMapeado);
    return { criado: false, pedidoId: null, semVinculo: true };
  }

  const valorCusto = itensParaCriar.reduce(
    (sum, item) => sum + Number(item.precoUnit) * item.quantidade,
    0
  );

  const pedido = await prisma.pedido.create({
    data: {
      lojistaId,
      anuncioId: itensParaCriar[0].anuncioId,
      plataforma: pedidoMapeado.plataforma,
      plataformaOrderId: pedidoMapeado.plataformaOrderId,
      compradorNome: pedidoMapeado.compradorNome,
      compradorDoc: pedidoMapeado.compradorDoc,
      compradorTelefone: pedidoMapeado.compradorTelefone,
      compradorEmail: pedidoMapeado.compradorEmail,
      enderecoEntrega: pedidoMapeado.enderecoEntrega,
      valorVenda: pedidoMapeado.valorVenda,
      valorCusto,
      frete: pedidoMapeado.frete,
      status: "NOVO",
      itens: {
        create: itensParaCriar.map(({ produtoId, produtoVariacaoId, quantidade, precoUnit }) => ({
          produtoId,
          produtoVariacaoId,
          quantidade,
          precoUnit,
        })),
      },
    },
  });

  await decrementarEstoque(itensParaCriar);
  await notificarAdminNovoPedido(pedido.id, pedidoMapeado, lojistaId, itensParaCriar[0].produtoId);

  return { criado: true, pedidoId: pedido.id };
}

// Decrementa o estoque de cada produto vendido — nunca deixa ir negativo — e
// dispara a pausa automática de anúncios quando algum produto (ou variação) zera.
async function decrementarEstoque(
  itens: { produtoId: string; produtoVariacaoId: string | null; quantidade: number }[]
): Promise<void> {
  const porVariacao = new Map<string, number>();
  const porProduto = new Map<string, number>();
  for (const item of itens) {
    if (item.produtoVariacaoId) {
      porVariacao.set(item.produtoVariacaoId, (porVariacao.get(item.produtoVariacaoId) ?? 0) + item.quantidade);
    } else {
      porProduto.set(item.produtoId, (porProduto.get(item.produtoId) ?? 0) + item.quantidade);
    }
  }

  for (const [produtoVariacaoId, quantidade] of porVariacao) {
    try {
      const variacao = await prisma.produtoVariacao.update({
        where: { id: produtoVariacaoId },
        data: { estoque: { decrement: quantidade } },
      });

      if (variacao.estoque < 0) {
        await prisma.produtoVariacao.update({ where: { id: produtoVariacaoId }, data: { estoque: 0 } });
      }

      // Produto.estoque é a soma das variações — recalcula a partir do banco em
      // vez de decrementar em paralelo, pra não dessincronizar com a Fase 1.
      const soma = await prisma.produtoVariacao.aggregate({
        where: { produtoId: variacao.produtoId },
        _sum: { estoque: true },
      });
      await prisma.produto.update({
        where: { id: variacao.produtoId },
        data: { estoque: soma._sum.estoque ?? 0 },
      });

      if (variacao.estoque <= 0) {
        await pausarVariacaoPorEstoqueZerado(produtoVariacaoId);
      }
    } catch (err) {
      console.error(`Falha ao decrementar estoque da variação ${produtoVariacaoId}:`, err);
    }
  }

  for (const [produtoId, quantidade] of porProduto) {
    try {
      const produto = await prisma.produto.update({
        where: { id: produtoId },
        data: { estoque: { decrement: quantidade } },
      });

      if (produto.estoque <= 0) {
        if (produto.estoque < 0) {
          await prisma.produto.update({ where: { id: produtoId }, data: { estoque: 0 } });
        }
        await pausarAnunciosPorEstoqueZerado(produtoId);
      }

      // Mesmo que o produto ainda tenha estoque (ex: 1un restando), pode não
      // ser suficiente pra montar um kit que usa 2un dele — checa sempre, não
      // só quando o produto em si zera.
      await pausarKitsPorProdutoComEstoqueInsuficiente(produtoId);
    } catch (err) {
      console.error(`Falha ao decrementar estoque do produto ${produtoId}:`, err);
    }
  }
}

async function registrarVendaSemVinculo(
  lojistaId: string,
  pedidoMapeado: PedidoMapeado
): Promise<void> {
  try {
    // O cron de sync roda a cada 15min e re-processa o mesmo pedido externo
    // enquanto ele continuar sem vínculo — sem este check, a notificação
    // disparava de novo em todo ciclo (mesmo já existindo o registro).
    // Só notifica na PRIMEIRA vez que esse pedido aparece sem vínculo.
    const jaExistia = await prisma.vendaNaoVinculada.findUnique({
      where: {
        lojistaId_plataforma_plataformaOrderId: {
          lojistaId,
          plataforma: pedidoMapeado.plataforma,
          plataformaOrderId: pedidoMapeado.plataformaOrderId,
        },
      },
    });

    await prisma.vendaNaoVinculada.upsert({
      where: {
        lojistaId_plataforma_plataformaOrderId: {
          lojistaId,
          plataforma: pedidoMapeado.plataforma,
          plataformaOrderId: pedidoMapeado.plataformaOrderId,
        },
      },
      create: {
        lojistaId,
        plataforma: pedidoMapeado.plataforma,
        plataformaItemId: pedidoMapeado.itens[0]?.plataformaItemId ?? "",
        plataformaOrderId: pedidoMapeado.plataformaOrderId,
        tituloAnuncio: pedidoMapeado.itens[0]?.tituloAnuncio ?? null,
      },
      update: {},
    });

    if (jaExistia) return;

    await criarNotificacao({
      destinatario: "LOJISTA",
      lojistaId,
      tipo: "VENDA_SEM_VINCULO",
      titulo: "Venda recebida sem produto vinculado",
      mensagem:
        "Você vendeu um item que não está vinculado a nenhum produto do nosso catálogo — vincule manualmente em Integrações para que essa e as próximas vendas sejam sincronizadas corretamente.",
      link: "/integracoes",
    });

    await criarNotificacao({
      destinatario: "ADMIN",
      tipo: "VENDA_SEM_VINCULO",
      titulo: "Lojista com venda sem vínculo",
      mensagem: `O pedido ${pedidoMapeado.plataformaOrderId} (${pedidoMapeado.plataforma}) chegou sem anúncio vinculado a um produto.`,
    });
  } catch (err) {
    console.error("Falha ao registrar venda sem vínculo:", err);
  }
}

async function notificarAdminNovoPedido(
  pedidoId: string,
  pedidoMapeado: PedidoMapeado,
  lojistaId: string,
  produtoId: string
): Promise<void> {
  if (!process.env.ADMIN_SEED_EMAIL) return;

  const config = await prisma.configuracaoNotificacao.findUnique({ where: { id: "default" } });
  if (config && !config.emailNovoPedido) return;

  const [lojista, produto] = await Promise.all([
    prisma.lojista.findUnique({ where: { id: lojistaId }, select: { storeName: true } }),
    prisma.produto.findUnique({ where: { id: produtoId }, select: { nome: true } }),
  ]);

  await sendPedidoRecebidoAdmin({
    adminEmail: process.env.ADMIN_SEED_EMAIL,
    pedidoId,
    plataformaOrderId: pedidoMapeado.plataformaOrderId,
    plataforma: pedidoMapeado.plataforma,
    storeName: lojista?.storeName ?? "Loja",
    produto: produto?.nome ?? "Produto",
  });
}
