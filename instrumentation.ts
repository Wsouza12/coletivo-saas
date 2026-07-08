// Roda uma vez no startup do servidor (Node runtime). Hidrata o process.env com
// as chaves de API salvas no Painel do Desenvolvedor (criptografadas no banco),
// pra os wrappers de integração enxergarem as chaves do cliente sem alteração.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { hidratarEnv } = await import("./lib/config-app");
      await hidratarEnv();
    } catch (e) {
      console.error("Falha ao hidratar config do painel:", e);
    }
  }
}
