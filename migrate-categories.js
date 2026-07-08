const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const macroMap = {
  'Casa': 'Casa, Móveis e Decoração',
  'Banheiro': 'Casa, Móveis e Decoração',
  'Video Game': 'Games',
  'Esporte': 'Esportes e Fitness',
  'Outros': 'Outros',
  'Eletrônicos › Eletrodomésticos': 'Eletrodomésticos',
  'Organizadores': 'Casa, Móveis e Decoração',
  'Eletrônicos': 'Eletrônicos, Áudio e Vídeo',
  'Saúde e Beleza': 'Beleza e Cuidado Pessoal',
  'Brinquedos': 'Brinquedos e Hobbies',
  'Produtos de limpeza': 'Casa, Móveis e Decoração',
  'Roupas': 'Calçados, Roupas e Bolsas',
  'kit de bar': 'Casa, Móveis e Decoração',
  'Torneira': 'Construção',
  'Ferramentas': 'Ferramentas',
  'Carregadores': 'Celulares e Telefones',
  'Casa › Cozinha': 'Casa, Móveis e Decoração',
  'produto de lazer': 'Esportes e Fitness',
  'Moda › Roupas': 'Calçados, Roupas e Bolsas',
  'Papelaria': 'Arte, Papelaria e Armarinho',
  'Adaptadores': 'Informática',
  ' hidráulica': 'Construção',
  'Eletroeletrônicos': 'Eletrônicos, Áudio e Vídeo',
  'Cabos': 'Eletrônicos, Áudio e Vídeo',
  'Veículos › Acessórios': 'Acessórios para Veículos',
  'Balanças': 'Casa, Móveis e Decoração',
  'Produtos de Limpeza': 'Casa, Móveis e Decoração',
  'Saúde': 'Saúde',
  'Limpeza': 'Casa, Móveis e Decoração',
  'Casa › Iluminação': 'Casa, Móveis e Decoração',
  'Acessórios': 'Celulares e Telefones', 
  'Casa › Móveis': 'Casa, Móveis e Decoração',
  'Casa › Organização': 'Casa, Móveis e Decoração',
  'Casa › Limpeza': 'Casa, Móveis e Decoração',
  'Eletrônicos › Eletroeletrônicos': 'Eletrônicos, Áudio e Vídeo',
  'Moda › Lingerie': 'Calçados, Roupas e Bolsas',
  'Moda › Acessórios': 'Calçados, Roupas e Bolsas',
  'Moda › Mochilas': 'Calçados, Roupas e Bolsas',
  'Organização': 'Casa, Móveis e Decoração',
  'Moda › Infantil': 'Bebês',
  'Saúde › Equipamentos Médicos': 'Saúde',
  'Beleza': 'Beleza e Cuidado Pessoal',
  'Fontes de Notebook': 'Informática',
  'Redes': 'Informática',
  'Equipamentos': 'Ferramentas',
  'Iluminação': 'Casa, Móveis e Decoração'
};

async function run() {
  console.log('Iniciando migração de categorias dos produtos...');
  let count = 0;

  for (const [oldCat, newCat] of Object.entries(macroMap)) {
    const res = await prisma.produtoAtacado.updateMany({
      where: { categoria: oldCat },
      data: { categoria: newCat }
    });
    if (res.count > 0) {
      console.log(`Atualizados ${res.count} produtos de '${oldCat}' para '${newCat}'`);
      count += res.count;
    }
  }

  console.log(`\nTotal de ${count} produtos atualizados.`);

  console.log('\nLimpando tabela GrupoWhatsappCategoria...');
  
  // Guardar as categorias especiais antes de deletar
  const solicitacoes = await prisma.grupoWhatsappCategoria.findFirst({ where: { categoria: 'SOLICITACOES' } });
  const suporte = await prisma.grupoWhatsappCategoria.findFirst({ where: { categoria: 'suporte' } });

  // Pegar o ID do grupo "PRODUTOS DISPONÍVEIS" que o admin usa para tudo
  const produtosDisponiveis = await prisma.grupoWhatsappCategoria.findFirst({ 
    where: { grupoNome: 'PRODUTOS DISPONÍVEIS' } 
  });
  const defaultGroupId = produtosDisponiveis ? produtosDisponiveis.grupoId : '120363408906523305@g.us';

  // Deletar todas as categorias da tabela GrupoWhatsappCategoria
  await prisma.grupoWhatsappCategoria.deleteMany();

  // Recriar as categorias Macro oficiais + as especiais
  const macroCategoriasOficiais = [
    "Acessórios para Veículos", "Agro", "Alimentos e Bebidas", "Animais", "Antiguidades e Coleções", 
    "Arte, Papelaria e Armarinho", "Bebês", "Beleza e Cuidado Pessoal", "Brinquedos e Hobbies", 
    "Calçados, Roupas e Bolsas", "Câmeras e Acessórios", "Carros, Motos e Outros", "Casa, Móveis e Decoração", 
    "Celulares e Telefones", "Construção", "Eletrodomésticos", "Eletrônicos, Áudio e Vídeo", 
    "Esportes e Fitness", "Ferramentas", "Festas e Lembrancinhas", "Games", "Indústria e Comércio", 
    "Informática", "Instrumentos Musicais", "Joias e Relógios", "Saúde", "Outros"
  ];

  for (const cat of macroCategoriasOficiais) {
    await prisma.grupoWhatsappCategoria.create({
      data: {
        categoria: cat,
        grupoId: defaultGroupId,
        grupoNome: 'PRODUTOS DISPONÍVEIS'
      }
    });
  }

  if (solicitacoes) {
    await prisma.grupoWhatsappCategoria.create({
      data: {
        categoria: solicitacoes.categoria,
        grupoId: solicitacoes.grupoId,
        grupoNome: solicitacoes.grupoNome,
        linkConvite: solicitacoes.linkConvite,
        moderadorAtivo: solicitacoes.moderadorAtivo,
        assistenteGroqAtivo: solicitacoes.assistenteGroqAtivo,
        assistenteGroqPrompt: solicitacoes.assistenteGroqPrompt,
        aceitaSolicitacoes: solicitacoes.aceitaSolicitacoes
      }
    });
  }

  if (suporte) {
    await prisma.grupoWhatsappCategoria.create({
      data: {
        categoria: suporte.categoria,
        grupoId: suporte.grupoId,
        grupoNome: suporte.grupoNome,
        linkConvite: suporte.linkConvite,
        moderadorAtivo: suporte.moderadorAtivo,
        assistenteGroqAtivo: suporte.assistenteGroqAtivo,
        assistenteGroqPrompt: suporte.assistenteGroqPrompt,
        aceitaSolicitacoes: suporte.aceitaSolicitacoes
      }
    });
  }

  console.log('Tabela de Grupos recriada com as 26 Macro Categorias limpas + SOLICITACOES e SUPORTE!');
}

run().catch(console.error).finally(() => prisma.$disconnect());
