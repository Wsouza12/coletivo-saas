import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { createCompraListaPix } from "@/lib/mercadopago";

// Cria a compra da lista de fornecedores + gera o Pix. O acesso à página
// protegida sai depois do pagamento confirmado (webhook), via token.
export const COOKIE_LISTA = "lista_sess";

export async function criarCompraLista(dados: {
  compradorNome?: string;
  compradorDoc?: string;
  compradorTelefone?: string;
  compradorEmail?: string;
  tipo?: "COMPLETA" | "CATALOGOS";
  incluiComunidade?: boolean;
}): Promise<{ compraId: string; token: string; qrCode: string | null; qrCodeBase64: string | null; valor: number }> {
  const config = await prisma.configuracaoFinanceira.findFirst();
  const tipo = dados.tipo === "CATALOGOS" ? "CATALOGOS" : "COMPLETA";
  const base = tipo === "CATALOGOS"
    ? Number(config?.precoCatalogosSemContato ?? 47)
    : Number(config?.precoListaFornecedores ?? 97);
  const incluiComunidade = !!dados.incluiComunidade;
  const upsell = incluiComunidade ? Number(config?.precoUpsellComunidade ?? 7) : 0;
  const valor = base + upsell;

  const token = randomBytes(16).toString("hex");
  const compra = await prisma.compraListaFornecedores.create({
    data: {
      compradorNome: dados.compradorNome?.trim() || "Aguardando cadastro",
      compradorDoc: dados.compradorDoc?.replace(/\D/g, "") || "",
      compradorTelefone: dados.compradorTelefone?.replace(/\D/g, "") || "",
      compradorEmail: dados.compradorEmail?.trim() || null,
      valor,
      tipo,
      incluiComunidade,
      token,
      status: "AGUARDANDO_PAGAMENTO",
    },
  });

  const pix = await createCompraListaPix({
    id: compra.id,
    valor,
    nome: compra.compradorNome === "Aguardando cadastro" ? "Cliente" : compra.compradorNome,
    email: compra.compradorEmail || "sem-email@dropyatacado.com.br",
  });

  if (pix) {
    await prisma.compraListaFornecedores.update({
      where: { id: compra.id },
      data: { mpPaymentId: pix.paymentId, mpQrCode: pix.qrCode, mpQrCodeBase64: pix.qrCodeBase64 },
    });
  }

  return { compraId: compra.id, token, qrCode: pix?.qrCode ?? null, qrCodeBase64: pix?.qrCodeBase64 ?? null, valor };
}

// Confirma o pagamento (chamado pelo webhook do MP).
export async function confirmarPagamentoCompraLista(compraId: string): Promise<void> {
  const compra = await prisma.compraListaFornecedores.findUnique({ where: { id: compraId } });
  if (!compra || compra.status === "PAGO") return;
  await prisma.compraListaFornecedores.update({
    where: { id: compraId },
    data: { status: "PAGO", pagoEm: new Date() },
  });
}

// Login por CPF: retorna a compra PAGA que casa com CPF (+ telefone como
// confirmação). Null se não achar / não pago.
export async function autenticarCompra(doc: string, telefone: string) {
  const cpf = doc.replace(/\D/g, "");
  const tel = telefone.replace(/\D/g, "");
  if (cpf.length < 11 || tel.length < 10) return null;
  return prisma.compraListaFornecedores.findFirst({
    where: { compradorDoc: cpf, compradorTelefone: tel, status: "PAGO" },
    orderBy: { pagoEm: "desc" },
  });
}

export async function obterCompraPorId(id: string) {
  return prisma.compraListaFornecedores.findFirst({ where: { id, status: "PAGO" } });
}

// Cadastro DEPOIS do pagamento: preenche nome/CPF/telefone da compra já paga.
export async function cadastrarCompraPaga(dados: {
  compraId: string; compradorNome: string; compradorDoc: string; compradorTelefone: string;
}) {
  const compra = await prisma.compraListaFornecedores.findUnique({ where: { id: dados.compraId } });
  if (!compra) throw new Error("Compra não encontrada");
  if (compra.status !== "PAGO") throw new Error("Pagamento ainda não confirmado");
  return prisma.compraListaFornecedores.update({
    where: { id: dados.compraId },
    data: {
      compradorNome: dados.compradorNome.trim(),
      compradorDoc: dados.compradorDoc.replace(/\D/g, ""),
      compradorTelefone: dados.compradorTelefone.replace(/\D/g, ""),
    },
  });
}

// Dados AO VIVO da lista — lidos na hora, então atualizar fornecedor/catálogo no
// admin reflete automaticamente pra quem já comprou.
export async function obterListaCompleta() {
  const fornecedores = await prisma.fornecedorAtacado.findMany({
    orderBy: { nome: "asc" },
    select: {
      id: true, nome: true, telefone: true, endereco: true,
      vendedorNome: true, horarioAtendimento: true, pedidoMinimo: true,
      catalogos: { select: { id: true, nome: true, arquivoUrl: true }, orderBy: { createdAt: "desc" } },
    },
  });
  return fornecedores;
}
