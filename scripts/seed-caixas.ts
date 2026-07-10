import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  // Pegar um produto qualquer que esteja ativo e tenha variações se possível
  const produto = await prisma.produtoAtacado.findFirst({
    where: { ativo: true },
    include: { cores: true }
  });

  if (!produto) {
    console.log("Nenhum produto encontrado para criar a caixa teste");
    return;
  }

  const variacoes = produto.cores.length > 0 ? produto.cores : [];

  const ceps = ["36010-000", "01310-100", "30130-000", "20000-000", "40000-000", "50000-000", "60000-000", "70000-000"];
  const nomes = ["João Silva", "Maria Souza", "Ana Oliveira", "Pedro Santos", "Carlos Ferreira", "Marta Gomes", "José Pereira", "Lucia Alves"];

  for (let i = 1; i <= 2; i++) {
    const slugId = randomUUID().substring(0, 8);
    
    console.log(`Criando rodada teste ${i}...`);
    const rodada = await prisma.rodadaAtacado.create({
      data: {
        produtoAtacadoId: produto.id,
        slug: `caixa-teste-fechada-${i}-${slugId}`,
        metaUnidades: 100,
        unidadesReservadas: 100,
        custoUnitario: 10,
        precoFinalUnitario: 20,
        status: "FECHADA",
      }
    });

    for (let j = 0; j < 8; j++) {
      let varData = null;
      if (variacoes.length > 0) {
        // Escolher uma ou duas variacoes aleatórias
        const v1 = variacoes[j % variacoes.length];
        varData = [{ variacaoId: v1.id, quantidade: 10, corId: v1.id }];
      }

      await prisma.reservaAtacado.create({
        data: {
          rodadaId: rodada.id,
          quantidade: 10 + j,
          compradorNome: nomes[j],
          compradorDoc: `000.000.000-0${j}`,
          compradorEmail: `teste${j}@email.com`,
          compradorTelefone: `3299999000${j}`,
          cep: ceps[j],
          enderecoEntrega: {
            logradouro: `Rua Teste ${j}`,
            numero: `${j}00`,
            bairro: `Bairro ${j}`,
            cidade: `Cidade ${j}`,
            uf: "MG"
          },
          valorProduto: 20 * (10 + j),
          valorTaxaServico: 0,
          valorFrete: 25,
          valorTotal: 20 * (10 + j) + 25,
          metodoFrete: "Correios PAC",
          status: "PAGO",
          variacoes: varData ? JSON.parse(JSON.stringify(varData)) : null
        }
      });
    }
  }

  console.log("Caixas de teste criadas com sucesso!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
