import type { Plataforma } from "@prisma/client";

export type ItemMapeado = {
  plataformaItemId: string;
  quantidade: number;
  tituloAnuncio: string;
  plataformaVariationId: string | null;
};

// Formato intermediário "puro" de um pedido externo (ML/Shopee) — sem
// nenhuma consulta ao banco. Quem chama resolve lojistaId/anuncioId/produtoId
// (via Integracao.accountId e Anuncio.plataformaItemId) e o valorCusto real
// antes de persistir como Pedido + ItemPedido.
export type PedidoMapeado = {
  plataforma: Plataforma;
  plataformaOrderId: string;
  compradorNome: string;
  compradorDoc: string | null;
  compradorTelefone: string | null;
  compradorEmail: string | null;
  enderecoEntrega: Record<string, string>;
  valorVenda: number;
  frete: number;
  itens: ItemMapeado[];
};
