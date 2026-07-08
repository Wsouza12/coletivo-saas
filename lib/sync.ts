import { prisma } from "@/lib/prisma";
import { redis, redisConfigurado } from "@/lib/redis";
import { decrypt, encrypt } from "@/lib/crypto";
import { MercadoLivreClient } from "@/lib/mercadolivre";
import { ShopeeClient } from "@/lib/shopee";
import { mlOrderToPedido } from "@/lib/mappers/ml";
import { shopeeOrderToPedido } from "@/lib/mappers/shopee";
import { upsertPedidoDeExterno } from "@/lib/pedido-sync";

const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

function syncKey(integracaoId: string) {
  return `lastSync:${integracaoId}`;
}

// Fallback de polling — cobre pedidos que os webhooks perderem. Extraído para
// ser reusado pelo cron (/api/cron/sync-pedidos) e pelo botão manual do admin
// ("Forçar sync agora" em /admin/configuracoes → Sistema).
export async function sincronizarPedidosExternos(): Promise<{ synced: number; errors: string[] }> {
  const integracoes = await prisma.integracao.findMany({ where: { ativa: true } });

  let synced = 0;
  const errors: string[] = [];

  for (const integracao of integracoes) {
    try {
      const lastSyncRaw = redisConfigurado ? await redis.get<string>(syncKey(integracao.id)) : null;
      const lastSyncAt = lastSyncRaw ? new Date(lastSyncRaw) : new Date(Date.now() - DEFAULT_LOOKBACK_MS);
      const agora = new Date();

      if (integracao.plataforma === "MERCADOLIVRE") {
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

        const orders = await client.getOrders(integracao.accountId, lastSyncAt);
        for (const order of orders) {
          try {
            const endereco = order.shipping ? await client.getShipment(order.shipping.id) : undefined;
            const mapeado = mlOrderToPedido(order, endereco);
            const resultado = await upsertPedidoDeExterno(integracao.lojistaId, mapeado);
            if (resultado.criado) synced++;
          } catch (err) {
            console.error(`Falha ao sincronizar pedido ML ${order.id} da integração ${integracao.id}:`, err);
          }
        }
      } else {
        const client = new ShopeeClient(
          process.env.SHOPEE_PARTNER_ID ?? "",
          process.env.SHOPEE_PARTNER_KEY ?? "",
          decrypt(integracao.accessToken),
          integracao.accountId
        );

        const orders = await client.getOrderList({
          time_range_field: "create_time",
          time_from: Math.floor(lastSyncAt.getTime() / 1000),
          time_to: Math.floor(agora.getTime() / 1000),
        });
        for (const order of orders) {
          try {
            const detalhe = await client.getOrderDetail(order.order_sn);
            const mapeado = shopeeOrderToPedido(detalhe);
            const resultado = await upsertPedidoDeExterno(integracao.lojistaId, mapeado);
            if (resultado.criado) synced++;
          } catch (err) {
            console.error(`Falha ao sincronizar pedido Shopee ${order.order_sn} da integração ${integracao.id}:`, err);
          }
        }
      }

      if (redisConfigurado) await redis.set(syncKey(integracao.id), agora.toISOString());
    } catch (err) {
      console.error(`Falha ao sincronizar pedidos da integração ${integracao.id}:`, err);
      errors.push(integracao.id);
    }
  }

  if (redisConfigurado) {
    await redis
      .set(
        "jobStatus:syncPedidos",
        JSON.stringify({ executadoEm: new Date().toISOString(), synced, errors: errors.length })
      )
      .catch(() => {});
  }

  return { synced, errors };
}
