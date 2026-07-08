import { redis, redisConfigurado } from "@/lib/redis";

// Janela fixa por minuto: chave "ratelimit:{escopo}:{id}:{minutoUnix}" com TTL de 60s.
// Sem Redis configurado, não bloqueia (best-effort) — evita derrubar a rota em dev.
export async function checarRateLimit(
  escopo: string,
  id: string,
  limite: number
): Promise<{ permitido: boolean; restante: number }> {
  if (!redisConfigurado) return { permitido: true, restante: limite };

  const minuto = Math.floor(Date.now() / 60000);
  const chave = `ratelimit:${escopo}:${id}:${minuto}`;

  const contagem = await redis.incr(chave);
  if (contagem === 1) {
    await redis.expire(chave, 60);
  }

  return { permitido: contagem <= limite, restante: Math.max(0, limite - contagem) };
}
