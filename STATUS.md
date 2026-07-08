# STATUS — DropyAtacado

> Atualizado em 2026-07-02. Acompanha o roadmap definido em [CLAUDE.md](CLAUDE.md).
>
> **Protocolo ativo (ver CLAUDE.md):** mensagem terminando em "?" = conversa, resposta direta sem relatório.
> Mensagem terminando em "." / comando de ação = aplicar PRE-EXECUTION REPORT antes de agir.

### 🔎 Busca visual por foto no Mapa de Catálogos (2026-07-02)

Painel `/admin` → **Mapa de Catálogos** (`components/admin/mapa-catalogo-panel.tsx`). O admin
arrasta a **foto de um produto** (ex: print que o cliente mandou) e o sistema acha esse produto
tanto no catálogo cadastrado quanto nas páginas ainda não cadastradas.

- **Embeddings CLIP via Jina AI** (`lib/jina.ts`, modelo `jina-clip-v2`, 1024 dims, multimodal
  imagem+texto no mesmo espaço). **Formato correto da API Jina** (bug que travou tudo por horas):
  `input: [{ image: "data:mime;base64,..." }]` e `[{ text: "..." }]` — NÃO existe o wrapper
  `{type:"image_url", image_url:...}` (esse formato é do Groq/OpenAI, dá 422 na Jina).
- **pgvector** em duas colunas `embedding vector(1024)` (ivfflat, cosine `<=>`): `ProdutoAtacado`
  (fotos limpas dos produtos cadastrados) e `MapaCatalogoCrop` (recortes por produto das páginas
  do PDF). Ambas as colunas são **`Unsupported("vector(1024)")` no schema Prisma** — sem isso,
  `prisma db push` APAGA as colunas (aconteceu: perdeu 285+161 embeddings, teve que reindexar).
- **Fluxo da busca** (`POST /api/admin/atacado/mapeamento/buscar-foto`): 1) Groq vision extrai
  nome/código/marca; 2) gera **1 embedding** da foto e busca nas DUAS tabelas (produtos cadastrados
  threshold 0.25, crops sem threshold no debug atual — retorna top 10); 3) busca textual como
  complemento. Retorna `produtosVisuais` (cadastrados, verde) + `paginasCrop` (roxo, "não
  cadastrado, pág. X").
- **Indexação por crop** (`POST /api/admin/atacado/mapeamento/indexar-paginas`): o browser renderiza
  cada página do PDF (pdf.js, 768px), divide num **grid configurável por catálogo**
  (`CatalogoFornecedor.gridCrops`: 2x2/2x3/3x3/3x4), gera até 6 crops/página, e pra cada crop:
  INSERT do registro primeiro (garante linha mesmo se Jina falhar) → upload da imagem do recorte
  no Supabase Storage (`lib/storage.ts::uploadCropImagem`, bucket `produtos`, prefixo `crops/`) →
  embedding Jina. `MapaCatalogoCrop.imagemUrl` guarda a miniatura mostrada no card.
- **Indexação das fotos cadastradas** (`/api/admin/atacado/mapeamento/indexar-produtos`): lotes de 5
  sequenciais, pausa 2s entre lotes; ao bater **rate limit da Jina (429, 100k tokens/min)** devolve
  `rateLimited:true` e o painel aguarda 60s e retoma sozinho. (Reindexação de crops ainda NÃO tem
  esse tratamento — pendente.)
- **Modal da página** (`PaginaCatalogoModal`): clicar num card de crop renderiza a **página inteira
  do PDF** on-demand (pdf.js, 1400px) num overlay — mostra o produto no contexto real (código/preço
  do fornecedor). Não depende da miniatura salva.

**Pendências:** (1) reindexar todos os catálogos pra preencher as miniaturas dos crops
(`imagemUrl` vazio nos já indexados antes); (2) aplicar espera de 60s no 429 também na reindexação
de crops; (3) hoje o threshold de crop está removido (debug — mostra os 10 mais próximos sem filtro);
reavaliar um corte (~0.30) depois de validar a qualidade.

## 📊 CAPACIDADE E PLANO DE UPGRADE (por prioridade)

Sistema roda hoje quase todo em **planos gratuitos** — aguenta validação/início, mas cada área
tem teto. Gargalos na ordem em que aparecem (= ordem de upgrade quando o volume subir):

1. **WhatsApp em rajada (Evolution API / Railway)** — MAIS URGENTE, é risco, não custo. WhatsApp
   tem proteção anti-spam; disparar muitas mensagens 1:1 de uma vez (ex: notificar todos os
   compradores de uma caixa ao avançar etapa) pode **banir o número**. Hoje `avancarEtapaRodada` e
   `confirmarPagamentoReserva` mandam 1:1 em lote sem espaçamento. Ação: implementar espaçamento/
   fila entre envios antes de volume alto; pra escala real, WhatsApp Business API oficial (paga).
   Railway: precisa de plano pago pequeno (~US$5/mês) pra manter o serviço sempre ligado.
2. **Groq (IA) — limite diário** — pré-cadastro por imagem, descrições e otimização usam a cota
   grátis (limite por minuto e por dia, contado por modelo). Cadastro em massa num dia só pode
   travar até o dia seguinte (já tratado com aviso + fallback manual). Upgrade: plano pago Groq.
3. **Supabase Free (banco)** — 500 MB DB + pausa por inatividade + conexões simultâneas limitadas.
   É o **primeiro upgrade "obrigatório"** quando o uso real subir (Supabase Pro ~US$25/mês). Texto
   (usuários/produtos/pedidos) cabe aos milhares; o aperto vem nas conexões simultâneas.
4. **Storage de fotos (Supabase Storage Free 1 GB, 50 MB/arquivo)** — ~5.000 fotos de produto.
   PDFs de catálogo já estão no **Cloudflare R2 (10 GB grátis, ~180 catálogos)**, sem aperto.
   Quando lotar fotos: R2 ou Supabase Pro.
5. **Upstash Redis Free (~10k comandos/dia)** e **Vercel Hobby (~100 GB/mês)** — folgados no
   início; alto volume de sync de pedidos / tráfego exige planos pagos.
6. **Resend (e-mail) Free (3.000/mês, 100/dia)** — ok pra notificação transacional; campanha
   grande exige upgrade.

Sem teto prático de volume: **Mercado Pago** (pagamentos) e **Melhor Envio** (frete, só rate-limit
já tratado). Limites do próprio WhatsApp: até **1.024 membros/grupo**, 1 número conectado.

### 🛡️ MAPA DE CONTINGÊNCIA (O que acontece se algo cair)

- **Alta Disponibilidade (Site/Painel na Vercel):** Hospedagem em edge network (replicada globalmente). Praticamente inquebrável. Sem ponto único de falha para a aplicação web.
- **Contingência Parcial (Supabase e Groq):** 
  - O banco de dados (Supabase Free) é estável na AWS, mas não possui *Point-in-Time Recovery* nem cluster multi-zona no plano gratuito. Se a AWS US-East-1 cair, o app cai. Solução futura: Supabase Pro ($25/mês) para backups horários.
  - Se a IA (Groq) falhar por instabilidade, o robô do WhatsApp para, mas o sistema tem *fallback* (formulários manuais são ativados no painel para o admin continuar trabalhando sem travar).
- **Sem Contingência / SPOF (Evolution API):** A API do WhatsApp roda em um único servidor/container (Railway/VPS). Se ele reiniciar ou a instância dormir, o Robô sai do ar na hora e para de ler/responder os grupos. Solução futura: Para altíssimo volume, migrar para WhatsApp Cloud API oficial (paga por mensagem).

## 🚀 DEPLOY — em produção

- **URL pública (domínio próprio):** https://www.dropyatacado.com.br
  ⚠️ **O domínio canônico é COM `www`.** O apex `dropyatacado.com.br` (sem www) responde **308
  redirect** pro www. Webhooks (Mercado Pago, Evolution) fazem POST e **NÃO seguem redirect** —
  por isso TODA URL de integração tem que ser `https://www.dropyatacado.com.br/...`. Bug real
  resolvido em 2026-06-28: confirmação de pagamento do MP voltava como 502 porque o webhook estava
  cadastrado sem www. `NEXT_PUBLIC_APP_URL` e `NEXTAUTH_URL` agora = `https://www.dropyatacado.com.br`.
  Regra: ao trocar domínio/URL, padronizar TUDO com www (NEXT_PUBLIC_APP_URL, NEXTAUTH_URL, webhook
  MP, redirect ML, webhook Evolution, cron-job.org).
- **Conta Mercado Pago trocada (2026-06-28):** `MP_ACCESS_TOKEN` agora é `APP_USR-...` da conta nova
  (token MP sempre começa com `APP_USR-`; cuidado pra não colar chave de outro provedor). Dinheiro
  novo cai na conta nova; cobranças/QR Codes gerados antes da troca continuam na conta antiga.
- **GitHub:** https://github.com/ceopablowanderson-art/dropsync (privado, `.env*` no `.gitignore`)
- **Banco:** projeto Supabase `dropsync` (ref `rxuyrizpbxnawataukil`), **isolado** do projeto `ml-pro` (outro produto seu, não relacionado) — schema aplicado.
  ⚠️ **Dados de seed (mock) removidos da produção em 2026-06-22** — os 4 lojistas
  (`lojista1-4@teste.com`), 6 produtos mock (FONE-BT-01, CABO-UC-2M, CARR-65W-01,
  MOUSE-WL-01, LUMIN-LED-01, CAPAS-UN-01), anúncios/pedidos/fatura de exemplo foram
  apagados a pedido do usuário (banco agora só tem dado real). `prisma/seed.ts`
  continua existindo (útil pra ambiente de dev local) — **rodar `npx prisma db seed`
  contra a produção recria esse mock**, evitar.
- **Storage:** buckets `produtos` (público) e `etapas-pedidos` (privado) criados
- **Redis:** Upstash conectado (rate limit + painel "Sistema" já funcionam de verdade)
- **Credenciais configuradas:** `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `UPSTASH_REDIS_REST_URL/TOKEN`, `NEXTAUTH_SECRET`, `ML_ENCRYPTION_KEY`, `ADMIN_SEED_EMAIL/PASSWORD`, `CRON_SECRET`, `GROQ_API_KEY`, `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET` (**produção real**, dinheiro real — não é sandbox), `RESEND_API_KEY`, `COSMOS_API_TOKEN`, **`ML_APP_ID`/`ML_SECRET`** (na Vercel, produção)
  ✅ **Confirmado em 2026-06-22 (usuário): publicação real no Mercado Livre está funcionando**
  ponta a ponta em produção (anúncio sobe de verdade pro ML). Isso fecha a limitação conhecida
  da Fase 4 abaixo — só falta confirmar o mesmo pra Shopee.
- **Credenciais pendentes:** `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY`, `EVOLUTION_API_*`
- **Cron externo configurado** — cron-job.org com 2 jobs ativos chamando `/api/cron/sync-pedidos` (15min) e `/api/cron/refresh-tokens` (6h), header `Authorization: Bearer CRON_SECRET`

### Bugs reais encontrados e corrigidos durante o primeiro deploy

1. **Cron incompatível com plano Hobby** — `vercel.json` tinha 4 crons sub-diários (15min/6h), Hobby só aceita 2 crons diários. Reduzido a `gerar-faturas` e `alertas-vencimento` no `vercel.json`; `sync-pedidos` e `refresh-tokens` agora disparam via cron-job.org (ver acima) — **resolvido**.
2. **`lib/groq.ts` quebrava o build sem `GROQ_API_KEY`** — client instanciado no carregamento do módulo. Corrigido para inicialização tardia (`getClient()`), mesmo padrão de `lib/email.ts`/`lib/storage.ts`.
3. **Edge Function do middleware > 1MB** — `middleware.ts` importava o `auth()` completo (NextAuth + Prisma + bcrypt) só para checar uma sessão JWT. Separado em `lib/auth.config.ts` (Edge-safe, usado pelo middleware) e `lib/auth.ts` (completo, com o provider Credentials, usado no resto da app).

### Novo nessa sessão (2026-06-27): Rebranding e Domínio Próprio

- **Domínio e Rebranding:** O sistema foi inteiramente renomeado de DropSync para **DropyAtacado** e o slogan oficializou-se como "Compras Coletivas e Dropshipping". Todas as logos públicas e painéis foram atualizados. O domínio `dropyatacado.com.br` foi registrado no Registro.br e apontado oficialmente para a Vercel, recebendo as credenciais SSL e assumindo como URL principal da aplicação.
- **Pré-cadastro Rápido de Variações:** Adicionada a opção para o admin preencher dinamicamente Cores e Tamanhos (separados por vírgula) na própria tela de leitura de PDF (`catalogo-fornecedor-viewer-dialog.tsx`). O sistema converte o texto cru e cria as entidades completas no banco (`ProdutoAtacadoCor` com nome e foto em branco), garantindo que o lojista veja a caixa de seleção de cor/tamanho pronta pro Mercado Livre assim que o produto for criado, tirando o peso de "abrir pra editar depois".
- **Painel de Grupos Otimizado:** A "Categoria" do sistema agora é o campo oficial de "Catálogo" de compras coletivas. Integrado nativamente no `WhatsappGruposPanel`. Além disso, atualizamos a legenda-padrão dos disparos de WhatsApp com os textos de "Kit Pronto".

### Novo nessa sessão (2026-06-26)

- `app/page.tsx` — landing page real (hero, 4 benefícios, CTAs), substituindo o redirect antigo pro `/login`
- `app/vitrine/page.tsx` — catálogo público (sem login) com produtos ativos, CTA "Quero revender" → `/register`. Pensado pra atrair futuros lojistas, não consumidor final.
  **Atualizado em 2026-06-22** (decisão explícita do usuário): agora mostra 3 preços por
  card — custo (`precoAtacado`), sugerido Mercado Livre e sugerido Shopee, calculados via
  `calcularPrecoVendaComTaxa` (taxa real de cada plataforma, margem-base = `margemPadrao` da
  Configuração Financeira) — decisão de expor o custo publicamente foi tomada conscientemente
  pra ajudar quem está avaliando virar lojista a ver o potencial de margem. Visual trocado do
  tema escuro/roxo pra tema claro com tokens do painel + faixa de categorias clicável
  (`vitrine-categoria-strip.tsx`) + badge "Mais vendido" (vendas reais dos últimos 7 dias).
- `components/shared/produto-vitrine-card.tsx` — card público com os 3 preços (vs.
  `produto-card.tsx` do lojista, que tem campo de preço de venda + simulação de margem)

### Pendência de segurança — ✅ resolvida

RLS ativado nas 14 tabelas via Supabase MCP (sem políticas = nega acesso por padrão pra
`anon`/`authenticated` via PostgREST). App continua funcionando normal (Prisma acessa via
conexão direta, não passa pela camada de RLS). Confirmado: `/login` e `/vitrine` respondendo 200
após a mudança.

## Novo nessa sessão (2026-06-21)

### Tabela oficial de NCM + cadastro inteligente de produto com IA

- **NCM real**: tabela oficial do Siscomex carregada no banco (`NcmCodigo`, 10.515 códigos) — `lib/ncm.ts` + `GET /api/admin/ncm/buscar` fazem busca real por código/descrição no cadastro, substituindo o NCM "sugerido por IA" por escolha humana de um código que de fato existe.
- **Wizard de 10 etapas** no cadastro de produto (`components/admin/produto-form.tsx`) — Nome/Link → Categoria → Dados do Produto → Variações → Título → Características → Descrição → Precificação → Tipo de Anúncio → Garantia/Fotos. Cada etapa tem botão próprio de "Preencher com IA" (sempre busca dado fresco, nunca usa cache — bug corrigido nesta sessão) com feedback explícito quando a IA não encontra dado confiável, em vez de falhar em silêncio.
- **Importação por link ou nome** (`lib/scraper.ts` + `lib/groq.ts`) — extrai dados de páginas de produto (ML/Shopee/Alibaba/AliExpress, best-effort) ou só do nome, nunca inventa GTIN/MPN/NCM. GTIN também é extraído deterministicamente via regex + validação de checksum EAN/UPC na própria página, com prioridade sobre o que a IA "leria" do texto.

### Sincronização de estoque, vínculo manual de anúncio e notificações

- **Estoque por venda**: `Produto.estoque` nunca era decrementado em lugar nenhum do código antes desta sessão — corrigido em `lib/pedido-sync.ts`. Zerar o estoque agora pausa automaticamente os anúncios publicados (`lib/estoque-sync.ts`).
- **Vendas sem produto vinculado**: antes eram descartadas com erro (perdidas pra sempre); agora ficam registradas em `VendaNaoVinculada` (com o **título real do anúncio**, não só o ID cru — bug de exibição corrigido) e o lojista vincula manualmente a um produto do catálogo, com checkbox de aceite de responsabilidade (`AceiteTermosCheckbox`, reutilizável) — toda ação manual no sistema deve usar esse padrão.
- **Central de notificações** (`Notificacao`, `lib/notificacoes-internas.ts`, sino no topbar admin/lojista) — separada de `lib/notificacoes.ts` (que é WhatsApp/email pro cliente final, não tocar).

### Correções reais de qualidade de anúncio no Mercado Livre (confirmadas contra a API real, não suposição)

- Nunca mais preenche atributo obrigatório (BRAND/MODEL etc) com valor genérico "Universal"/"Genérica" — o algoritmo de qualidade do ML penaliza isso. Atributo sem dado real fica vazio e avisa o admin no cadastro (destaque vermelho quando a categoria escolhida exige algo que ainda está em branco).
- GTIN: tag real é `conditional_required` (não `catalog_required`, erro corrigido depois de detectado em produção); `GTIN` e `EMPTY_GTIN_REASON` são alternativos — produtos sem código de barras real (roupa, artesanal) usam o motivo "produto não tem código cadastrado" em vez de travar a publicação.
- Foto de capa validada por IA de visão (`analisarFotoCapa`, modelo multimodal Groq) antes de publicar — bloqueia só quando a IA confirma o problema (fundo não branco/neutro), nunca quando a própria checagem falha por instabilidade.
- Preço sugerido no publish considera a **taxa real** do Mercado Livre (`GET /sites/MLB/listing_prices`, API pública oficial) em vez de estimativa de IA; Shopee usa percentual estimado configurável (não existe API pública de taxa lá).
- **Categoria do ML nunca é mais adivinhada pelo título do anúncio do lojista** — causou dois incidentes reais (anúncio fechado pelo ML por "categoria incorreta"; tentativa de retry por palavra-chave que silenciosamente escolheria categoria errada, descartada antes de subir). Publicação agora exige categoria definida no cadastro pelo admin; cadastro avisa quando o nome do produto muda depois da última detecção de categoria.

### Variações reais por tamanho/cor + tabela de medidas do ML — Fase 1 de 3 (ver plano)

Primeira fase de um projeto maior (plano salvo, retomar com o mesmo prompt se necessário):
modelo de dados aditivo (`ProdutoVariacao` — agora com cor + tamanho combinados, cada
combinação = 1 SKU com estoque/preço próprios —, `AnuncioVariacao`, `AnuncioSizeChart`,
`Produto.temVariacoes`) e editor de variações no cadastro, com medidas físicas (cm) sempre
inseridas manualmente pelo admin (nunca por IA) e campos de medida descobertos dinamicamente
por categoria via API real do ML. **Publicação ainda não usa nada disso** — Fase 2 (criar o
chart real no ML + publicar com `variations[]`) e Fase 3 (sincronizar pedido/estoque por
variação) ficam pra depois, testando contra a API real do ML entre cada fase.

## Novo nessa sessão (2026-06-22)

### 6 pedidos pontuais do admin/lojista (feitos em ordem, um por vez)

1. **Excluir produto do catálogo** — `DELETE /api/admin/produtos/[id]`, bloqueado com 409
   (`PRODUTO_COM_HISTORICO`) se o produto já tem anúncio ou pedido vinculado.
2. **Redefinir senha de lojista** — já existia (`PATCH /api/admin/lojistas/[id]/senha` +
   `RedefinirSenhaButton`); confirmado funcionando, nada criado de novo.
3. **Devolução mostra produto + lojista** — `app/(admin)/admin/devolucoes/page.tsx` ganhou
   coluna com nome/SKU dos itens do pedido devolvido.
4. **Notificação individual por usuário** — auditado, já funcionava certo
   (`Notificacao.lojistaId` por destinatário); nenhum bug encontrado.
5. **Notificação broadcast** — `criarNotificacaoBroadcastLojistas` (`lib/notificacoes-internas.ts`)
   avisa TODOS os lojistas ativos quando entra produto novo no catálogo ou quando um SKU zera
   estoque (antes só quem já tinha anúncio publicado era avisado).
6. **Kits com múltiplos produtos** — feature completa, ver seção própria abaixo.

### Kits — feature completa (criação, IA, publicação, fulfillment, estoque)

- **Schema**: `Anuncio.produtoId` ficou opcional, ganhou `Anuncio.kitId`; novos models `Kit`
  (`nome`, `descricao`, `precoVenda`) e `KitItem` (`produtoId`, `quantidade`).
- **Cadastro do lojista** (`/kits`): tela em formato catálogo (cards com foto do 1º produto,
  produtos/qtd, custo total, preço de venda, status por marketplace) + modal "Criar Novo Kit"
  com `ProdutoPicker` (foto+nome+SKU+estoque, busca) e cálculo automático de custo/margem em
  tempo real. Botão "Criar Kit" no card do catálogo (`/catalogo`) pré-seleciona o produto de
  origem no modal.
- **IA gera título e descrição do kit** (`gerarTituloDescricaoKit` em `lib/groq.ts`) — usa só os
  produtos/quantidades reais selecionados, nunca inventa item.
- **Publicação real** (`/api/lojista/publicar`, ramo `publicarKit`) — usa categoria/atributos do
  1º produto do kit, bloqueia categorias que exigem size chart (kit não tem tamanho/cor próprio),
  e o anúncio no ML agora leva a **foto principal de cada produto do kit** (antes só ia a foto do
  primeiro item).
- **Fulfillment**: venda de kit explode em N `ItemPedido` reais (1 por produto do kit) — admin vê
  exatamente o que separar, não um "kit" abstrato.
- **Estoque**: kit não tem estoque próprio — é o gargalo (`min(estoque/quantidade)` entre os
  itens). `pausarKitsPorProdutoComEstoqueInsuficiente` (`lib/estoque-sync.ts`) pausa o anúncio do
  kit automaticamente sempre que QUALQUER produto dele cair abaixo do necessário pra montar a
  combinação — mesmo que o produto em si ainda tenha estoque (ex: kit usa 2un, resta 1).

### Catálogo do lojista redesenhado (estilo Dropi/CJ dropshipping)

`app/(lojista)/catalogo/page.tsx` — sidebar de categorias com contagem, toolbar com busca +
abas de ordenação (recém atualizados, últ. cadastrados, +vendidos 7/30/90d via `ItemPedido`),
card de produto com status de integração por plataforma (ML/Shopee publicado) e botões
"Cadastrar" / "Criar Kit" / "Ver Detalhes". Sem inventar avaliação por estrelas (não existe dado
de review real no sistema).

### Lista de Pedidos do lojista redesenhada (estilo painel por pedido)

`app/(lojista)/pedidos/page.tsx` — card por pedido (timeline compacta + ref, info/status,
produtos, ações) em vez de tabela plana; reaproveita `montarEtapasPedido`/`PedidoTimeline`
(extraídos pra `lib/rastreio.ts`/`components/shared/pedido-timeline.tsx`) já usados na página de
rastreio público e no detalhe do pedido — elimina 3x duplicação de lógica de timeline. Endereço
do comprador continua só cidade/UF (nunca endereço completo) pro lojista.

### Categoria do ML — IA sugere, admin/lojista confirma (nunca mais auto-aplicada)

Trocado o fluxo de detecção automática de categoria (que causou incidentes reais — ver seção
"Correções de qualidade" abaixo) por: IA sugere até 3 variações de busca (nunca um `category_id`
inventado) → `descobrirCandidatosCategoriaML` consulta a API real (`domain_discovery/search`)
pra cada variação → até 3 categorias REAIS aparecem pro admin escolher antes de carregar
atributos. Confirmado ao vivo: títulos com palavras de formato/sabor (ex: "Creatina Gummies")
puxavam categoria errada ("Suplementos para Cavalos") — a IA agora gera uma variação mínima sem
marca/sabor/formato físico pra cair na categoria certa.

### Taxas reais de marketplace na sugestão de preço e na publicação

- **Shopee**: trocada a estimativa genérica de % fixo por fórmula real (`lib/taxas-marketplace.ts`)
  com faixas de % + valor fixo por preço, conforme tipo de vendedor (CNPJ ou CPF individual,
  configurável em Configurações → Financeiro → `ConfiguracaoFinanceira.tipoVendedorShopee`).
- **ML**: continua usando a API oficial (`/listing_prices`) — já era taxa real, não estimativa.
  Adicionado aviso de frete grátis obrigatório a partir de R$79 (vendedor arca com parte da
  tarifa, valor exato não é exposto pela API — não inventado).
- **Sugestão de IA** (`PublicarPanel`) e **publicação de kit** (`KitPublicarButton`) agora mostram
  explicitamente "você pagaria R$X de taxa e ficaria com R$Y de lucro líquido" — a IA só decide a
  margem desejada (julgamento qualitativo), o valor real de taxa/lucro é sempre calculado em
  código (`calcularPrecoVendaComTaxa`), nunca pela IA.

### Consulta de GTIN/EAN — Cosmos API (alternativa à GS1 Brasil)

GS1 Brasil exige associação + liberação prévia que o admin ainda não tem. Implementada a
**Cosmos API (Bluesoft)** como alternativa real e funcional (`lib/cosmos.ts`, contrato confirmado
ao vivo com token real antes de codificar) — botão no cadastro de produto consulta por GTIN
(resultado direto) ou por nome quando não tem o código (mostra até 5 candidatos pra confirmar
qual é o produto certo). Preenche marca/nome/NCM só nos campos vazios, nunca sobrescreve dado
manual. Quando a Cosmos não tem marca/NCM cadastrado pra aquele GTIN (caso real, ex: produtos
genéricos/importados), avisa claramente em vez de sugerir "já estava preenchido".
`COSMOS_API_TOKEN` configurado local e em produção (Vercel).

### Vitrine pública — fotos separadas + ícone automático por categoria + fix de notificações

- **Capa da vitrine independente da capa do marketplace**: `ProdutoImagem.destacarVitrine`
  (novo campo, independente do `principal` já existente) — admin marca no cadastro qual foto
  usar em cada lugar (ícone ⭐ = capa do marketplace, exigências reais do ML/Shopee; ícone 📣 =
  capa da vitrine, livre pra ser mais "de marketing"). Vitrine usa `destacarVitrine` quando
  definida, com fallback pra `principal`.
- **Ícone automático por categoria** (`components/shared/vitrine-categoria-strip.tsx`) — como
  categoria é texto livre (cresce organicamente, inclusive via IA no cadastro — decisão
  explícita do usuário de manter assim), criado um casador por palavra-chave (sem
  acento/case-insensitive) contra um vocabulário amplo de termos de produto, em vez de um mapa
  fixo que sempre ficava incompleto. `Boxes` só entra quando nenhuma palavra bate — nunca fica
  sem ícone.
- **Bug de notificação repetindo corrigido** — dois pontos disparavam notificação de novo a cada
  ciclo do cron (15min) mesmo já tendo avisado antes: (1) "venda sem vínculo" repetia enquanto o
  pedido externo continuasse sem produto vinculado; (2) broadcast de "estoque zerado" repetia em
  todo pedido novo pro mesmo produto já esgotado. Ambos corrigidos em `lib/pedido-sync.ts` /
  `lib/estoque-sync.ts` — só notificam na primeira ocorrência real. 10 notificações duplicadas já
  acumuladas no banco foram apagadas (confirmado com o usuário antes).
- **Dados de seed removidos da produção** (ver seção DEPLOY acima).

## 🔧 AUDITORIA DE OTIMIZAÇÃO — executar quando o projeto atingir 90%

Achados de ergonomia/estilo (não bloqueiam desenvolvimento atual, mas devem ser
corrigidos numa passada final de polimento antes do lançamento):

- [ ] **Dark mode incompleto** — `.dark` em `app/globals.css` usa paleta `oklch` genérica do shadcn, não a identidade DropSync (`--sidebar-primary` no dark vira azul, não verde). Recalcular tokens dark a partir de `#1D9E75`.
- [ ] **Contraste não verificado (WCAG AA)** — combinações `bg-success/15` / `bg-warning/15` etc. usadas no `StatusBadge` precisam de auditoria de contraste real (rodar `/accessibility-review`).
- [ ] **Cores fora do design system** — `components/shared/status-badge.tsx` usa `bg-blue-100`, `bg-amber-100`, `bg-orange-100`, `bg-indigo-100` (Tailwind puro) em vez dos tokens de tema (`--primary`, `--warning`, etc.). Migrar para tokens antes de qualquer rebrand.
- [ ] **Testar reserva real ponta a ponta na Fase 6** (assinar → pagar → reservar → pagar → webhook → fecha caixa → avança etapas) — só a assinatura foi testada com dinheiro real até aqui, reserva ainda não (ver checklist na seção FASE 6 abaixo).

## ⏸️ PAUSADO — importação de produto via link de terceiros (ML)

Botão "Importar do Mercado Livre" (cadastro de produto) está implementado em
`app/api/admin/produtos/importar-ml/route.ts`, mas a API do ML bloqueia leitura de
itens de **outros vendedores** com `PA_UNAUTHORIZED_RESULT_FROM_POLICIES` — a
aplicação "DropSync ML" aparece como "não certificada" no painel do ML, e apps
não certificados não conseguem ler itens de terceiros (proteção anti-scraping da
própria plataforma, não é bug nosso). Decisão: pausado por ora, sem solicitar
certificação do app. Funciona normalmente pra itens da própria conta conectada
(não testado ainda) — se for revisitar, validar isso antes de tentar certificação.
Os botões "Detectar categoria e atributos do ML" e "Otimizar com IA" continuam
funcionando normalmente (não dependem de ler itens de terceiros).

## 🚧 FASE 6 — Atacado Coletivo: WhatsApp (grupo + 1:1) e etapas de fulfillment implementados (2026-06-23)

**Regra de negócio confirmada com o usuário (2026-06-22):**
- Acesso ao grupo de compras coletivas é uma **assinatura mensal** (manutenção recorrente, não é
  taxa única) — pago pelo **comprador final** (quem reserva produto nas rodadas), não pelo
  lojista. Valor configurável em Configurações → Financeiro → `valorAssinaturaAtacado` (default
  R$100, ajustado pelo usuário pra R$10 em 2026-06-23 — ver bugfix no valor não atualizar abaixo).
- Sem assinatura ativa, o comprador ainda **vê tudo normalmente** (produtos, preços, progresso da
  meta da rodada) — só é bloqueado na hora de clicar no link/botão de reservar: abre um modal
  avisando que ele não faz parte do grupo de compras coletivas (paywall só na ação de reservar,
  nunca na visualização).
- O sistema precisa **identificar quem está em dia com a assinatura** (ativo) vs quem não é
  assinante ou está com a mensalidade vencida — implica um model de assinatura com status/
  vencimento, checado antes de permitir `ReservaAtacado`.
- **Taxa de serviço de 10%** vai **embutida no preço final** mostrado ao comprador — não soma à
  parte/escondida; o checkout precisa exibir o detalhamento (custo do produto + taxa de serviço +
  frete), pra ficar claro pro cliente exatamente o que ele está pagando em cada item.
- **Frete via Melhor Envio** (API definida, substitui a opção Correios que estava em aberto).

- [x] Model `AssinaturaAtacado` (comprador identificado por CPF/CNPJ único, valor lido de
  `ConfiguracaoFinanceira.valorAssinaturaAtacado` no momento da cobrança, status
  ATIVA/INADIMPLENTE/CANCELADA, vencimento) — migration aplicada no Supabase
- [x] Model `RodadaAtacado` (produto, slug único, metaUnidades, unidadesReservadas,
  custoUnitario, taxaServicoPercentual, precoFinalUnitario já com taxa embutida, status)
- [x] Model `ReservaAtacado` (comprador sem login, cep, enderecoEntrega Json, valorProduto/
  valorTaxaServico/valorFrete/valorTotal detalhados, status) — bloqueada por assinatura ativa
  checada no servidor em `POST /api/atacado/reservas`, não só no client
- [x] Checkout público `/atacado/[slug]` sem login (`app/atacado/[slug]/page.tsx` +
  `components/atacado/atacado-checkout.tsx`) — mostra produto/preço/progresso da meta sempre;
  ao informar CPF/CNPJ sem assinatura ativa, mostra formulário de assinatura em vez de bloquear
  com modal silencioso (mesma ideia, fluxo direto pro pagamento)
- [x] **Pix direto via QR Code num modal** (`createAssinaturaAtacadoPix`/`createReservaAtacadoPix`
  em `lib/mercadopago.ts`) — não usa mais o checkout hospedado do MP (Preference), usa a API real
  de `Payment` com `payment_method_id: "pix"`; o comprador nunca sai do site, vê o QR + código
  copia-e-cola direto na própria página, com confirmação automática via polling (3s) em vez de
  redirect manual. Formato da resposta (`point_of_interaction.transaction_data.qr_code`/
  `qr_code_base64`) confirmado ao vivo com uma cobrança real de teste de R$1 antes de codificar.
  Webhook (`app/api/webhooks/mercadopago/route.ts`) continua tratando os prefixos
  `assinatura-atacado:`/`reserva-atacado:` no `external_reference`, sem mudança na lógica de
  confirmação. Componentes: `components/atacado/pix-qrcode-modal.tsx` (QR + copiar + polling),
  `app/api/atacado/reservas/[id]/route.ts` (consulta de status pro polling).
- [x] `lib/melhor-envio.ts` — cálculo real de frete por CEP via API Melhor Envio
  (`POST /api/v2/me/shipment/calculate`), contrato confirmado ao vivo via curl com o token real
  antes de codificar. Usa peso/dimensões reais do `Produto` e o novo
  `ConfiguracaoFinanceira.cepOrigem` (precisa ser preenchido em Configurações → ainda **vazio em
  produção**, sem ele o cálculo de frete falha com erro explícito, não falso silencioso)
- [x] `lib/atacado.ts` — preço final = custo × (1 + 10%) calculado em `calcularPrecoFinalRodada`;
  checkout sempre detalha produto (já com taxa) + frete separados, nunca esconde a taxa
- [x] Painel admin `/admin/atacado` — criar rodada (escolhe produto do catálogo do atacado + meta
  + % taxa + mínimo por reserva, preview do preço final antes de confirmar), fechar/cancelar/
  marcar como enviada. Card de cada rodada redesenhado no formato do mockup do usuário (banner
  com nome, foto, "Xund/caixa", "taxa X% + frete", preço/un, barra de progresso, link de reserva
  clicável) — esse visual é a base direta da mensagem que vai pro grupo de WhatsApp depois.
  Botão **"Detalhes"** abre modal (`components/admin/rodada-detalhes-dialog.tsx`) com a lista de
  compradores daquela caixa (nome, doc, telefone, email, quantidade, valor, status).
- [x] **Mínimo de unidades por reserva configurável por caixa** (`RodadaAtacado.
  minimoUnidadesPorReserva`, default 1) — decisão do usuário: sem máximo por comprador (quem
  quiser pode reservar o restante da caixa todo), mas o mínimo varia por caixa (caixa de 10un
  total precisa de mínimo bem menor que uma de 1000un). Validado no servidor em
  `lib/atacado.ts::criarReserva` — também corrigiu, de passagem, a falta de checagem de
  overselling (reservar mais do que resta na caixa). O mínimo real cai pro que sobrou quando a
  caixa está perto de fechar, pra não travar a venda das últimas unidades.
- [x] **Dashboard** (`/admin/atacado/dashboard`) — faturamento total (reservas pagas), unidades
  vendidas, frete cobrado, taxa de serviço arrecadada, assinantes ativos (+ receita mensal
  estimada), reservas aguardando pagamento, status das rodadas, assinantes inadimplentes/
  cancelados. Tudo agregação Prisma sobre dados já existentes, sem schema novo.
- [x] **Cadastro de assinantes** (`/admin/atacado/assinantes`) — tabela com todo mundo que está no
  grupo (nome, CPF/CNPJ, telefone, status da assinatura, vencimento, total de compras) + botão
  "Histórico" que abre modal com cada reserva feita por aquele assinante (produto, quantidade,
  valor, status). Nova rota `GET /api/admin/atacado/assinantes/[id]`.
- [ ] Groq: sugerir divisão em metas menores quando rodada não fecha (fácil de adicionar em `lib/groq.ts` quando o resto existir)
- [ ] Notificações 1:1 lojista/cliente final — base já existe em `lib/notificacoes.ts`, só estender
- [ ] **Testar ponta a ponta com dinheiro real**: nunca foi testado um ciclo completo (assinar →
  pagar → reservar → pagar → webhook confirma → rodada fecha ao bater meta). Antes disso, precisa
  preencher `cepOrigem` em Configurações Financeiras.
- [ ] Renovação automática da assinatura (hoje só estende 30 dias quando o webhook confirma um
  novo pagamento manual — não há cobrança recorrente automática nem alerta de vencimento)

### WhatsApp em grupo — implementado (2026-06-23)

**Catálogo separado implementado** — model `ProdutoAtacado` (nome, descrição, categoria,
custoUnitario, unidadesPorCaixa, peso/dimensões próprios pra frete, imagemUrl, ativo).
`RodadaAtacado.produtoAtacadoId` agora referencia esse catálogo, não mais o `Produto` do lojista
(troca de FK direta no banco — não havia nenhuma `RodadaAtacado` criada em produção ainda, sem
risco de dado órfão). CRUD completo em `/admin/atacado/produtos` (criar, upload de foto, ativar/
desativar, excluir — bloqueado se o produto já tiver rodada criada). A `categoria` reaproveita
`lib/constants.ts::CATEGORIAS`, que será a chave usada pra vincular grupo de WhatsApp por
categoria quando essa parte for implementada.

**Fluxo completo confirmado:**
1. Admin cadastra o produto no catálogo separado do atacado.
2. Admin clica em **"Abrir caixa"** → sistema posta automaticamente, via Evolution API, no
   **grupo de WhatsApp vinculado à categoria** daquele produto — mensagem no formato do mockup do
   usuário (imagem + título + "X und por caixa" + "taxa de serviço 10% + frete" + preço/un + link
   de reserva).
3. Cliente clica no link → cai na página de reserva (mesmo padrão de `/atacado/[slug]` já
   implementado) → paga.
4. A cada reserva paga, o sistema **atualiza o grupo automaticamente** avisando quantas unidades
   restam na caixa.
5. Quando a caixa bate a meta (fecha), os participantes daquela caixa específica são avisados, e
   entra no fluxo de envio (separar → embalar → enviar — mesmo padrão de `EtapaPedido`/prova de
   envio já usado pro pedido normal).

**Hospedagem da Evolution API decidida**: Railway (serviço sempre ligado, ao contrário do Render
que dorme por inatividade — inviável pra manter conexão de WhatsApp). Vercel foi descartada
explicitamente por ser serverless (não mantém conexão persistente). Guiei o usuário pelo passo a
passo de deploy (criar conta → deploy da imagem `atendai/evolution-api` com Postgres+Redis
linkados → domínio público → criar instância → escanear QR code).

**Setup da Railway concluído (2026-06-23)** — template oficial "Evolution API" (3 serviços:
Evolution API + Postgres + Redis) deployado via guia passo a passo no painel; instância `dropsync`
criada e WhatsApp conectado via QR code. Confirmado ao vivo via `GET /group/fetchAllGroups/dropsync`
**antes de codificar** (mesma disciplina aplicada a Cosmos/ML/Melhor Envio): a instância retorna os
grupos reais, inclusive vários que já parecem ser por categoria (Brinquedos, Papelaria, Ferramentas,
Eletrônicos, etc, dentro da comunidade "Compras Coletivas 2" existente do usuário) — suporte a
grupo confirmado, não só 1:1. `EVOLUTION_API_URL`/`EVOLUTION_INSTANCE`/`EVOLUTION_API_KEY` reais
salvos em `.env.local` e Vercel (produção).

**Implementado:**
- `lib/evolution.ts` — `listarGruposWhatsapp()`, `criarGrupoWhatsapp(nome, telefone)` (WhatsApp
  exige ≥1 participante pra criar grupo — admin informa um telefone, normalmente o próprio),
  `enviarMensagemGrupo(grupoId, texto)`, `enviarImagemGrupo(grupoId, url, legenda)`.
- Model `GrupoWhatsappCategoria` (categoria única ↔ grupoId/grupoNome) — vínculo configurável pelo
  admin, não hardcoded.
- `components/admin/whatsapp-grupos-dialog.tsx` (botão "WhatsApp" em `/admin/atacado`) — lista as
  categorias do catálogo (`CATEGORIAS`), cada uma vinculável a um grupo real já existente (select
  com nome/tamanho reais, sem ID cru) ou a um grupo **criado direto do painel** (nome + telefone
  inicial → `POST /group/create`).
- Botão **"Abrir caixa no WhatsApp"** no card da rodada (`rodada-atacado-actions.tsx`, só aparece em
  rodada `ABERTA` que ainda não foi aberta no grupo) → `abrirCaixaWhatsapp` (`lib/atacado.ts`) acha o
  grupo vinculado à categoria do produto, monta a mensagem (nome, und/caixa, taxa+frete, preço/un,
  link de reserva) e envia com a foto do produto quando houver. Idempotente — não posta duas vezes;
  guarda `RodadaAtacado.grupoIdUsado` pra continuar atualizando o mesmo grupo mesmo que o vínculo
  categoria↔grupo mude depois.
- `confirmarPagamentoReserva` (`lib/atacado.ts`) — best-effort (nunca trava a confirmação do
  pagamento se o WhatsApp falhar): avisa o grupo a cada reserva paga com o progresso atualizado, e
  manda aviso diferente de "caixa fechada" quando a meta é batida.

**Etapas de fulfillment da caixa fechada — implementado (2026-06-23)**: `RodadaAtacadoStatus` ganhou
`SEPARANDO`, `EMBALANDO`, `PRONTA_ENVIO` entre `FECHADA` e `ENVIADA` (migration aplicada no
Supabase). Painel admin (`rodada-atacado-actions.tsx`) ganhou um botão por etapa, sempre avançando
uma de cada vez. `lib/atacado.ts::avancarEtapaRodada` atualiza o status e dispara, 1:1, uma mensagem
de WhatsApp (com o banner do produto) pra cada comprador com reserva paga daquela rodada — mesma
ideia do `EtapaPedido`/`PedidoStatus` já usado pro pedido normal, só que em lote por caixa em vez de
individual por pedido (faz sentido porque a caixa toda é separada/embalada/enviada junto). A página
`/admin/atacado` agora separa visualmente "Caixas abertas" de "Caixas fechadas" (`mapRodada` reusa o
mesmo mapeamento pros dois grupos).

**Notificação 1:1 da confirmação de pagamento — implementado (2026-06-23)**: `confirmarPagamentoReserva`
agora, além de avisar o grupo, manda uma mensagem individual pro `compradorTelefone` da reserva
específica — banner do produto + quantas unidades ele reservou + progresso atual da caixa. `lib/
evolution.ts` ganhou `enviarMensagemIndividual`/`enviarImagemIndividual` (mesmos endpoints dos
grupos, só troca `number` pro telefone em vez do JID do grupo).

**Bug real achado no primeiro teste de etapa, corrigido (2026-06-23)**: mensagem 1:1 retornava
400 da Evolution API — telefone salvo sem o código do país (ex: `22992687004` em vez de
`5522992687004`). Mensagem de grupo nunca teve esse problema porque usa o JID do grupo, não
telefone. Corrigido com `normalizarTelefoneBR` em `lib/evolution.ts` (assume DDI 55, sistema é só
Brasil) aplicado dentro de `enviarMensagemIndividual`/`enviarImagemIndividual` — corrige até
telefones já cadastrados antes da correção, porque a normalização acontece no momento do envio, não
no cadastro. Também adicionada **máscara `(XX) XXXXX-XXXX`** (`lib/format.ts::mascararTelefone`) no
campo de telefone do checkout de assinatura (`atacado-checkout.tsx`), pra reduzir erro de digitação
na origem.

Discutido e descartado por ora: puxar o telefone automaticamente de quem clica no link do grupo.
Não é possível no fluxo atual (link comum de navegador, sem nenhuma informação de identidade
WhatsApp disponível pro client). Daria pra fazer via fluxo invertido (botão `wa.me` que manda
mensagem pro número do bot, que responde com link já personalizado com o telefone do remetente),
mas isso muda a experiência (exige mandar mensagem antes de cair no checkout) e exige escutar
webhook de mensagem recebida — não implementado, só desenhado caso o usuário queira no futuro.
Tudo best-effort — falha no
WhatsApp nunca trava a confirmação do pagamento nem o avanço de etapa.

### Banner estilizado pro WhatsApp + bug crítico de pagamento real corrigido (2026-06-23)

- **Banner de imagem gerado on-demand** (`GET /api/atacado/banner/[id]`, via `ImageResponse` do
  `next/og`/Satori) — reproduz o card do mockup do usuário (cabeçalho, foto, badge und/caixa,
  preço, taxa, barra de progresso) como uma imagem real enviada no grupo, em vez de só a foto crua
  do produto. Rota pública sem auth (a Evolution API busca a URL direto) — não expõe nada que já
  não esteja na página pública de reserva. A legenda da mensagem ficou só com o link de reserva,
  já que todo o resto está na imagem.
- **Bug crítico real, achado no primeiro teste com dinheiro de verdade**: `createPixPayment`
  (`lib/mercadopago.ts`) nunca informava `notification_url` no payload de criação do `Payment` —
  o Mercado Pago não tinha pra onde mandar a notificação de pagamento aprovado. Confirmado direto
  na API do MP: um pagamento real de assinatura (R$10, Pix) ficou com `status: "approved"` e
  `date_approved` preenchido, mas o webhook nunca chegou — a assinatura continuava `INADIMPLENTE`
  no banco, mesmo com o dinheiro já confirmado pelo MP. Corrigido adicionando
  `notification_url: \`${NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago\`` no `createPixPayment`
  (usado tanto por `createAssinaturaAtacadoPix` quanto `createReservaAtacadoPix`). A assinatura já
  paga foi sincronizada manualmente pra `ATIVA` (com autorização explícita do usuário) — sem essa
  correção, **nenhuma assinatura nem reserva real do atacado teria sido confirmada
  automaticamente**, mesmo com o pagamento caindo de verdade. Esse era o bloqueio real por trás do
  item "testar com dinheiro real" do checklist anterior.
- **Outros bugs reais achados no mesmo teste, já corrigidos**: link de reserva saindo `undefined`
  na mensagem do WhatsApp (`NEXT_PUBLIC_APP_URL` nunca tinha sido configurada na Vercel/produção,
  só existia local); modal de Pix da assinatura mostrando `R$ 100,00` fixo no texto e no QR Code em
  vez do valor real configurado (`iniciarAssinatura` não retornava `valor`, e o componente tinha
  `formatBRL(100)` hardcoded — ambos corrigidos pra usar o valor real de
  `ConfiguracaoFinanceira.valorAssinaturaAtacado`); foto do produto na página pública de reserva
  cortada/borrada por estar forçada num formato vertical 9:16 com `object-cover` — trocada pra
  `aspect-square` + `object-contain`.

### Novo nessa sessão (2026-06-25): correção do erro 500 no envio de imagem (Evolution API)

- **Correção do Erro 500 na Vercel**: Adição explícita do pacote `sharp` ao `package.json` para corrigir a falha de compilação da rota de geração do banner (`/api/atacado/banner/[id]`), que causava erro HTTP 500 na Evolution API ao tentar baixar a imagem.
- **Fallback para Ambiente Local**: Implementação de lógica em `lib/atacado.ts` para usar a URL pública da foto do produto (`produtoAtacado.imagemUrl`) se o sistema detectar que está rodando em `localhost`/`127.0.0.1`, evitando falhas de comunicação da Evolution API com o ambiente de desenvolvimento local.

### Novo nessa sessão (2026-06-26): Refatoração do painel de WhatsApp e categorias dinâmicas

- **Categorias Dinâmicas no Vínculo de Grupos**: O modal de vínculo (agora aba) não usa mais uma lista fixa de 6 categorias. A API `GET /api/admin/atacado/whatsapp/grupos` foi atualizada para buscar **todas as categorias** ativas de `ProdutoAtacado` e de `Categoria` do varejo, permitindo que qualquer nova categoria criada apareça automaticamente para ser vinculada. Múltiplas categorias podem ser vinculadas ao mesmo grupo sem restrições.
- **Refatoração Visual (Modal para Abas)**: A vinculação de grupos foi removida da tela de Atacado e movida para dentro da página principal de **WhatsApp** (`/admin/whatsapp`), organizada em duas abas (`Tabs`): "Conexão do Aparelho" e "Grupos Vinculados". O antigo `WhatsappGruposDialog` virou `WhatsappGruposPanel`.
- **Layout em Grid Responsivo**: A lista de categorias para vincular foi transformada de uma coluna vertical simples para um **CSS Grid responsivo** (até 6 colunas em telas `2xl`), exibindo as categorias como cards bem estruturados.
- **Moderador Automático Isolado**: A opção de ligar o Moderador Automático (que avisa o cliente no privado quando manda uma 2ª pergunta sem resposta) não é mais uma checkbox duplicada dentro de todas as categorias. Ele foi isolado no banco e na UI como uma pseudo-categoria (`MODERADOR_AUTOMATICO`), permitindo que o admin apenas vincule o moderador a um único grupo selecionado, exatamente como faz com uma categoria. O webhook (`app/api/webhooks/evolution/route.ts`) foi ajustado para respeitar essa regra.

### Novo nessa sessão (2026-06-26): Repostagem Automática (Loop) no WhatsApp

- **Loop Automático de Caixas**: O sistema agora permite configurar um "loop" para caixas abertas (rodadas), reenviando automaticamente o banner e o link de reserva no grupo de WhatsApp em intervalos regulares (6h, 12h, 24h ou 48h).
- **Controles no Painel**: Ao criar uma rodada (`criar-rodada-atacado-dialog.tsx`), o admin pode ativar o loop e definir o intervalo. Caixas já existentes ganharam um botão de configuração de loop diretamente no card de ações (`rodada-atacado-actions.tsx`).
- **Motor de Execução e Priorização Estratégica**: A rota `/api/cron/atacado/loop` processa os envios respeitando a janela de tempo. Caso múltiplas caixas sejam elegíveis no mesmo disparo, o sistema as ordena seguindo a seguinte prioridade de negócio: 1º maior % de meta batida, 2º maior número de pagantes, 3º caixas mais novas. O algoritmo processa as caixas em ordem **inversa** (menor prioridade enviada primeiro, maior prioridade enviada por último) para garantir que a caixa "mais quente" seja a **última mensagem** do grupo, maximizando sua visibilidade na base do chat.
- **Campos adicionados**: `RodadaAtacado.loopAtivo` (boolean) e `RodadaAtacado.loopIntervaloHoras` (Int), além do `ultimoLoopEnviadoEm` para controlar os disparos.

### Novo nessa sessão (2026-06-23): catálogo de fornecedor em PDF + cadastro mais rico + ações no card

- **Upload de catálogo PDF migrado pra Cloudflare R2** — bug real: PDFs grandes de fornecedor
  (ex: catálogo de 563 páginas / 54,9MB) davam "Erro ao enviar o arquivo PDF". Causa raiz: o plano
  Free da Supabase Storage tem um teto fixo de ~50MB por arquivo, não editável (subir o
  `file_size_limit` do bucket via SQL não resolve — o teto é do plano, não do bucket). Decisão do
  usuário: hospedar só os catálogos PDF no Cloudflare R2 (10GB grátis, sem taxa de saída) em vez de
  pagar Supabase Pro. `lib/storage-r2.ts` (novo) gera URL assinada de PUT via S3 SDK
  (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`); leitura pública via "Public Development
  URL" do bucket (`pub-xxxx.r2.dev`); CORS configurada no bucket pra aceitar `PUT`/`GET` do domínio
  de produção. `lib/storage.ts` não trata mais catálogo de fornecedor — só imagens de produto e
  prova de envio, que continuam no Supabase Storage normalmente. Credenciais (`R2_*`) salvas em
  `.env.local` e na Vercel (produção).
- **Visualizador de PDF do catálogo** (`components/admin/pdf-page-viewer.tsx`, via `pdfjs-dist` v6)
  — corrigidos vários bugs reais durante o desenvolvimento: render duplo de canvas quebrava
  silenciosamente (passar `canvas` E `canvasContext` juntos faz o pdf.js v6 não desenhar nada, sem
  erro); fotos de alguns catálogos (export Illustrator/InDesign) ficavam invisíveis por estarem
  numa camada opcional (OCG) desligada por padrão — corrigido forçando visibilidade de todas as
  camadas antes de renderizar; imagens JPEG2000 não decodificavam por depender do worker/wasm do
  pdf.js via CDN externo — corrigido auto-hospedando `pdf.worker.min.mjs` + `wasm/` em
  `public/pdfjs/` via `postinstall` (`scripts/copy-pdfjs-assets.mjs`). Zoom (1x–4x) e recorte de
  foto direto da página (gera um PNG que vira a imagem do produto no pré-cadastro).
- **Pré-cadastro rápido a partir do índice do PDF** (`catalogo-fornecedor-viewer-dialog.tsx`) ganhou
  os mesmos campos do cadastro completo: peso (`pesoKg`, antes só existia no form completo), e 3
  preços distintos em vez de 2 — `custoUnitario` (custo do catálogo), `precoCatalogo` (preço já
  impresso na página do catálogo do fornecedor, só referência) e `precoVendaSugerido` (preço que o
  Pablo de fato pretende postar/vender na rodada) — são independentes, nenhum deriva do outro.
- **Fornecedores (uso interno) editáveis** — `fornecedores-atacado-dialog.tsx` ganhou edição inline
  (nome/catálogo/telefone/endereço) via ícone de lápis, reaproveitando o mesmo PATCH que já existia
  pra outros campos do fornecedor.
- **Campo "Código Anatel"** (`ProdutoAtacado.codigoAnatel`, opcional) — produtos eletrônicos
  costumam ter número de homologação Anatel impresso na etiqueta/caixa; campo adicionado no
  cadastro completo, no pré-cadastro rápido, e exibido no card quando preenchido.
- **3 ações novas no card do Catálogo do Atacado** (`produto-atacado-list.tsx`):
  - **Enviar p/ rodada** — abre o mesmo modal de criar rodada já travado nesse produto (sem
    precisar escolher de novo na lista).
  - **Detalhes** — modal somente leitura com tudo: foto, descrição, categoria, marca, voltagem,
    Anatel, os 3 preços, peso/dimensões, fornecedor.
  - **Editar** — formulário completo (mesmos campos do cadastro) pra corrigir qualquer dado depois,
    inclusive os que vieram do pré-cadastro rápido.
  - De passagem, corrigido um bug no seletor de produto do modal "Nova rodada de compra coletiva":
    mostrava o ID cru (cuid) em vez do nome do produto, porque o componente de Select (base-ui) só
    mostra o nome automaticamente quando recebe a lista `items` ou uma função `children` — sem
    isso ele renderiza o `value` puro. Corrigido com `children` explícito + foto miniatura nas
    opções e no campo selecionado.
- **Bug real corrigido: valor da assinatura mensal não respeitava mudança em Configurações** —
  `iniciarAssinatura` (`lib/atacado.ts`) só atualizava nome/email/telefone ao reaproveitar uma
  assinatura pendente já existente, nunca o `valor` — então uma assinatura criada antes de uma
  mudança no campo "Valor da assinatura mensal" continuava gerando Pix com o valor antigo pra
  sempre. Corrigido pra reler o valor atual da configuração sempre que a assinatura ainda não está
  `ATIVA` (não retroage em assinatura já paga, só nas pendentes/vencidas).

**Checklist final da Fase 6 (WhatsApp):**
- [x] `ProdutoAtacado` (catálogo separado do catálogo do lojista)
- [x] Cadastro de vínculo grupo do WhatsApp ↔ categoria
- [x] `lib/evolution.ts` completo (grupos + 1:1 + criação de grupo + texto + imagem)
- [x] Botão "Abrir caixa" no admin
- [x] Hook em `confirmarPagamentoReserva` pra avisar o grupo após cada reserva paga + fechamento
- [x] Notificação 1:1 (com banner) pro comprador na confirmação do pagamento da reserva
- [x] Etapas de fulfillment da caixa fechada (separando/embalando/pronta para envio/enviada), cada
  uma avisando 1:1 todo comprador com reserva paga daquela rodada
- [x] Frete: opção de retirada local (grátis) + escolha entre as 3 opções mais baratas da Melhor
  Envio, com revalidação do preço no servidor antes de criar a reserva
- [x] Teste real de ponta a ponta — feito com dinheiro real (assinatura R$10 via Pix), achou e
  corrigiu o bug crítico do `notification_url` ausente (ver seção abaixo). Reserva real numa
  rodada ainda não testada (só assinatura até aqui).
- [x] Teste real das etapas de fulfillment (separando→embalando→pronta para envio→enviada) numa
  caixa fechada de teste — achou e corrigiu o bug do telefone sem DDI 55, confirmado pelo usuário
  como "processo feito correto" depois da correção + reset da caixa pra reteste.

⚠️ **OBSERVAÇÃO SOBRE O MODERADOR AUTOMÁTICO (A ser revisitado pelo usuário):**
O Moderador Automático (`MODERADOR_AUTOMATICO`) foi isolado em seu próprio cartão no painel de WhatsApp. Hoje ele registra mensagens enviadas por participantes no banco de dados (`mensagemPendenteGrupo`), mas os alertas via mensagem privada (DM) enviados pelo número da Evolution API para os clientes falham de forma silenciosa por conta de restrições de spam (shadowban) aplicadas ao chip do WhatsApp do cliente. O usuário planeja mexer neste fluxo no futuro. Ideias de caminhos alternativos para quando for mexer:
1. **Alerta direto no grupo:** Mudar o alerta do moderador para ser enviado no próprio grupo citando o cliente, ex: *"@Kaio, vi que você enviou outra pergunta, por favor aguarde a resposta da anterior!"*.
2. **Integração com outro chip/API:** Usar uma API oficial ou outro chip não restringido apenas para o envio dos alertas de moderação.

### Refinamentos da vitrine + atualização por catálogo + reserva pra loja (2026-06-23)

- **Preço da vitrine = preço de catálogo** (`precoCatalogo`, fallback `precoVendaSugerido`) — antes
  mostrava a venda sugerida; corrigido a pedido do usuário. Nunca expõe `custoUnitario`.
- **Código no produto** (`ProdutoAtacado.codigo`, migration + backfill dos existentes a partir do
  `CatalogoFornecedorItem`). Ao subir um **catálogo novo** e pré-cadastrar, o casamento é por
  **(codigo + fornecedorId)**: se o produto já existe → **atualiza os preços** (custo/preço de
  catálogo/venda) em vez de duplicar (nome/foto/medidas/Anatel ficam intactos); senão cria novo. O
  bloqueio de código repetido dentro do mesmo catálogo continua. Campo código editável em criar/
  editar produto. Excluir um catálogo NÃO exclui os produtos (FK `onDelete: SetNull`).
- **Selo "Mais vendido no ML" no estilo do próprio ML**: fundo amarelo (#FFE600), ícone de aperto
  de mão (não o logo oficial — marca registrada), tarja laranja "MAIS VENDIDO" branca +
  "{posição}º em {categoria}", clicável → abre o ranking do ML numa **janela popup** (`window.open`
  com `popup=yes`, ~1100px pra renderizar o layout desktop). O ML bloqueia iframe/modal e a barra
  de endereço do popup não pode ser ocultada (regra do navegador). Selo na vitrine (abaixo do
  preço) e no modal de detalhes.
- **Responsividade da vitrine**: botões "Quero!"/"Detalhes" empilhados (largura total) e selo ML
  blindado contra overflow (texto trunca) — não estouram mais em card estreito de celular.
- **Reserva de unidades pra loja na rodada** (`RodadaAtacado.unidadesReservadasLoja`, migration):
  campo opcional ao criar rodada. O admin informa a meta total da caixa (M) + quantas unidades
  reserva pra si (R). O custo das R unidades é **diluído** no preço do coletivo (custo × M ÷ (M−R)),
  e `metaUnidades` guardada vira a meta do COLETIVO (M−R) — assim toda a lógica de fechar/restantes
  segue igual. As R unidades do admin saem "de graça". Lógica em
  `lib/atacado.ts::calcularRodadaComReservaLoja`; preview no diálogo + selo no card admin. Sem
  reserva, comportamento idêntico ao anterior.

### Vitrine pública do Atacado + auto-preenchimento por IA + privacidade do fornecedor (2026-06-23)

- **Vitrine pública do catálogo do atacado** (`/atacado`, sem login) no estilo Mercado Livre,
  reaproveitando o estilo da vitrine do lojista (`VitrineCategoriaStrip` com `basePath`). Lista
  todos os `ProdutoAtacado` ativos com foto, nome, preço (`precoVendaSugerido` → fallback
  `precoCatalogo`, **nunca** `custoUnitario`), und/caixa, selo Anatel. Card
  (`produto-atacado-vitrine-card.tsx`) tem "Detalhes" (modal) e "Quero!" → entra no grupo de
  WhatsApp da categoria via **link de convite** (`GrupoWhatsappCategoria.linkConvite`, colado pelo
  admin no diálogo WhatsApp — é diferente do `grupoId` interno usado pra postar via Evolution).
  Strip de categorias vem de `produtoAtacado.groupBy(categoria)` — só categorias com produto ativo,
  independente da vitrine do lojista. Botão de "link de referência" do produto existe no modal mas
  está **inerte** (comportamento a definir; será um link por produto — campo ainda não criado).
- **Auto-preenchimento do pré-cadastro por IA de visão** (`catalogo-fornecedor-viewer-dialog.tsx`):
  recorte do produto na página do catálogo PDF é lido por
  `lib/groq.ts::extrairDadosProdutoDeImagem` (modelo `MODEL_VISION` llama-4-scout, via rota
  `POST /api/admin/atacado/catalogos/extrair-dados`). A IA preenche: código, nome, categoria
  (cria nova on-the-fly se não existir na lista, casando sem acento/case antes), custo, preço de
  catálogo, **PÇS/CX** (und/caixa), marca (lê o logotipo), peso e dimensões (converte mm→cm) e o
  **número de homologação Anatel** (lê o selo/logo da Anatel na imagem, não texto solto). Só
  preenche o que leu, não apaga o que o admin digitou; o admin sempre revisa antes de salvar.
- **Dois botões de recorte** no pré-cadastro (pedido do usuário): **"Ler com IA"** (arrasta no
  produto inteiro → lê os campos; usa o recorte como foto só se ainda não houver uma) e
  **"Recortar imagem"** (arrasta só na foto limpa → define a imagem do produto, sem IA).
  Controlado por `modoRecorte: "ia" | "foto"`.
- **Painel de pré-cadastro enxuto**: a lista de produtos cadastrados foi **removida** (não escala
  pra milhares de itens) — ficou só o **contador** "X produto(s) cadastrado(s)". Cadastro
  **bloqueia código duplicado** no mesmo catálogo (409).
- **Fornecedores virou item do menu lateral do admin** (`/admin/atacado/fornecedores`, ícone
  caminhão) — antes era um diálogo aberto por botão no topo do Catálogo do Atacado. O conteúdo foi
  extraído pra `FornecedoresAtacadoPanel` (mesmo arquivo `fornecedores-atacado-dialog.tsx`),
  reusado pela página nova; botão removido do topo. O highlight da sidebar usa match de href mais
  longo pra não acender "Atacado Coletivo" e "Fornecedores" juntos.
- **Prova social "Mais vendidos no ML"** por produto (`ProdutoAtacado.linkReferencia` +
  `posicaoMaisVendido`, migration aplicada): admin cola o link da página de mais vendidos do ML + a
  posição (digitada à mão — ML bloqueia leitura automática, confirmado por teste de fetch que
  retorna a página "suspicious-traffic"). Na vitrine, produtos com esses dados ganham um **selo
  laranja "Nº MAIS VENDIDO NO ML"** que abre o link numa **janela popup pequena** (`window.open`
  480×760 — popup é janela real, não iframe, então o ML carrega; iframe/modal o ML bloqueia).
  Campos nos forms de criar e editar produto (`linkReferencia`/`posicaoMaisVendido` em
  validations + rotas).
- **Filtros na vitrine pública do atacado**: busca por nome (`q`) + ordenação (`ordem`:
  recentes/menor-preço/maior-preço) via form GET nativo, preservando a categoria da faixa. Ordenação
  por preço feita em memória (preço público combina `precoVendaSugerido`/`precoCatalogo` com fallback).
- **IA nunca deixa produto sem categoria**: no auto-preenchimento, se a IA não identificar categoria,
  cai em "Outros" (em vez de deixar vazio).
- **Botão "Gerar com IA" pra descrição do produto do atacado** (criar + editar):
  `lib/groq.ts::gerarDescricaoProdutoAtacado` (texto puro, via `POST
  /api/admin/atacado/produtos/gerar-descricao`) escreve 2-4 frases a partir de nome/categoria/marca/
  voltagem — instruída a não inventar especificações não informadas.
- **REGRA DE PRIVACIDADE DO FORNECEDOR (vale pra todo o sistema)**: nenhuma informação que
  identifique o fornecedor pode aparecer em página/rota **pública**. Isso inclui nome do
  fornecedor, nome do catálogo, número da página do catálogo, custo de aquisição (`custoUnitario`)
  e a **marca de origem**. Tudo isso fica restrito ao painel admin. Bugs reais corrigidos hoje:
  (a) a descrição auto-gerada do pré-cadastro escrevia "Pré-cadastrado a partir do catálogo X,
  página Y" — vazava o fornecedor na vitrine e no checkout; origem corrigida (descrição nasce
  vazia) + 13 produtos existentes limpos no banco; (b) o selo de marca foi **removido** da vitrine
  pública (card + modal) e o campo nem é mais enviado pra essa página — marca continua só no admin.
  O vínculo interno produto↔catálogo↔página continua existindo via `CatalogoFornecedorItem` (uso
  admin), nunca exposto. Ao mexer em qualquer superfície pública do atacado, conferir que nada
  disso vaza.

## Novo nessa sessão (2026-07-02)

### WhatsApp — disparo em massa, boas-vindas por IA e disparo direto sem modal

- **Disparo em massa de caixas abertas** — botão "Disparar X caixas" no topo de `/admin/atacado`
  lista todas as `RodadaAtacado` com `status: ABERTA` e `grupoMensagemEnviada: false`, abre um
  seletor de grupo (pré-selecionado se `categoria: PRODUTOS_DISPONIVEIS` estiver vinculada) e envia
  imagem+legenda pra cada caixa em sequência com 3s de pausa entre cada. Marca `grupoMensagemEnviada:
  true` após envio. Componente: `components/admin/disparador-caixas-button.tsx`. Rota:
  `POST /api/admin/atacado/disparar-caixas-abertas`. Aceita `grupoId`/`grupoNome` direto no body
  (para o seletor) ou busca o vínculo `PRODUTOS_DISPONIVEIS` do banco como fallback.

- **"Abrir caixa no WhatsApp" sem modal** — antes sempre abria um diálogo "Escolher grupo do
  WhatsApp" que ficava travado em "Carregando grupos..." (chamava a Evolution API, que tem timeout na
  Vercel). Agora `handleAbrirCaixaDireto` busca só os vínculos do banco via nova rota leve
  `GET /api/admin/atacado/whatsapp/vinculos` (sem chamar Evolution API), encontra o grupo vinculado
  à categoria do produto e **dispara direto**, sem modal. Modal só aparece se a categoria não tiver
  grupo vinculado.

- **Rota leve de vínculos** — `GET /api/admin/atacado/whatsapp/vinculos` retorna apenas os vínculos
  do banco (`GrupoWhatsappCategoria`) sem chamar `listarGruposWhatsapp()` da Evolution API. Todos os
  seletores de grupo do admin agora usam essa rota em vez de `/api/admin/atacado/whatsapp/grupos`,
  eliminando o travamento por timeout da Evolution.

- **Boas-vindas por IA no grupo AVISOS_COMUNIDADE** — webhook da Evolution API
  (`app/api/webhooks/evolution/route.ts`) detecta evento `group.participants.update` com
  `action: "add"`. Se o grupo for o vinculado à categoria `AVISOS_COMUNIDADE`, o Groq
  (`llama-3.1-8b-instant`, `temperature: 0.9`) gera uma mensagem personalizada e humanizada com
  @menção ao novo membro, explicando a dinâmica dos 4 grupos: 1) Pedidos (só para pedir abertura de
  caixa), 2) Catálogo (fechado, só admin posta), 3) Ideias & Sugestões (aberto), 4) Produtos
  Disponíveis (caixas abertas postadas diariamente). Delay aleatório de 5-15s antes de enviar para
  parecer humano. Só funciona no grupo AVISOS_COMUNIDADE — não interfere em outros grupos.

- **Botão "Enviar & Fixar tutorial"** no card do grupo Avisos da Comunidade no painel WhatsApp
  (`components/admin/whatsapp-grupos-panel.tsx` → `FixarTutorialButton`). Envia o texto completo
  explicando os 4 grupos via `POST /api/admin/atacado/whatsapp/fixar-tutorial` e pina a mensagem
  por 30 dias via Evolution API `/message/pin/{instance}` com `duration: 2592000`.

- **Categoria PRODUTOS_DISPONIVEIS** adicionada como card fixo no painel de grupos WhatsApp (junto
  de MODERADOR_AUTOMATICO, ROBO_APRENDIZ, SOLICITACOES, AVISOS_COMUNIDADE).

### Instagram — Stories corrigido e publicação multi-página

- **Stories publicando na grade em vez de Stories** — corrigido. Novo Instagram Login API exige
  `media_type: "STORIES"` (não `media_type: "IMAGE"` + `is_stories: "true"` da API antiga com
  Facebook Login). Corrigido em `lib/instagram.ts`.

- **Carrossel multi-página** — selecionando múltiplas páginas no diálogo de divulgação
  (`catalogo-divulgacao-dialog.tsx`) e escolhendo formato POST: publica como carrossel via
  `POST /api/instagram/publicar-carrossel`. Cria containers filhos com `is_carousel_item: true`,
  container pai com `media_type: CAROUSEL` e `children` com os IDs separados por vírgula, aguarda
  3s e publica. Máximo 10 slides.

- **Stories multi-página** — mesmo seletor, formato STORY: publica os Stories individualmente em
  sequência com pausa de 1.5s entre cada.

- **Arte panel (Instagram)** — auto-preenchimento via OCR do recorte de PDF: campo `fotoBlob` do
  recorte já vira preview automático (sem upload separado) via `URL.createObjectURL` + cleanup em
  `useEffect`. Mensagem "✓ recorte selecionado" em verde quando o blob está ativo.

- **Broadcaster** — preview do Instagram aparece automaticamente ao selecionar recorte. Formulário
  limpo após publicação bem-sucedida (`limparParaProximoProduto`). Arte Generator removido dos
  diálogos de fornecedor (broadcaster + divulgacao) — mantido só no Avisos.

## Novo nessa sessão (2026-06-27)

### Melhorias no Atacado e Catálogos em PDF

- **Exibição e cópia de código de produto na Vitrine**: O botão "Eu Quero" da vitrine de atacado foi alterado para facilitar o fluxo. Ao clicar, ele copia o código do produto para a área de transferência e abre o grupo de WhatsApp correspondente para o lojista colar o pedido, evitando que produtos fiquem perdidos.
- **Busca por código na Vitrine**: A barra de busca da Vitrine do Atacado pública (`app/atacado/page.tsx`) agora suporta pesquisa pelo `codigo` do produto além do `nome`.
- **Edição de Grupo no Painel Admin**: O modal de edição de rodadas de atacado (`components/admin/rodada-atacado-actions.tsx`) agora permite que o administrador altere o Grupo do WhatsApp associado àquela rodada após a criação, caso tenha sido classificado incorretamente.
- **Busca de produtos pré-cadastrados no PDF**: Adicionada uma barra de busca rápida no visualizador de catálogos em PDF (`components/admin/catalogo-fornecedor-viewer-dialog.tsx`) para pesquisar por nome ou código entre os produtos já vinculados àquele fornecedor.
- **Busca via extração de texto bruto (OCR interno do PDF)**: Como alguns catálogos podem ter 200 páginas e o produto não estar pré-cadastrado, foi implementado um botão "Buscar no texto do PDF". Ele usa o `pdf.js` para varrer silenciosamente todas as páginas em background, extraindo o texto e identificando em quais páginas a string buscada aparece, movendo o visualizador diretamente para a primeira ocorrência.

## Adicionado fora do roadmap original

- **IA via Groq** (`lib/groq.ts`) substituindo Gemini/Anthropic — otimização de anúncios ML/Shopee, chat automático de perguntas ML, detecção de categoria (`detectarCategoriaML`, usado no publish real da Fase 4), análise de produto (`analisarProduto`, usado no catálogo do lojista). Usado em `lib/ml-otimizador.ts`, `lib/shopee.ts` e nas rotas `POST /api/lojista/chat-ml` e `POST /api/lojista/catalogo/[id]/analisar`.
- **Prova de envio interna** — admin tira foto por etapa do pedido (`EtapaPedido`, bucket privado `etapas-pedidos` no Supabase Storage). Cliente final só recebe texto (WhatsApp via Evolution API + email via Resend) com link de `/rastreio/[token]` (timeline pública sem fotos, atualiza via SSE). Painel admin em `/admin/pedidos/[id]` tem seção "Provas de Envio" com upload, grid de fotos e download em .zip.
- **BullMQ substituído por rotas estilo Vercel Cron** (Fase 4) — `lib/queue.ts` nunca foi implementado; o deploy alvo é serverless (Vercel), incompatível com workers BullMQ de longa duração. `/api/cron/sync-pedidos` e `/api/cron/refresh-tokens` cobrem o mesmo papel, protegidas por `Authorization: Bearer CRON_SECRET`.

## FASE 1 — Fundação ✅ Completa

- [x] Setup Next.js + Prisma + Supabase
- [x] Schema completo + migration (User, Session, Lojista, Integracao, Produto, ProdutoImagem, Anuncio, Pedido, ItemPedido, Fatura)
- [x] Auth (NextAuth v5 JWT) + middleware protegendo rotas por role
- [x] Seed: admin, 3 lojistas mock, 6 produtos mock (`prisma/seed.ts`)
- [x] Layout admin (sidebar + topbar)
- [x] Layout lojista (sidebar + topbar)

## FASE 2 — Admin Core ✅ Completa

- [x] Dashboard admin (métricas reais via Prisma + gráfico Recharts)
- [x] CRUD completo de produtos (com upload de imagens via Supabase Storage)
- [x] Gestão de lojistas (aprovar/suspender, detalhe)
- [x] Painel de pedidos (fulfillment: separar, embalar, inserir rastreio)
- [x] Financeiro admin (faturas por lojista)

## FASE 3 — Portal Lojista ✅ Completa

- [x] Dashboard lojista (métricas próprias)
- [x] Catálogo Pablo (navegar, simular margem, análise via Groq)
- [x] Publicação com 1 clique (formulário pré-preenchido)
- [x] Meus anúncios (status, pausar, remover)
- [x] Pedidos recebidos (timeline de status, dados do comprador não-sensíveis)
- [x] Financeiro lojista (faturas + o que devo)
- [x] OAuth ML / Shopee — conectar conta (`lib/mercadolivre.ts`, `lib/shopee.ts` criados aqui)

## FASE 4 — Integrações Reais ✅ Completa

- [x] `MercadoLivreClient` (`lib/mercadolivre.ts`) — publish/pause/activate, refresh automático em 401, backoff em 429, `getOrders`/`getOrder`/`getShipment`
- [x] `ShopeeClient` (`lib/shopee.ts`) — assinatura HMAC-SHA256 por request, `addItem`/`unlistItem`/`getOrderList`/`getOrderDetail`
- [x] Publicação real nas plataformas (`/api/lojista/publicar`) — em erro da API externa, salva `Anuncio` com `status: ERRO` + `pausadoPor` (testado e confirmado)
- [x] Webhook ML (`/api/webhooks/mercadolivre`) — valida assinatura best-effort, sempre responde 200
- [x] Webhook Shopee (`/api/webhooks/shopee`) — valida assinatura HMAC obrigatória (401 sem ela, testado)
- [x] Cron fallback polling (`/api/cron/sync-pedidos`) — protegido por `CRON_SECRET`, usa Redis para rastrear última sincronização por integração
- [x] Mappers `lib/mappers/{ml,shopee,types}.ts` + `lib/pedido-sync.ts` (upsert idempotente via `plataformaOrderId`)

**Atualização 2026-06-22:** `ML_APP_ID`/`ML_SECRET` reais configurados em produção — publicação
no Mercado Livre **confirmada funcionando ponta a ponta** (anúncio sobe de verdade). Ainda
**pendente pra Shopee**: sem `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY` reais, não foi possível
testar publish/webhook contra a API de verdade — só o caminho de erro e a validação de
assinatura/payload foram exercitados manualmente.

**Gaps no Shopee (não bloqueiam, mas precisam de credenciais reais pra resolver):** resolução de `category_id` e upload de imagem via Media Space API não implementados — `image_id_list` fica vazio.

## FASE 5 — Financeiro Automatizado ✅ Completa

- [x] `lib/mercadopago.ts` — `createFaturaPaymentLink` (Preference) + `buscarPagamentoMP` (Payment), best-effort sem `MP_ACCESS_TOKEN`
- [x] `lib/financeiro.ts` — `enviarFatura` (gera link MP + email), `confirmarPagamentoFatura` (webhook), `executarGeracaoQuinzenal` (detecta período 1-15/16-fim do mês)
- [x] `POST /api/admin/financeiro/faturas/[id]/enviar` — gera link + envia `FaturaEmitida`; `PATCH [id]` restrito a `status: PAGA` (confirmação manual fora do MP)
- [x] `POST /api/webhooks/mercadopago` — valida `x-signature`/`x-request-id` (HMAC, formato documentado pela MP), confirma pagamento aprovado
- [x] `GET /api/cron/gerar-faturas` (dias 1 e 16) e `GET /api/cron/alertas-vencimento` (diário) — protegidos por `CRON_SECRET`
- [x] Templates de email (texto, consistente com `lib/email.ts` já existente): `FaturaEmitida`, `FaturaPaga`, `FaturaVencendo`, `PedidoRecebido` (admin), email de teste — `NovoLojista`/`BemVindoLojista`/`PedidoEnviado` já existiam de fases anteriores
- [x] `EmailLog` — todo envio (sent/failed/skipped) registrado, alimenta o painel de status
- [x] Aviso ao admin em todo pedido novo sincronizado (respeita toggle `ConfiguracaoNotificacao.emailNovoPedido`)
- [x] Painel `/admin/configuracoes` → aba **Sistema**: status de DB/Redis, integrações ativas por plataforma, último webhook ML/Shopee, última execução dos 3 jobs, botões "Forçar sync agora" / "Gerar faturas agora" / "Testar email"
- [x] `DEPLOY.md` + `vercel.json` (crons configurados; nota sobre limite do plano Hobby)
- [x] `PagarFaturaButton` (lojista) ligado ao `mpPaymentLink` real

**Desvio do spec literal:** seção 5.3 do prompt pedia BullMQ (`lib/queue.ts` + workers). Mantida a mesma decisão da Fase 4 — substituído por rotas `/api/cron/*`, já que o deploy é Vercel serverless. Seção 5.1 pedia templates em React Email (`@react-email/components`); optei por estender o `lib/email.ts` (texto simples via Resend) já estabelecido nas fases anteriores, evitando duas arquiteturas de email paralelas sem ganho funcional.

**Limitação conhecida:** sem `MP_ACCESS_TOKEN`/`RESEND_API_KEY` reais, o link de pagamento fica `null` e os emails ficam "skipped" no `EmailLog` — o fluxo completo (gerar → enviar → link MP → webhook → PAGA) foi validado de ponta a ponta com uma fatura real de teste, exceto a chamada real à API do Mercado Pago.

## Infra de suporte (`lib/`)

| Arquivo | Status |
|---|---|
| `lib/prisma.ts` | ✅ |
| `lib/auth.ts` | ✅ |
| `lib/redis.ts` | ✅ (`redisConfigurado` evita chamadas ao client sem env configurada) |
| `lib/validations.ts` | ✅ |
| `lib/crypto.ts` | ✅ (encriptação AES-256-GCM de tokens OAuth) |
| `lib/mercadolivre.ts` | ✅ |
| `lib/shopee.ts` | ✅ |
| `lib/mercadopago.ts` | ✅ |
| `lib/financeiro.ts` | ✅ |
| `lib/sync.ts` | ✅ (extraído da Fase 5, reusado por cron + botão manual) |
| `lib/groq.ts` | ✅ (fora do roadmap original) |
| `lib/notificacoes.ts` | ✅ (fora do roadmap original) |
| `lib/storage.ts` | ✅ |
| `lib/pedido-sync.ts` | ✅ |
| `lib/rate-limit.ts` | ✅ (rate limit 10 req/min/lojista via Redis, aplicado em `POST /api/lojista/publicar`; best-effort se Redis não configurado) |
| `lib/queue.ts` (BullMQ) | ❌ — substituído por rotas `/api/cron/*` (ver "Adicionado fora do roadmap") |

## ✅ Vercel Hobby (plano gratuito) — limite de cron — resolvido

`vercel.json` só tem os 2 crons diários permitidos pelo Hobby (`gerar-faturas`,
`alertas-vencimento`). Os 2 crons sub-diários (`sync-pedidos` 15min, `refresh-tokens` 6h) rodam
via cron-job.org (externo, grátis) chamando `/api/cron/*` com `Authorization: Bearer CRON_SECRET`
— ver seção DEPLOY no topo.

## Próximos passos sugeridos (prioridade, de cima pra baixo)

1. **Credenciais reais da Shopee** (`SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY`) — ML já confirmado
   funcionando ponta a ponta (2026-06-22); falta validar o mesmo fluxo na Shopee.
2. Publicar de verdade um produto de roupa com variações de tamanho numa conta real do ML
   (Fase 2 do projeto de tamanho/cor — código já implementado, falta só o teste real)
3. Testar uma compra real de um tamanho específico (Fase 3 do mesmo projeto — sincronização de
   pedido/estoque por variação, código já implementado)
4. Fase 6 (Atacado Coletivo) — validar base de negócio antes de codificar
5. Passada de polimento (ver "AUDITORIA DE OTIMIZAÇÃO" acima) quando o projeto atingir 90%
6. Implementar funcionalidade de "Kits de Páginas" no modal de Divulgação de Catálogos (salvar seleção de páginas para disparos repetidos).
7. (Opcional, baixo custo) Cachear a sugestão de preço ML na vitrine pública — hoje consulta a
   API real por produto a cada carregamento da página, ~7s pra 24 produtos

## Infra de suporte (`lib/`) — adicionado fora da tabela original

| Arquivo | Status |
|---|---|
| `lib/ncm.ts` | ✅ busca real na tabela oficial de NCM |
| `lib/scraper.ts` | ✅ leitura best-effort de páginas de produto pra importação |
| `lib/notificacoes-internas.ts` | ✅ central de notificações admin/lojista (separado de `lib/notificacoes.ts`) |
| `lib/estoque-sync.ts` | ✅ pausa automática de anúncio ao zerar estoque |
| `lib/configuracao-financeira.ts` | ✅ sugestão de preço com taxa real do ML / fórmula real Shopee |
| `lib/ml-size-chart.ts` | ⏳ Fase 2 do projeto de variações (ainda não criado) |
| `lib/taxas-marketplace.ts` | ✅ fórmula real Shopee (CNPJ/CPF) + aviso frete grátis obrigatório ML |
| `lib/cosmos.ts` | ✅ consulta GTIN/EAN por código ou nome (Cosmos API / Bluesoft) |
