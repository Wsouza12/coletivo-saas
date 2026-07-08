import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encrypt } from "../lib/crypto";

const prisma = new PrismaClient();

const PLACEHOLDER_IMG = (seed: string) =>
  `https://placehold.co/600x600/1D9E75/FFFFFF?text=${encodeURIComponent(seed)}`;

const ENDERECO_EXEMPLO = (cidade: string, uf: string) => ({
  rua: "Rua das Flores",
  numero: "123",
  complemento: "Apto 45",
  bairro: "Centro",
  cidade,
  uf,
  cep: "01310-100",
});

async function main() {
  // ─── Admin ──────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_SEED_EMAIL;
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_SEED_EMAIL e ADMIN_SEED_PASSWORD são obrigatórios no .env.local");
  }

  const adminHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminHash,
      name: "Pablo (Admin)",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`✔ Admin criado: ${adminEmail}`);

  // ─── Lojistas (3 ativos + 1 pendente, para testar aprovação) ────────────
  const lojistasSeed = [
    { email: "lojista1@teste.com", storeName: "Loja Alpha Tech", status: "ACTIVE" as const },
    { email: "lojista2@teste.com", storeName: "Click Store", status: "ACTIVE" as const },
    { email: "lojista3@teste.com", storeName: "Speed Shop", status: "ACTIVE" as const },
    { email: "lojista4@teste.com", storeName: "Nova Loja Pendente", status: "PENDING" as const },
  ];

  const senhaLojistaHash = await bcrypt.hash("Teste123!", 12);
  const lojistas: Record<string, { userId: string; lojistaId: string }> = {};

  for (const l of lojistasSeed) {
    const user = await prisma.user.upsert({
      where: { email: l.email },
      update: {},
      create: {
        email: l.email,
        password: senhaLojistaHash,
        name: l.storeName,
        role: "LOJISTA",
        status: l.status,
      },
    });

    const lojista = await prisma.lojista.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        storeName: l.storeName,
        approvedAt: l.status === "ACTIVE" ? new Date() : null,
        approvedBy: l.status === "ACTIVE" ? admin.id : null,
      },
    });

    lojistas[l.email] = { userId: user.id, lojistaId: lojista.id };
    console.log(`✔ Lojista criado: ${l.email} (${l.storeName}) [${l.status}]`);
  }

  // ─── Produtos ───────────────────────────────────────────────────────────
  const produtosSeed = [
    { sku: "FONE-BT-01", nome: "Fone Bluetooth 5.0", categoria: "Eletrônicos", precoAtacado: 89.0, estoque: 150, pesoKg: 0.08 },
    { sku: "CABO-UC-2M", nome: "Cabo USB-C 2 metros", categoria: "Eletrônicos", precoAtacado: 14.9, estoque: 500, pesoKg: 0.05 },
    { sku: "CARR-65W-01", nome: "Carregador Turbo 65W", categoria: "Eletrônicos", precoAtacado: 44.9, estoque: 80, pesoKg: 0.15 },
    { sku: "MOUSE-WL-01", nome: "Mouse Sem Fio 2.4GHz", categoria: "Eletrônicos", precoAtacado: 64.9, estoque: 120, pesoKg: 0.1 },
    { sku: "LUMIN-LED-01", nome: "Luminária LED USB", categoria: "Casa", precoAtacado: 37.9, estoque: 200, pesoKg: 0.2 },
    { sku: "CAPAS-UN-01", nome: "Capa Celular Universal", categoria: "Outros", precoAtacado: 11.9, estoque: 800, pesoKg: 0.03 },
  ];

  const produtos: Record<string, { id: string; precoAtacado: number }> = {};

  for (const p of produtosSeed) {
    const produto = await prisma.produto.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        nome: p.nome,
        descricao: `${p.nome} — produto de alta qualidade, pronto para revenda.`,
        categoria: p.categoria,
        precoAtacado: p.precoAtacado,
        pesoKg: p.pesoKg,
        estoque: p.estoque,
        ativo: true,
      },
    });

    await prisma.produtoImagem.upsert({
      where: { id: `${produto.id}-img-principal` },
      update: {},
      create: {
        id: `${produto.id}-img-principal`,
        produtoId: produto.id,
        url: PLACEHOLDER_IMG(p.nome),
        alt: p.nome,
        ordem: 0,
        principal: true,
      },
    });

    produtos[p.sku] = { id: produto.id, precoAtacado: p.precoAtacado };
    console.log(`✔ Produto criado: ${p.sku} — ${p.nome}`);
  }

  // ─── Categorias (para a aba Configurações > Categorias) ─────────────────
  const categoriasSeed = ["Eletrônicos", "Casa", "Moda", "Esporte", "Beleza", "Outros"];
  for (const nome of categoriasSeed) {
    await prisma.categoria.upsert({ where: { nome }, update: {}, create: { nome } });
  }
  console.log(`✔ ${categoriasSeed.length} categorias criadas`);

  // ─── Integração ML para lojista1 (dummy, só para exibir "conectado") ────
  await prisma.integracao.upsert({
    where: { lojistaId_plataforma: { lojistaId: lojistas["lojista1@teste.com"].lojistaId, plataforma: "MERCADOLIVRE" } },
    update: {},
    create: {
      lojistaId: lojistas["lojista1@teste.com"].lojistaId,
      plataforma: "MERCADOLIVRE",
      accountId: "123456789",
      accountName: "Loja Alpha Tech ML",
      accessToken: encrypt("dummy-access-token"),
      refreshToken: encrypt("dummy-refresh-token"),
      tokenExpiry: new Date(Date.now() + 1000 * 60 * 60 * 6),
    },
  });
  console.log("✔ Integração Mercado Livre (dummy) criada para lojista1");

  // ─── Anúncios ────────────────────────────────────────────────────────────
  const anunciosSeed = [
    { lojista: "lojista1@teste.com", sku: "FONE-BT-01", plataforma: "MERCADOLIVRE" as const, preco: 129.9, status: "PUBLICADO" as const },
    { lojista: "lojista1@teste.com", sku: "CARR-65W-01", plataforma: "MERCADOLIVRE" as const, preco: 69.9, status: "PUBLICADO" as const },
    { lojista: "lojista2@teste.com", sku: "MOUSE-WL-01", plataforma: "SHOPEE" as const, preco: 99.9, status: "PAUSADO" as const },
    { lojista: "lojista2@teste.com", sku: "LUMIN-LED-01", plataforma: "SHOPEE" as const, preco: 59.9, status: "RASCUNHO" as const },
  ];

  const anuncios: { id: string; sku: string; lojistaEmail: string }[] = [];
  for (const a of anunciosSeed) {
    const anuncio = await prisma.anuncio.upsert({
      where: {
        lojistaId_produtoId_plataforma: {
          lojistaId: lojistas[a.lojista].lojistaId,
          produtoId: produtos[a.sku].id,
          plataforma: a.plataforma,
        },
      },
      update: {},
      create: {
        lojistaId: lojistas[a.lojista].lojistaId,
        produtoId: produtos[a.sku].id,
        plataforma: a.plataforma,
        titulo: produtosSeed.find((p) => p.sku === a.sku)!.nome,
        precoVenda: a.preco,
        status: a.status,
        publicadoEm: a.status === "PUBLICADO" ? new Date() : null,
      },
    });
    anuncios.push({ id: anuncio.id, sku: a.sku, lojistaEmail: a.lojista });
  }
  console.log(`✔ ${anuncios.length} anúncios criados`);

  // ─── Pedidos (cobrindo todos os status do fluxo de fulfillment) ────────
  type PedidoSeed = {
    orderId: string;
    lojista: string;
    sku: string;
    qtd: number;
    plataforma: "MERCADOLIVRE" | "SHOPEE";
    status:
      | "NOVO"
      | "CONFIRMADO"
      | "SEPARANDO"
      | "EMBALANDO"
      | "AGUARDANDO_COLETA"
      | "ENVIADO"
      | "ENTREGUE"
      | "CANCELADO";
    cidade: string;
    uf: string;
    extra?: Record<string, unknown>;
  };

  const pedidosSeed: PedidoSeed[] = [
    { orderId: "ML-1001", lojista: "lojista1@teste.com", sku: "FONE-BT-01", qtd: 1, plataforma: "MERCADOLIVRE", status: "NOVO", cidade: "São Paulo", uf: "SP" },
    { orderId: "ML-1002", lojista: "lojista1@teste.com", sku: "CABO-UC-2M", qtd: 2, plataforma: "MERCADOLIVRE", status: "CONFIRMADO", cidade: "Campinas", uf: "SP" },
    { orderId: "SHOP-2001", lojista: "lojista2@teste.com", sku: "CARR-65W-01", qtd: 1, plataforma: "SHOPEE", status: "SEPARANDO", cidade: "Rio de Janeiro", uf: "RJ" },
    { orderId: "SHOP-2002", lojista: "lojista2@teste.com", sku: "MOUSE-WL-01", qtd: 1, plataforma: "SHOPEE", status: "EMBALANDO", cidade: "Niterói", uf: "RJ" },
    { orderId: "ML-1003", lojista: "lojista1@teste.com", sku: "LUMIN-LED-01", qtd: 1, plataforma: "MERCADOLIVRE", status: "AGUARDANDO_COLETA", cidade: "Belo Horizonte", uf: "MG", extra: { notaFiscal: "NF-000123" } },
    { orderId: "ML-1004", lojista: "lojista1@teste.com", sku: "CAPAS-UN-01", qtd: 3, plataforma: "MERCADOLIVRE", status: "ENVIADO", cidade: "Curitiba", uf: "PR", extra: { rastreio: "BR123456789", transportadora: "Correios" } },
    { orderId: "SHOP-2003", lojista: "lojista3@teste.com", sku: "FONE-BT-01", qtd: 1, plataforma: "SHOPEE", status: "ENTREGUE", cidade: "Porto Alegre", uf: "RS", extra: { rastreio: "BR987654321", transportadora: "Jadlog" } },
    { orderId: "ML-1005", lojista: "lojista1@teste.com", sku: "CABO-UC-2M", qtd: 1, plataforma: "MERCADOLIVRE", status: "CANCELADO", cidade: "Santos", uf: "SP", extra: { motivoCancelamento: "Cliente desistiu da compra" } },
    { orderId: "SHOP-2004", lojista: "lojista2@teste.com", sku: "LUMIN-LED-01", qtd: 2, plataforma: "SHOPEE", status: "ENTREGUE", cidade: "Recife", uf: "PE", extra: { rastreio: "BR555444333", transportadora: "Total Express" } },
  ];

  const now = new Date();
  const pedidosCriados: { id: string; lojistaId: string; valorCusto: number; status: string }[] = [];

  for (const p of pedidosSeed) {
    const produto = produtos[p.sku];
    const valorCusto = produto.precoAtacado * p.qtd;
    const anuncio = anuncios.find((a) => a.sku === p.sku && a.lojistaEmail === p.lojista);

    const extra = p.extra ?? {};
    const timestamps: Record<string, Date> = {};
    if (p.status === "EMBALANDO" || p.status === "AGUARDANDO_COLETA") timestamps.embalagemEm = now;
    if (p.status === "ENVIADO" || p.status === "ENTREGUE") timestamps.enviadoEm = now;
    if (p.status === "ENTREGUE") timestamps.entregueEm = now;
    if (p.status === "CANCELADO") timestamps.canceladoEm = now;

    const pedido = await prisma.pedido.upsert({
      where: { plataformaOrderId: p.orderId },
      update: {},
      create: {
        lojistaId: lojistas[p.lojista].lojistaId,
        anuncioId: anuncio?.id,
        plataforma: p.plataforma,
        plataformaOrderId: p.orderId,
        compradorNome: "Cliente Final Exemplo",
        compradorDoc: "123.456.789-00",
        compradorTelefone: "+55 11 99999-0000",
        compradorEmail: "cliente.exemplo@teste.com",
        enderecoEntrega: ENDERECO_EXEMPLO(p.cidade, p.uf),
        valorVenda: valorCusto * 1.4,
        valorCusto,
        status: p.status,
        ...extra,
        ...timestamps,
        itens: {
          create: [{ produtoId: produto.id, quantidade: p.qtd, precoUnit: produto.precoAtacado }],
        },
      },
    });

    pedidosCriados.push({
      id: pedido.id,
      lojistaId: pedido.lojistaId,
      valorCusto: Number(pedido.valorCusto),
      status: pedido.status,
    });
  }
  console.log(`✔ ${pedidosSeed.length} pedidos criados (todos os status de fulfillment)`);

  // ─── Fatura de exemplo (lojista2) — testa listagem/ações sem precisar gerar ──
  const pedidoEntregueLojista2 = pedidosCriados.find(
    (p) => p.lojistaId === lojistas["lojista2@teste.com"].lojistaId && p.status === "ENTREGUE"
  );
  if (pedidoEntregueLojista2) {
    const periodoInicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const vencimento = new Date(now);
    vencimento.setDate(vencimento.getDate() + 7);

    const fatura = await prisma.fatura.upsert({
      where: { numero: `FAT-${now.getFullYear()}-0001` },
      update: {},
      create: {
        lojistaId: lojistas["lojista2@teste.com"].lojistaId,
        numero: `FAT-${now.getFullYear()}-0001`,
        periodoInicio,
        periodoFim: now,
        totalPedidos: 1,
        valorTotal: pedidoEntregueLojista2.valorCusto,
        status: "PENDENTE",
        vencimento,
      },
    });

    await prisma.pedido.update({
      where: { id: pedidoEntregueLojista2.id },
      data: { faturaId: fatura.id },
    });
    console.log(`✔ Fatura de exemplo criada: ${fatura.numero}`);
  }

  console.log("Seed finalizado com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
