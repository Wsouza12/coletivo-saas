import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Sem url/token, o client tenta mesmo assim e falha de formas inconsistentes
// (inclusive em lote, via pipelining automático, vazando como exceção não
// capturada). Chamadores não-críticos (status/log) devem checar isto antes
// de chamar `redis` e usar um fallback, em vez de confiar só em try/catch.
export const redisConfigurado = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);
