import Groq from 'groq-sdk'
import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
} from 'groq-sdk/resources/chat/completions'

let _groq: Groq | null = null

function getClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY não configurada — recursos de IA indisponíveis')
  }
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

// Modelo gratuito mais capaz disponível na Groq
const MODEL = 'llama-3.3-70b-versatile'
// Fallback mais leve — usado quando o modelo principal bate o limite diário de
// tokens (TPD), já que os limites são contados por modelo na Groq.
const MODEL_FALLBACK = 'llama-3.1-8b-instant'
// Modelo multimodal (texto+imagem) — único usado pra análise de foto de capa.
const MODEL_VISION = 'meta-llama/llama-4-scout-17b-16e-instruct'

function parseJsonResponse<T>(content: string): T {
  const cleaned = content.replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned) as T
}

function isRateLimitError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as { status?: number }).status === 429
  )
}

// Roda a chamada no modelo principal; se bater rate limit (429), tenta de
// novo no modelo fallback antes de desistir. Erros de quota viram uma
// mensagem amigável em vez do JSON cru da API.
async function criarChatComFallback(
  params: Omit<ChatCompletionCreateParamsNonStreaming, 'model'>
): Promise<ChatCompletion> {
  try {
    return await getClient().chat.completions.create({ ...params, model: MODEL })
  } catch (err) {
    if (!isRateLimitError(err)) throw err
    try {
      return await getClient().chat.completions.create({ ...params, model: MODEL_FALLBACK })
    } catch (fallbackErr) {
      if (isRateLimitError(fallbackErr)) {
        throw new Error(
          'A IA atingiu o limite diário de uso. Tente novamente em alguns minutos ou cadastre manualmente.'
        )
      }
      throw fallbackErr
    }
  }
}

// Otimizar anúncio Mercado Livre
export async function otimizarAnuncioML(produto: {
  nome: string
  descricao: string
  categoria: string
  atributos?: Record<string, string>
}): Promise<{
  titulo: string
  descricao: string
  palavrasChave: string[]
}> {
  const chat = await criarChatComFallback({
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content:
          'Você é especialista em otimização de anúncios no Mercado Livre Brasil. Retorne APENAS JSON válido sem markdown.',
      },
      {
        role: 'user',
        content: `
Produto: ${produto.nome}
Descrição: ${produto.descricao}
Categoria: ${produto.categoria}
Atributos: ${JSON.stringify(produto.atributos || {})}

Retorne JSON:
{
  "titulo": "máx 60 chars sem pontuação incluindo marca modelo e característica principal",
  "descricao": "HTML completo persuasivo em pt-BR com benefícios especificações e conteúdo da caixa",
  "palavrasChave": ["termo1","termo2","termo3","termo4","termo5"]
}`,
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

// Otimizar anúncio Shopee
export async function otimizarAnuncioShopee(produto: {
  nome: string
  descricao: string
  categoria: string
}): Promise<{
  titulo: string
  descricao: string
}> {
  const chat = await criarChatComFallback({
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content:
          'Você é especialista em otimização de anúncios na Shopee Brasil. Retorne APENAS JSON válido sem markdown.',
      },
      {
        role: 'user',
        content: `
Produto: ${produto.nome}
Descrição: ${produto.descricao}
Categoria: ${produto.categoria}

Retorne JSON:
{
  "titulo": "máx 120 chars com emojis relevantes e palavras-chave",
  "descricao": "descrição completa em pt-BR com emojis bullet points benefícios e especificações"
}`,
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

// Gerar título e descrição de kit (combo de produtos) a partir dos produtos reais
// selecionados — nunca inventa produto/medida, só combina o que já está no cadastro.
export async function gerarTituloDescricaoKit(produtos: { nome: string; quantidade: number }[]): Promise<{
  nome: string
  descricao: string
}> {
  const listaProdutos = produtos.map((p) => `- ${p.quantidade}x ${p.nome}`).join('\n')

  const chat = await criarChatComFallback({
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content:
          'Você ajuda a nomear e descrever kits/combos de produtos pra um catálogo de revenda. Use só os produtos informados, não invente itens ou características que não foram ditas. Retorne APENAS JSON válido sem markdown.',
      },
      {
        role: 'user',
        content: `
Produtos que compõem o kit:
${listaProdutos}

Retorne JSON:
{
  "nome": "nome comercial curto do kit, máx 80 chars, mencionando os produtos principais",
  "descricao": "descrição curta e objetiva do kit em pt-BR (2-4 frases), explicando o que vem incluso, sem inventar características que não foram informadas"
}`,
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

// Gera uma descrição curta de produto pro catálogo do atacado, a partir dos
// dados que o admin já tem (nome/categoria/marca/voltagem). Texto puro, sem JSON.
export async function gerarDescricaoProdutoAtacado(dados: {
  nome: string
  categoria?: string | null
  marca?: string | null
  voltagem?: string | null
}): Promise<string> {
  const contexto = [
    `Nome: ${dados.nome}`,
    dados.categoria ? `Categoria: ${dados.categoria}` : null,
    dados.marca ? `Marca: ${dados.marca}` : null,
    dados.voltagem ? `Voltagem: ${dados.voltagem}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const chat = await criarChatComFallback({
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content:
          'Você escreve descrições curtas e vendedoras de produtos para um catálogo de compra coletiva em pt-BR. Use só o que foi informado, não invente especificações técnicas (medidas, capacidade, etc) que não foram ditas. Responda apenas o texto da descrição, sem títulos, sem markdown, sem aspas.',
      },
      {
        role: 'user',
        content: `Escreva uma descrição de 2 a 4 frases para este produto:\n${contexto}`,
      },
    ],
  })

  return (chat.choices[0].message.content ?? '').trim()
}

// Escreve/melhora um aviso pra postar no grupo da comunidade de compras
// coletivas. Recebe a ideia do admin (rascunho ou tópicos) e devolve o texto
// pronto, animado e claro, pronto pra colar no WhatsApp.
export async function gerarTextoAviso(ideia: string): Promise<string> {
  const chat = await criarChatComFallback({
    temperature: 0.8,
    messages: [
      {
        role: 'system',
        content:
          'Você escreve avisos curtos e animados para o grupo de WhatsApp de uma comunidade de compras coletivas (atacado) em pt-BR. Tom amigável e direto, pode usar emojis com moderação e *negrito* do WhatsApp (asteriscos). Não invente datas, preços ou promoções que não foram ditos. Responda APENAS o texto do aviso, sem títulos extras, sem aspas, sem markdown de código.',
      },
      {
        role: 'user',
        content: `Escreva (ou melhore) este aviso pra comunidade:\n${ideia}`,
      },
    ],
  })

  return (chat.choices[0].message.content ?? '').trim()
}

// Gera VÁRIAS mensagens curtas pro grupo de WhatsApp (gatilhos de venda, enquetes,
// dicas — o que o tema pedir), pra agendar em horários diferentes. Cada mensagem
// é independente e variada. Retorna um array de textos prontos pra postar.
export async function gerarGatilhosVenda(tema: string, quantidade: number, contexto?: string): Promise<string[]> {
  const n = Math.min(Math.max(1, Math.floor(quantidade)), 10);
  const temContexto = !!contexto && contexto.trim().length > 0;
  const userContent = temContexto
    ? `DADOS REAIS DA LOJA (use SÓ o que está aqui — produtos, caixas abertas, links; NÃO invente nada além disso):\n${contexto}\n\nTema/estilo desejado: ${tema}\n\nGere ${n} mensagens diferentes citando esses produtos/caixas reais e incluindo o link quando fizer sentido.`
    : `Gere ${n} mensagens diferentes pra postar no grupo, no tema/contexto:\n${tema}`;
  const chat = await criarChatComFallback({
    temperature: 0.95,
    messages: [
      {
        role: 'system',
        content:
          'Você é o dono de uma comunidade de compras coletivas (atacado) no WhatsApp e escreve as mensagens do grupo em pt-BR — como se fosse você mesmo, não um robô. Tom humano, animado, persuasivo, pode usar emojis com moderação e *negrito* do WhatsApp (asteriscos). NUNCA invente preços, datas, produtos ou promoções que não foram ditos — se vierem DADOS REAIS, use apenas eles. NUNCA cite fornecedor, marca de origem, custo de compra ou número de página de catálogo (é sigiloso). Cada mensagem deve ser CURTA (1 a 3 linhas), diferente das outras, e servir pra manter o grupo aquecido / gerar vontade de comprar. Responda APENAS um array JSON de strings, sem markdown, sem numeração, sem texto extra. Ex: ["msg 1","msg 2"].',
      },
      { role: 'user', content: userContent },
    ],
  })

  const raw = (chat.choices[0].message.content ?? '').trim()
  // Tenta parsear o array JSON; se vier com lixo em volta, extrai o trecho [..].
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    const arr = JSON.parse(match?.[0] ?? raw)
    if (Array.isArray(arr)) return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, n)
  } catch {
    // fallback: quebra por linhas não vazias
  }
  return raw
    .split(/\n+/)
    .map((l) => l.replace(/^\s*[-*\d.)]+\s*/, '').trim())
    .filter(Boolean)
    .slice(0, n)
}

// Gera um prompt em INGLÊS pra colar num gerador de imagem externo (Midjourney/DALL-E/
// Stable Diffusion etc — o sistema não gera imagem). Prompt em inglês de propósito: é o
// idioma que esses geradores entendem melhor. A ideia do admin vem em português.
export async function gerarPromptImagem(ideia: string): Promise<string> {
  const chat = await criarChatComFallback({
    temperature: 0.8,
    messages: [
      {
        role: 'system',
        content:
          "You write detailed, vivid prompts in ENGLISH for AI image generators (Midjourney/DALL-E/Stable Diffusion style), based on a short idea given in Portuguese by a Brazilian seller who wants a banner/image for a WhatsApp community announcement. Describe subject, scene, style, lighting, composition and mood in one rich paragraph. Do not add markdown, quotes, or any text in Portuguese — respond with ONLY the English prompt.",
      },
      {
        role: 'user',
        content: `Ideia (em português): ${ideia}\n\nGere o prompt de imagem em inglês.`,
      },
    ],
  })

  return (chat.choices[0].message.content ?? '').trim()
}

// Sugere peso e dimensões da EMBALAGEM INDIVIDUAL (1 unidade) de um produto, a
// partir do nome/categoria — usado como apoio no cadastro/pré-cadastro do
// atacado, quando o admin não tem a medida real em mãos ainda. É uma
// ESTIMATIVA de conhecimento geral do produto, nunca uma medição real —
// sempre revisar/substituir pelo valor real quando souber.
export async function sugerirPesoDimensoes(
  nome: string,
  categoria?: string
): Promise<{ pesoKg: number; comprimentoCm: number; larguraCm: number; alturaCm: number; categoria?: string }> {
  const chat = await criarChatComFallback({
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content:
          'Você estima peso e dimensões de EMBALAGEM INDIVIDUAL (1 unidade, como vendida no varejo/blister/caixinha) de produtos, baseado em conhecimento geral de produtos parecidos. Nunca invente medidas absurdas — pense num produto real desse tipo e estime a caixinha dele. Também sugira a categoria mais adequada dentre as opções disponíveis. Retorne APENAS JSON válido sem markdown.',
      },
      {
        role: 'user',
        content: `
Produto: ${nome}
${categoria ? `Categoria: ${categoria}` : ''}

Estime peso e dimensões da embalagem individual deste produto (não da caixa fechada com várias unidades). Também sugira a categoria mais adequada dentre: Eletrônicos, Casa, Moda, Esporte, Beleza, Outros.
Retorne JSON:
{
  "pesoKg": número em kg (ex: 0.12),
  "comprimentoCm": número inteiro em cm,
  "larguraCm": número inteiro em cm,
  "alturaCm": número inteiro em cm,
  "categoria": "uma das categorias acima"
}`,
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

// Chat automático — responde perguntas de clientes no ML
export async function responderPerguntaML(
  pergunta: string,
  produto: {
    nome: string
    descricao: string
    atributos?: Record<string, string>
  }
): Promise<string> {
  const chat = await criarChatComFallback({
    temperature: 0.5,
    messages: [
      {
        role: 'system',
        content: `Você é atendente virtual simpático de uma loja no Mercado Livre Brasil.
Produto: ${produto.nome}
Descrição: ${produto.descricao}
Atributos: ${JSON.stringify(produto.atributos || {})}
Regras: responda em máx 3 frases, seja direto e profissional, não invente informações.`,
      },
      {
        role: 'user',
        content: pergunta,
      },
    ],
  })

  return chat.choices[0].message.content!.trim()
}

// Sugere variações de busca pro título do produto, pra testar contra a API real de
// domain_discovery do ML (nunca inventa category_id — só sugere frases alternativas
// de busca). Existe porque a busca do ML é literal e às vezes erra feio com o título
// de marketing completo (ex: "Creatina Gumway Gummies 60 - Suplemento Alimentício" cai
// em "Suplementos para Cavalos", mas "Creatina em pó" acerta "Suplementos"). A IA
// ajuda a gerar essas variações mais genéricas/literais; o category_id final sempre
// vem da resposta real do ML, nunca da IA.
export async function sugerirVariacoesBuscaCategoriaML(nomeProduto: string): Promise<string[]> {
  const chat = await criarChatComFallback({
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          'Você ajuda a montar buscas eficazes no catálogo do Mercado Livre Brasil. Retorne APENAS JSON válido sem markdown.',
      },
      {
        role: 'user',
        content: `
Título de anúncio: "${nomeProduto}"

A busca de categoria do Mercado Livre é literal e ingênua: palavras de formato/textura
(gummies, goma, bala, gomas, cápsula, sachê) e de marca/sabor/quantidade costumam jogar a
busca pra categoria errada (ex: "Creatina Gummies" cai em produto pra animal/doce, mas só
"Creatina" acerta suplemento humano). Gere até 3 variações curtas dessa busca, da mais pra
menos específica, terminando SEMPRE numa variação mínima de 1-2 palavras só com o
princípio ativo/tipo de produto central, sem marca, sabor, formato físico (gummies/goma/
bala/cápsula/pó/sachê) nem quantidade. Não invente nada sobre o produto. Exemplo pro título
"Creatina Gumway Gummies 60 - Suplemento Alimentício": ["Creatina monohidratada",
"Suplemento de creatina", "Creatina"]. Retorne JSON:
{
  "variacoes": ["busca 1", "busca 2", "busca mínima"]
}`,
      },
    ],
  })

  const { variacoes } = parseJsonResponse<{ variacoes: string[] }>(chat.choices[0].message.content!)
  return variacoes.filter((v) => v && v.trim()).slice(0, 3)
}

// Analisar produto em alta — sugerir preço e estratégia
export async function analisarProduto(produto: {
  nome: string
  precoAtacado: number
  categoria: string
  vendas7dias: number
}): Promise<{
  precoSugerido: number
  margem: number
  estrategia: string
  pontosFraqueza: string[]
}> {
  const chat = await criarChatComFallback({
    temperature: 0.6,
    messages: [
      {
        role: 'system',
        content:
          'Você é consultor de e-commerce especialista em Mercado Livre e Shopee Brasil. Retorne APENAS JSON válido sem markdown.',
      },
      {
        role: 'user',
        content: `
Produto: ${produto.nome}
Custo atacado: R$${produto.precoAtacado}
Categoria: ${produto.categoria}
Vendas últimos 7 dias na plataforma: ${produto.vendas7dias}

Retorne JSON:
{
  "precoSugerido": número em reais,
  "margem": percentual de margem sugerida,
  "estrategia": "dica de uma frase para vender mais",
  "pontosFraqueza": ["ponto1","ponto2"]
}`,
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

// Extrai dados estruturados de produto a partir do conteúdo de uma página (ML,
// Shopee, Alibaba, AliExpress) já buscada via lib/scraper.ts. NCM e categoria
// são sempre tratados como SUGESTÃO — nunca preenchidos automaticamente como
// dado oficial, já que NCM tem implicação fiscal real.
export type DadosProdutoExtraidos = {
  nome: string
  titulo: string
  descricao: string
  marca: string
  modelo: string
  gtin: string
  mpn: string
  condicao: string
  atributos: Record<string, string>
  ncmSugerido: string
  categoriaSugerida: string
  tipoAnuncioSugerido: string
  garantiaTipoSugerida: string
  garantiaPrazoSugerido: string
  garantiaCondicoesSugeridas: string
}

const FORMATO_RESPOSTA_PRODUTO = `{
  "nome": "nome comercial do produto, claro e objetivo, máx 80 chars",
  "titulo": "título otimizado para anúncio em marketplace, máx 60 caracteres, com marca + modelo + característica principal, sem emojis, sem CAIXA ALTA",
  "descricao": "descrição em português, sem HTML e sem markdown, seguindo a estrutura: apresentação, principais benefícios, diferenciais, características técnicas, aplicações/compatibilidade, conteúdo da embalagem (se souber) — texto corrido, persuasivo, original",
  "marca": "marca do produto, ou string vazia se não identificar",
  "modelo": "modelo/referência do produto, ou string vazia",
  "gtin": "código GTIN/EAN/UPC do produto, ou string vazia se não identificar",
  "mpn": "Manufacturer Part Number, ou string vazia se não identificar",
  "condicao": "Novo, Usado ou Recondicionado — use 'Novo' se não houver indicação em contrário",
  "atributos": {"cor": "...", "material": "...", "tamanho": "...", "voltagem": "...", "capacidade": "..."},
  "ncmSugerido": "código NCM de 8 dígitos mais provável para este tipo de produto — APENAS UMA SUGESTÃO, deixe vazio se não tiver confiança razoável",
  "categoriaSugerida": "Escolha OBRIGATORIAMENTE APENAS UMA das Macro Categorias: Acessórios para Veículos, Agro, Alimentos e Bebidas, Animais, Antiguidades e Coleções, Arte, Papelaria e Armarinho, Bebês, Beleza e Cuidado Pessoal, Brinquedos e Hobbies, Calçados, Roupas e Bolsas, Câmeras e Acessórios, Carros, Motos e Outros, Casa, Móveis e Decoração, Celulares e Telefones, Construção, Eletrodomésticos, Eletrônicos, Áudio e Vídeo, Esportes e Fitness, Ferramentas, Festas e Lembrancinhas, Games, Indústria e Comércio, Informática, Instrumentos Musicais, Joias e Relógios, Saúde. NUNCA crie subcategorias.",
  "tipoAnuncioSugerido": "Clássico, Premium ou Destaque — sugira Premium/Destaque só para produtos de ticket mais alto ou alta concorrência, senão Clássico",
  "garantiaTipoSugerida": "Garantia do fabricante, Garantia do vendedor ou Sem garantia",
  "garantiaPrazoSugerido": "prazo típico de garantia pra esse tipo de produto, ex: '90 dias', '12 meses'",
  "garantiaCondicoesSugeridas": "condições de garantia em 1-2 frases, ex: cobre defeitos de fabricação, não cobre mau uso"
}`

const SYSTEM_PROMPT_PRODUTO =
  'Você é especialista em cadastro de produtos para marketplaces brasileiros (Mercado Livre, Shopee) e em SEO/conversão para anúncios. Retorne APENAS JSON válido sem markdown. Se não conseguir identificar um campo com confiança, retorne string vazia — nunca invente GTIN, MPN ou NCM.'

// Extrai dados estruturados de produto a partir do conteúdo de uma página (ML,
// Shopee, Alibaba, AliExpress) já buscada via lib/scraper.ts. NCM e categoria
// são sempre tratados como SUGESTÃO — nunca preenchidos automaticamente como
// dado oficial, já que NCM tem implicação fiscal real.
export async function extrairDadosProdutoDeConteudo(pagina: {
  titulo: string
  descricaoMeta: string
  textoVisivel: string
}): Promise<DadosProdutoExtraidos> {
  const chat = await criarChatComFallback({
    temperature: 0.3,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_PRODUTO },
      {
        role: 'user',
        content: `
Título da página: "${pagina.titulo}"
Descrição (meta): "${pagina.descricaoMeta}"
Texto visível da página (truncado): "${pagina.textoVisivel}"

Extraia os dados do produto. Retorne JSON:
${FORMATO_RESPOSTA_PRODUTO}`,
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

// Mesma extração, mas a partir só do nome/descrição informados pelo admin
// (sem link de referência) — usado quando não há página pra ler.
export async function extrairDadosProdutoDeNome(nomeProduto: string): Promise<DadosProdutoExtraidos> {
  const chat = await criarChatComFallback({
    temperature: 0.4,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_PRODUTO },
      {
        role: 'user',
        content: `
Nome do produto informado pelo lojista: "${nomeProduto}"

Com base no seu conhecimento sobre este tipo de produto (sem inventar dados específicos
como GTIN/MPN reais que você não tem certeza — deixe vazio nesse caso), gere um cadastro
completo. Retorne JSON:
${FORMATO_RESPOSTA_PRODUTO}`,
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

// Sugestão de preço de venda pra produto recém-cadastrado (sem histórico de
// vendas ainda) — usada na etapa de Precificação do wizard de cadastro.
export async function sugerirPrecoVenda(produto: {
  nome: string
  categoria: string
  custoReal: number
}): Promise<{ precoSugerido: number; margem: number; justificativa: string }> {
  const chat = await criarChatComFallback({
    temperature: 0.4,
    messages: [
      {
        role: 'system',
        content:
          'Você é consultor de precificação para e-commerce brasileiro (Mercado Livre/Shopee). Retorne APENAS JSON válido sem markdown.',
      },
      {
        role: 'user',
        content: `
Produto: ${produto.nome}
Categoria: ${produto.categoria}
Custo real (o que o vendedor paga): R$${produto.custoReal}

Sugira um preço de venda competitivo considerando margem saudável, taxas típicas de marketplace
(~12-16%) e preço percebido pelo consumidor. Retorne JSON:
{
  "precoSugerido": número em reais,
  "margem": percentual de margem sobre o custo,
  "justificativa": "uma frase explicando o racional"
}`,
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

// Valida só a foto de capa (a 1ª enviada ao ML) contra a exigência de fundo
// branco/neutro de várias categorias do ML. Usa modelo multimodal direto
// (sem fallback de texto, que não processa imagem) — chamador deve tratar
// falha de API (rede/quota) como "não bloqueia", já que é uma checagem
// best-effort, não uma fonte de verdade.
export async function analisarFotoCapa(
  imageUrl: string
): Promise<{ fundoAdequado: boolean; motivo: string }> {
  const chat = await getClient().chat.completions.create({
    model: MODEL_VISION,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Você avalia fotos de capa de anúncio para o Mercado Livre. O ML exige, pra várias
categorias, que a foto de capa tenha fundo branco ou neutro liso, sem sombra forte, sem texto,
sem marca-d'água, sem logo e sem colagem de várias fotos — produto ocupando a maior parte do
quadro. Avalie a imagem a seguir e responda APENAS JSON, sem markdown:
{
  "fundoAdequado": true ou false,
  "motivo": "uma frase curta explicando o problema encontrado, ou 'Fundo adequado' se estiver ok"
}`,
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

export type DadosProdutoCatalogo = {
  codigo: string
  nome: string
  categoria: string
  custoUnitario: number | null
  precoCatalogo: number | null
  unidadesPorCaixa: number | null
  marca: string
  voltagem: string
  codigoAnatel: string
  pesoKg: number | null
  comprimentoCm: number | null
  larguraCm: number | null
  alturaCm: number | null
}

// Lê o recorte de um produto numa página de catálogo de fornecedor (foto + texto:
// código, nome, preço) e extrai os campos pra autopreencher o pré-cadastro. Usa o
// modelo de visão direto (sem fallback de texto, que não processa imagem). Best-
// effort: o admin sempre revisa antes de salvar, então campo não lido vem vazio/
// null em vez de inventado.
export async function extrairDadosProdutoDeImagem(imageUrl: string): Promise<DadosProdutoCatalogo> {
  const chat = await getClient().chat.completions.create({
    model: MODEL_VISION,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `A imagem é o recorte de UM produto numa página de catálogo de fornecedor. Geralmente
tem a foto do produto, um código (ex: MM-GJ047, SN-9, MO-305T), o nome do produto, um ou dois
preços em reais, e a quantidade por caixa (impressa como "PÇS/CX", "PCS/CX", "PC/CX" ou "UN/CX"
seguida de um número, ex: "PÇS/CX 30"). Extraia o que conseguir ler com confiança. NÃO invente: se
não conseguir ler um campo, devolva string vazia (texto) ou null (número). PREÇOS: este é um
catálogo do fornecedor, então o preço impresso é o CUSTO de aquisição (quanto o lojista paga).
Se houver SÓ UM preço (caso mais comum), devolva esse valor em "custoUnitario" e deixe
"precoCatalogo" como null. Se houver DOIS preços (raro), o MENOR vai em "custoUnitario" e o
MAIOR em "precoCatalogo". NUNCA coloque um preço em "precoCatalogo" se não há um segundo preço
maior visível. A categoria é o tipo geral do produto. Escolha OBRIGATORIAMENTE APENAS UMA das seguintes Macro Categorias oficiais: "Acessórios para Veículos", "Agro", "Alimentos e Bebidas", "Animais", "Antiguidades e Coleções", "Arte, Papelaria e Armarinho", "Bebês", "Beleza e Cuidado Pessoal", "Brinquedos e Hobbies", "Calçados, Roupas e Bolsas", "Câmeras e Acessórios", "Carros, Motos e Outros", "Casa, Móveis e Decoração", "Celulares e Telefones", "Construção", "Eletrodomésticos", "Eletrônicos, Áudio e Vídeo", "Esportes e Fitness", "Ferramentas", "Festas e Lembrancinhas", "Games", "Indústria e Comércio", "Informática", "Instrumentos Musicais", "Joias e Relógios", "Saúde". NUNCA crie uma categoria nova ou subcategoria específica (ex: use "Eletrônicos, Áudio e Vídeo", NUNCA "Pilhas" ou "Rádios").
A MARCA costuma aparecer como LOGOTIPO no topo do quadro do produto (ex: "Átomo", "Tomate") — leia
o nome do logo mesmo que estilizado.
As MEDIDAS costumam aparecer como "C x L x A" seguidas da unidade (ex: "107 x 109 x 218 mm" ou
"20 x 15 x 10 cm"). CONVERTA SEMPRE PARA CENTÍMETROS e arredonde pro inteiro mais próximo (mm ÷ 10).
O PESO pode aparecer em gramas (ex: "970g") ou kg (ex: "0,97kg") — devolva sempre em KG (g ÷ 1000).
O CÓDIGO ANATEL aparece dentro ou ao lado do SELO DA ANATEL (um logo pequeno, geralmente verde/azul,
com a palavra "ANATEL") — leia o número de homologação impresso nele (formato tipo "12345-67-89012"
ou similar). Se não houver selo Anatel ou número legível, devolva string vazia.
Responda APENAS JSON, sem markdown:
{
  "codigo": "código do produto, ou string vazia",
  "nome": "nome do produto exatamente como impresso, ou string vazia",
  "categoria": "tipo/categoria do produto, ou string vazia",
  "custoUnitario": número (menor preço, sem R$, use ponto decimal) ou null,
  "precoCatalogo": número (maior preço, sem R$, use ponto decimal) ou null,
  "unidadesPorCaixa": número inteiro (peças por caixa, o número após PÇS/CX) ou null,
  "marca": "marca/logotipo do produto se visível, ou string vazia",
  "voltagem": "110V, 220V, Bivolt etc se visível, ou string vazia",
  "codigoAnatel": "número de homologação do selo Anatel, ou string vazia",
  "pesoKg": número em kg ou null,
  "comprimentoCm": número inteiro em cm (1ª medida) ou null,
  "larguraCm": número inteiro em cm (2ª medida) ou null,
  "alturaCm": número inteiro em cm (3ª medida) ou null
}`,
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

// OCR simples: lê e devolve TODO o texto visível numa página de catálogo
// (sem estruturar em produtos, sem salvar nada) — usado só pra busca por
// palavra-chave em catálogos escaneados/sem camada de texto selecionável.
export async function lerTextoPaginaCatalogo(imageUrl: string): Promise<string> {
  const chat = await getClient().chat.completions.create({
    model: MODEL_VISION,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Transcreva TODO o texto visível nesta imagem (página de catálogo de produtos), incluindo nomes de produtos, códigos e preços. Não estruture, não resuma, não traduza — apenas o texto bruto, uma linha por bloco de texto que encontrar. Se não houver texto legível, responda apenas com uma string vazia.',
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
  })

  return (chat.choices[0].message.content ?? '').trim()
}

// Compara uma foto de referência com uma página de catálogo: a IA diz se o
// MESMO produto (ou um muito parecido) aparece na página — usado pela busca
// visual, que varre página por página sem salvar nada no banco.
export async function comparaImagemComPaginaCatalogo(
  imagemReferenciaUrl: string,
  imagemPaginaUrl: string
): Promise<{ encontrado: boolean; confianca: "alta" | "media" | "baixa" }> {
  const chat = await getClient().chat.completions.create({
    model: MODEL_VISION,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `A PRIMEIRA imagem é uma foto de referência de um produto. A SEGUNDA imagem é uma
página de catálogo de fornecedor, normalmente organizada em GRADE com várias miniaturas pequenas de
produtos diferentes lado a lado. Examine CADA miniatura da grade individualmente, uma por uma —
não julgue a página como um todo de uma vez. Considere "encontrado" se o MESMO produto (mesmo tipo/
formato/função, mesmo se a cor ou pequenos detalhes variarem) aparecer em QUALQUER uma das
miniaturas, mesmo que pequena ou em ângulo diferente da foto de referência.
Responda APENAS JSON, sem markdown:
{
  "encontrado": true ou false,
  "confianca": "alta", "media" ou "baixa"
}`,
          },
          { type: 'image_url', image_url: { url: imagemReferenciaUrl } },
          { type: 'image_url', image_url: { url: imagemPaginaUrl } },
        ],
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}

// Lote: Lê uma página inteira de catálogo de fornecedor e extrai TODOS os produtos visíveis nela.
// Retorna um array com os dados de cada produto.
export async function extrairMultiplosProdutosDePagina(imageUrl: string): Promise<{ produtos: DadosProdutoCatalogo[] }> {
  const chat = await getClient().chat.completions.create({
    model: MODEL_VISION,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `A imagem é uma página inteira de um catálogo de fornecedor. Ela contém vários produtos.
Para cada produto, extraia os mesmos campos detalhados. Se não conseguir ler um campo de um produto específico, devolva string vazia (texto) ou null (número).
PREÇOS: este é um catálogo do fornecedor, então o preço impresso é o CUSTO de aquisição.
Se houver SÓ UM preço no produto, devolva esse valor em "custoUnitario" e deixe "precoCatalogo" como null.
A categoria é o tipo geral do produto. Escolha OBRIGATORIAMENTE APENAS UMA das seguintes Macro Categorias oficiais: "Acessórios para Veículos", "Agro", "Alimentos e Bebidas", "Animais", "Antiguidades e Coleções", "Arte, Papelaria e Armarinho", "Bebês", "Beleza e Cuidado Pessoal", "Brinquedos e Hobbies", "Calçados, Roupas e Bolsas", "Câmeras e Acessórios", "Carros, Motos e Outros", "Casa, Móveis e Decoração", "Celulares e Telefones", "Construção", "Eletrodomésticos", "Eletrônicos, Áudio e Vídeo", "Esportes e Fitness", "Ferramentas", "Festas e Lembrancinhas", "Games", "Indústria e Comércio", "Informática", "Instrumentos Musicais", "Joias e Relógios", "Saúde". NUNCA crie uma categoria nova ou subcategoria específica (ex: use "Eletrônicos, Áudio e Vídeo", NUNCA "Pilhas" ou "Rádios").
A MARCA costuma aparecer como LOGOTIPO no topo do quadro do produto.
As MEDIDAS convertidas para centímetros. O PESO em KG. O CÓDIGO ANATEL lido do selo.
Retorne APENAS um JSON contendo uma lista "produtos" com todos os itens identificados, sem markdown:
{
  "produtos": [
    {
      "codigo": "...",
      "nome": "...",
      "categoria": "...",
      "custoUnitario": 10.50,
      "precoCatalogo": null,
      "unidadesPorCaixa": 20,
      "marca": "...",
      "voltagem": "...",
      "codigoAnatel": "...",
      "pesoKg": 0.5,
      "comprimentoCm": 10,
      "larguraCm": 5,
      "alturaCm": 5
    }
  ]
}`,
          },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      },
    ],
  })

  return parseJsonResponse(chat.choices[0].message.content!)
}


export async function gerarConteudoInstagram(produto: {
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  marca?: string | null;
  precoVendaSugerido?: number | null;
}): Promise<{
  legendaPost: string;
  legendaStory: string;
  hashtags: string;
}> {
  const groq = getClient();
  const chat = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'Você é um copywriter especialista em Instagram para e-commerce e atacado brasileiro. Retorne APENAS JSON válido sem markdown.',
      },
      {
        role: 'user',
        content: `Gere conteúdo para Instagram do produto abaixo. Estilo: direto, com emojis, tom de oferta/atacado brasileiro. Use o preço se disponível.\n\nProduto: ${produto.nome}\nCategoria: ${produto.categoria ?? ''}\nMarca: ${produto.marca ?? ''}\nDescrição: ${produto.descricao ?? ''}\nPreço sugerido: ${produto.precoVendaSugerido ? 'R$ ' + produto.precoVendaSugerido.toFixed(2) : 'não informado'}\n\nRetorne JSON:\n{\n  "legendaPost": "legenda longa pro feed (até 300 chars), emojis, sem hashtags",\n  "legendaStory": "texto curtinho pro story (até 80 chars), impactante",\n  "hashtags": "#atacado #comprasecoletivas #produto ... (10-15 tags relevantes)"\n}`,
      },
    ],
  });
  return parseJsonResponse(chat.choices[0].message.content!);
}
