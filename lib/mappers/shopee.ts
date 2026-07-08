import type { ShopeeOrderDetail } from "@/lib/shopee";
import type { PedidoMapeado } from "./types";

export function shopeeOrderToPedido(order: ShopeeOrderDetail): PedidoMapeado {
  const endereco = order.recipient_address;

  return {
    plataforma: "SHOPEE",
    plataformaOrderId: order.order_sn,
    compradorNome: endereco?.name ?? "Comprador Shopee",
    compradorDoc: null,
    compradorTelefone: endereco?.phone ?? null,
    compradorEmail: null,
    enderecoEntrega: endereco
      ? {
          rua: endereco.full_address,
          cidade: endereco.city,
          uf: endereco.state,
          cep: endereco.zipcode,
        }
      : {},
    valorVenda: order.total_amount,
    frete: 0,
    itens: order.item_list.map((item) => ({
      plataformaItemId: String(item.item_id),
      quantidade: item.model_quantity_purchased,
      tituloAnuncio: item.item_name,
      // Sincronização de variação por (anuncioId, plataformaVariationId) é só pro ML
      // nesta fase — Shopee usa model_id num formato diferente, fora do escopo atual.
      plataformaVariationId: null,
    })),
  };
}
