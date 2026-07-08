// Cálculo de frete real por CEP via Melhor Envio (Fase 6 — Atacado Coletivo).
// Contrato confirmado ao vivo via curl em POST /api/v2/me/shipment/calculate
// antes de codificar este wrapper.

export type OpcaoFreteMelhorEnvio = {
  servicoId: number;
  transportadora: string;
  servico: string;
  preco: number;
  prazoDias: number;
};

type RespostaCalculo = {
  id: number;
  name: string;
  price?: string;
  error?: string;
  delivery_time?: number;
  company?: { name: string };
}[];

// CNPJ do dono da conta na Melhor Envio costuma exigir from.postal_code; usamos só
// CEP (sem endereço completo) — suficiente pro endpoint de cálculo (não-autenticado
// de remetente fixo, mas autenticado via token de conta).
export async function calcularFreteMelhorEnvio(params: {
  cepOrigem: string;
  cepDestino: string;
  pesoKg: number;
  comprimentoCm: number;
  larguraCm: number;
  alturaCm: number;
}): Promise<OpcaoFreteMelhorEnvio[]> {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token) {
    throw new Error("MELHOR_ENVIO_TOKEN não configurado");
  }

  const res = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "DropSync (ceopablowanderson@gmail.com)",
    },
    body: JSON.stringify({
      from: { postal_code: params.cepOrigem.replace(/\D/g, "") },
      to: { postal_code: params.cepDestino.replace(/\D/g, "") },
      package: {
        height: Math.max(2, Math.round(params.alturaCm)),
        width: Math.max(11, Math.round(params.larguraCm)),
        length: Math.max(16, Math.round(params.comprimentoCm)),
        weight: Math.max(0.1, params.pesoKg),
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Melhor Envio respondeu ${res.status}: ${await res.text()}`);
  }

  const data: RespostaCalculo = await res.json();

  return data
    .filter((opcao) => !opcao.error && opcao.price)
    .map((opcao) => ({
      servicoId: opcao.id,
      transportadora: opcao.company?.name ?? "",
      servico: opcao.name,
      preco: Number(opcao.price),
      prazoDias: opcao.delivery_time ?? 0,
    }))
    .sort((a, b) => a.preco - b.preco);
}
