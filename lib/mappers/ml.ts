import type { MLOrder, MLShipmentAddress } from "@/lib/mercadolivre";
import type { PedidoMapeado } from "./types";

export function mlOrderToPedido(mlOrder: MLOrder, endereco?: MLShipmentAddress): PedidoMapeado {
  const end = endereco?.receiver_address;

  return {
    plataforma: "MERCADOLIVRE",
    plataformaOrderId: String(mlOrder.id),
    compradorNome: mlOrder.buyer.nickname,
    compradorDoc: null,
    compradorTelefone: null,
    compradorEmail: null,
    enderecoEntrega: end
      ? {
          rua: end.street_name,
          numero: end.street_number,
          complemento: end.comment ?? "",
          bairro: end.neighborhood?.name ?? "",
          cidade: end.city.name,
          uf: end.state.id,
          cep: end.zip_code,
        }
      : {},
    valorVenda: mlOrder.total_amount,
    frete: 0,
    itens: mlOrder.order_items.map((item) => ({
      plataformaItemId: item.item.id,
      quantidade: item.quantity,
      tituloAnuncio: item.item.title,
      plataformaVariationId: item.item.variation_id != null ? String(item.item.variation_id) : null,
    })),
  };
}
