import crypto from "crypto";
import { otimizarAnuncioShopee } from "@/lib/groq";

export { otimizarAnuncioShopee };

const SHOPEE_BASE = "https://partner.shopeemobile.com";

function sign(path: string, timestamp: number): string {
  const partnerKey = process.env.SHOPEE_PARTNER_KEY ?? "";
  const baseString = `${process.env.SHOPEE_PARTNER_ID ?? ""}${path}${timestamp}`;
  return crypto.createHmac("sha256", partnerKey).update(baseString).digest("hex");
}

export function getShopeeAuthUrl(state: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const path = "/api/v2/shop/auth_partner";
  const params = new URLSearchParams({
    partner_id: process.env.SHOPEE_PARTNER_ID ?? "",
    timestamp: String(timestamp),
    sign: sign(path, timestamp),
    redirect: `${process.env.SHOPEE_REDIRECT_URI ?? ""}?state=${state}`,
  });
  return `${SHOPEE_BASE}${path}?${params.toString()}`;
}

export type ShopeeTokenResponse = {
  access_token: string;
  refresh_token: string;
  expire_in: number;
};

export async function exchangeShopeeCode(
  code: string,
  shopId: string
): Promise<ShopeeTokenResponse> {
  const timestamp = Math.floor(Date.now() / 1000);
  const path = "/api/v2/auth/token/get";
  const partnerId = process.env.SHOPEE_PARTNER_ID ?? "";
  const res = await fetch(
    `${SHOPEE_BASE}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign(path, timestamp)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, shop_id: Number(shopId), partner_id: Number(partnerId) }),
    }
  );
  if (!res.ok) throw new Error(`Falha ao trocar code por token Shopee: ${await res.text()}`);
  return res.json();
}

export async function refreshShopeeToken(
  refreshToken: string,
  shopId: string
): Promise<ShopeeTokenResponse> {
  const timestamp = Math.floor(Date.now() / 1000);
  const path = "/api/v2/auth/access_token/get";
  const partnerId = process.env.SHOPEE_PARTNER_ID ?? "";
  const res = await fetch(
    `${SHOPEE_BASE}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign(path, timestamp)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: refreshToken,
        shop_id: Number(shopId),
        partner_id: Number(partnerId),
      }),
    }
  );
  if (!res.ok) throw new Error(`Falha ao renovar token Shopee: ${await res.text()}`);
  return res.json();
}

export async function getShopeeShopInfo(
  accessToken: string,
  shopId: string
): Promise<{ shop_name: string }> {
  const timestamp = Math.floor(Date.now() / 1000);
  const path = "/api/v2/shop/get_shop_info";
  const partnerId = process.env.SHOPEE_PARTNER_ID ?? "";
  const res = await fetch(
    `${SHOPEE_BASE}${path}?partner_id=${partnerId}&timestamp=${timestamp}&sign=${sign(path, timestamp)}&shop_id=${shopId}&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Falha ao buscar loja Shopee: ${await res.text()}`);
  return res.json();
}

export type ShopeeItemPayload = {
  item_name: string;
  description: string;
  item_sku: string;
  weight: number;
  category_id: number;
  price_info: { currency: "BRL"; original_price: number }[];
  stock_info: { stock_type: number; current_stock: number }[];
  // image_id_list deve vir do upload prévio via Media Space API
  // (POST /api/v2/media_space/upload_image) — não cabe no escopo deste wrapper.
  image: { image_id_list: string[] };
};

export type ShopeeOrderListParams = {
  time_range_field: "create_time" | "update_time";
  time_from: number;
  time_to: number;
  page_size?: number;
};

export type ShopeeOrder = {
  order_sn: string;
  order_status: string;
};

export type ShopeeOrderDetail = {
  order_sn: string;
  order_status: string;
  buyer_user_id: number;
  create_time: number;
  total_amount: number;
  recipient_address: {
    name: string;
    phone: string;
    full_address: string;
    city: string;
    state: string;
    zipcode: string;
  };
  item_list: {
    item_id: number;
    item_name: string;
    model_quantity_purchased: number;
    model_discounted_price: number;
  }[];
};

/**
 * Wrapper autenticado da API da Shopee Open Platform v2.
 * Todo endpoint exige assinatura HMAC-SHA256; chamadas autenticadas por loja
 * incluem access_token + shop_id na base string da assinatura.
 */
export class ShopeeClient {
  constructor(
    private partnerId: string,
    private partnerKey: string,
    private accessToken: string,
    private shopId: string
  ) {}

  private sign(path: string, timestamp: number): string {
    const baseString = `${this.partnerId}${path}${timestamp}${this.accessToken}${this.shopId}`;
    return crypto.createHmac("sha256", this.partnerKey).update(baseString).digest("hex");
  }

  private async request<T>(path: string, init: RequestInit = {}, query: Record<string, string> = {}): Promise<T> {
    const timestamp = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
      partner_id: this.partnerId,
      timestamp: String(timestamp),
      sign: this.sign(path, timestamp),
      shop_id: this.shopId,
      access_token: this.accessToken,
      ...query,
    });

    const res = await fetch(`${SHOPEE_BASE}${path}?${params.toString()}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers },
    });

    if (!res.ok) {
      throw new Error(`Erro Shopee (${res.status}): ${await res.text()}`);
    }
    return res.json();
  }

  async addItem(data: ShopeeItemPayload): Promise<{ item_id: number }> {
    return this.request("/api/v2/product/add_item", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async unlistItem(itemId: number): Promise<void> {
    await this.request("/api/v2/product/unlist_item", {
      method: "POST",
      body: JSON.stringify({ item_list: [{ item_id: itemId, unlist: true }] }),
    });
  }

  async getOrderList(params: ShopeeOrderListParams): Promise<ShopeeOrder[]> {
    const data = await this.request<{ response: { order_list: ShopeeOrder[] } }>(
      "/api/v2/order/get_order_list",
      { method: "GET" },
      {
        time_range_field: params.time_range_field,
        time_from: String(params.time_from),
        time_to: String(params.time_to),
        page_size: String(params.page_size ?? 50),
      }
    );
    return data.response.order_list;
  }

  async getOrderDetail(orderSn: string): Promise<ShopeeOrderDetail> {
    const data = await this.request<{ response: { order_list: ShopeeOrderDetail[] } }>(
      "/api/v2/order/get_order_detail",
      { method: "GET" },
      { order_sn_list: orderSn }
    );
    return data.response.order_list[0];
  }

  static async refreshToken(refreshToken: string, shopId: string): Promise<ShopeeTokenResponse> {
    return refreshShopeeToken(refreshToken, shopId);
  }
}
