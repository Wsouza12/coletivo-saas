const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Buscando um produto existente...');
  const produto = await prisma.produtoAtacado.findFirst({
    where: { ativo: true },
  });

  if (!produto) {
    console.log('Nenhum produto ativo encontrado no banco para vincular a caixa.');
    process.exit(1);
  }

  console.log(`Produto escolhido: ${produto.nome}`);

  const codigoRastreio = `TESTE-${Math.floor(1000 + Math.random() * 9000)}`;

  // Criar Rodada Atacado
  const rodada = await prisma.rodadaAtacado.create({
    data: {
      produtoAtacadoId: produto.id,
      slug: `teste-${Date.now()}`,
      status: 'FECHADA',
      codigoRastreio,
      metaUnidades: 10,
      custoUnitario: produto.precoCatalogo || 5,
      precoFinalUnitario: produto.precoVendaSugerido || 10,
    },
  });

  console.log(`Caixa criada com sucesso! Código de Rastreio: ${codigoRastreio}`);

  // CPFs falsos para teste
  const cpfs = [
    '12345678900', // CPF principal para testar!
    '11122233344',
    '99988877766',
    '44455566677',
    '12312312312',
    '32132132132',
  ];

  // Criar 6 compradores (Reservas Pagas)
  for (let i = 0; i < 6; i++) {
    await prisma.reservaAtacado.create({
      data: {
        rodadaId: rodada.id,
        quantidade: 1,
        compradorNome: `Comprador Teste ${i + 1}`,
        compradorDoc: cpfs[i],
        compradorEmail: `comprador${i + 1}@teste.com`,
        compradorTelefone: '5511999999999',
        cep: '01001000',
        enderecoEntrega: { logradouro: 'Rua Teste', numero: '123' },
        valorProduto: 100,
        valorTaxaServico: 10,
        valorFrete: 20,
        valorTotal: 130,
        status: 'PAGO',
      },
    });
    console.log(`- Comprador ${i + 1} adicionado com CPF: ${cpfs[i]}`);
  }

  console.log('\n--- RESUMO DO TESTE ---');
  console.log(`Vá na tela de rastreio e busque por:`);
  console.log(`1. Código: ${codigoRastreio} (para ver a tela detalhada da caixa)`);
  console.log(`2. CPF: 12345678900 (para ver a listagem de caixas do cliente)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
