# CLAUDE.md — DropyAtacado Platform
> Lê este arquivo inteiro antes de qualquer ação. É a lei do projeto.
>
> **Última Atualização (2026-07-02):** **Busca visual por foto no Mapa de Catálogos** — admin arrasta
> a foto de um produto e o sistema acha no catálogo cadastrado (verde) E nas páginas ainda não
> cadastradas (crop roxo). Embeddings CLIP via **Jina AI** (`lib/jina.ts`, `jina-clip-v2`, 1024 dims);
> formato correto da API é `input:[{image:"data:..."}]`/`[{text:"..."}]` (o wrapper
> `{type:"image_url"}` é do Groq e dá 422 na Jina). pgvector em `ProdutoAtacado.embedding` e
> `MapaCatalogoCrop.embedding` — AMBAS declaradas como `Unsupported("vector(1024)")` no schema,
> senão `prisma db push` apaga as colunas. Indexação por crop usa grid configurável
> (`CatalogoFornecedor.gridCrops`), salva a miniatura do recorte (`uploadCropImagem`, bucket
> `produtos/crops/`), e clicar no card abre modal com a página inteira do PDF (pdf.js on-demand).
> Rate limit da Jina (429, 100k tokens/min) tratado com espera de 60s no indexar-produtos. Ver
> STATUS.md → "🔎 Busca visual por foto". Antes: disparo em massa de caixas abertas para grupo do
> WhatsApp, boas-vindas por IA ao novo membro, Instagram Stories/carrossel corrigidos.

## ⚙️ PROTOCOLO DE PRÉ-EXECUÇÃO (OBRIGATÓRIO)

### Regra de triagem — conversa vs. comando

Antes de aplicar o protocolo, classificar a mensagem do usuário:

- **Mensagem termina com "?" → CONVERSA.** É pergunta, dúvida, pedido de opinião/explicação.
  Responder direto, sem relatório, sem gastar tokens com burocracia.
- **Mensagem termina com "." (ou é uma instrução clara de ação, sem "?") → COMANDO.**
  Aplicar o protocolo de pré-execução abaixo antes de qualquer ação não-trivial.
- Em caso de ambiguidade (não termina nem com "?" nem com "."), tratar como conversa e,
  se for o caso, perguntar antes de assumir que é um comando.

Antes de qualquer ação não-trivial classificada como COMANDO,
apresentar este relatório e aguardar confirmação explícita ("CONFIRMAR", "APROVAR" ou "PROSSEGUIR"):

```
─────────────────────────────
PRE-EXECUTION REPORT
Operação: [descrição]
Estratégia: [abordagem — o que será reaproveitado vs. criado do zero]
Arquivos tocados: [estimativa: poucos / moderado / muitos]
Chamadas de ferramenta: [estimativa: poucas / moderado / muitas]
Complexidade: [Baixa|Média|Alta]
Risco: [Baixo|Médio|Alto]
Status: AGUARDANDO CONFIRMAÇÃO
─────────────────────────────
```

Nota: não fabricar números de tokens ("tokens padrão", "economia %") — não há medição real
disponível para isso, e apresentar números inventados como se fossem dados reais não é aceitável.
As estimativas acima são sempre qualitativas e honestas.

Prioridades em toda execução:
- Minimizar número de chamadas de ferramenta e arquivos tocados
- Maximizar reuso de componentes/libs já existentes no projeto
- Menor quantidade de operações para atingir o resultado

## 🎯 O QUE É ESSE PROJETO

Plataforma SaaS de dropshipping B2B2C:
- **Pablo** = fornecedor/admin (dono dos produtos, faz o fulfillment)
- **Lojistas** = clientes do Pablo (publicam produtos dele no ML e Shopee, ficam com a margem)
- **Fluxo**: Lojista escolhe produto → publica com 1 clique → vende → Pablo embala e envia → Lojista paga o custo atacado

## 🏗️ STACK (NÃO MUDAR SEM PERGUNTAR)

```
Frontend: Next.js 14 App Router + TypeScript + Tailwind CSS
UI: Shadcn/UI + Lucide React + Framer Motion
Auth: NextAuth.js v5 (JWT strategy) + bcrypt
DB: PostgreSQL via Supabase + Prisma ORM
Queue: BullMQ + Redis (Upstash)
Pagamentos: Mercado Pago SDK (cobrança lojista → Pablo)
APIs externas: Mercado Livre API oficial + Shopee Open Platform API
Deploy: Vercel (frontend + API routes) + Supabase (DB) + Upstash (Redis)
Validação: Zod em todas as rotas
Email: Resend SDK
Storage: Supabase Storage (imagens de produtos)
```

## 📁 ESTRUTURA DE PASTAS (CRIAR EXATAMENTE ASSIM)

```
dropsync/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx                    # layout admin com sidebar
│   │   ├── admin/
│   │   │   ├── dashboard/page.tsx        # métricas globais
│   │   │   ├── produtos/
│   │   │   │   ├── page.tsx              # lista produtos do catálogo
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── lojistas/
│   │   │   │   ├── page.tsx              # lista lojistas + aprovação
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── pedidos/
│   │   │   │   ├── page.tsx              # todos os pedidos para fulfillment
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── financeiro/page.tsx       # recebíveis por lojista
│   │   │   └── configuracoes/page.tsx
│   ├── (lojista)/
│   │   ├── layout.tsx                    # layout lojista com sidebar
│   │   ├── dashboard/page.tsx            # métricas do lojista
│   │   ├── catalogo/
│   │   │   ├── page.tsx                  # catálogo Pablo para escolher
│   │   │   └── [id]/page.tsx             # detalhe + publicar
│   │   ├── meus-anuncios/page.tsx        # anúncios publicados ML/Shopee
│   │   ├── pedidos/page.tsx              # pedidos recebidos
│   │   ├── financeiro/page.tsx           # o que devo ao Pablo
│   │   └── integracoes/page.tsx          # conectar ML e Shopee
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── admin/
│   │   ├── produtos/route.ts
│   │   ├── lojistas/route.ts
│   │   └── pedidos/route.ts
│   ├── lojista/
│   │   ├── catalogo/route.ts
│   │   ├── publicar/route.ts             # publica no ML ou Shopee
│   │   ├── anuncios/route.ts
│   │   └── integracoes/route.ts
│   ├── webhooks/
│   │   ├── mercadolivre/route.ts         # recebe notificações de venda ML
│   │   └── shopee/route.ts               # recebe notificações de venda Shopee
│   └── cron/
│       └── sync-pedidos/route.ts         # fallback polling a cada 15min
├── components/
│   ├── admin/
│   ├── lojista/
│   └── shared/
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── redis.ts
│   ├── mercadolivre.ts                   # wrapper ML API
│   ├── shopee.ts                         # wrapper Shopee API
│   ├── queue.ts                          # BullMQ jobs
│   └── validations.ts                    # schemas Zod
├── prisma/
│   └── schema.prisma
├── hooks/
├── types/
└── middleware.ts                         # protege rotas por role
```

## 🗄️ SCHEMA DO BANCO (PRISMA — IMPLEMENTAR COMPLETO)

> ⚠️ **Este bloco está desatualizado em relação a [prisma/schema.prisma](prisma/schema.prisma), que é a fonte da verdade.**
> Desde a versão abaixo já foram adicionados: `Pedido.compradorTelefone/compradorEmail/rastreioToken`,
> o model `EtapaPedido` (prova de envio interna), `Fatura.mpPaymentLink`, os models `Categoria`,
> `ConfiguracaoNotificacao`, `EmailLog`, `NcmCodigo` (tabela oficial de NCM), `VendaNaoVinculada`
> e `Notificacao` (sincronização/central de notificações), e o trio `ProdutoVariacao` /
> `AnuncioVariacao` / `AnuncioSizeChart` (variações reais por tamanho/cor — projeto em
> andamento, ver plano salvo de "Variações reais por tamanho + Tabela de medidas do ML").
> Também adicionados: `Anuncio.produtoId` ficou opcional + `Anuncio.kitId`, e os models `Kit`
> (`nome`, `descricao`, `precoVenda`) e `KitItem` (kit com múltiplos produtos — ver
> STATUS.md → "Kits — feature completa"); `ConfiguracaoFinanceira.tipoVendedorShopee`
> (enum `TipoVendedorShopee`, usado pra calcular a taxa real da Shopee);
> `ProdutoImagem.destacarVitrine` (capa da vitrine pública, independente do `principal` já
> existente que é a capa exigida pelos marketplaces). Mais recentemente (Fase 6 — Atacado
> Coletivo, ver STATUS.md → "FASE 6"): os models `AssinaturaAtacado`, `RodadaAtacado`,
> `ReservaAtacado`, `ProdutoAtacado` (catálogo separado do catálogo do lojista, com
> `unidadesPorCaixa`/peso/dimensões próprios) e `ConfiguracaoFinanceira.cepOrigem`. Pagamento do
> atacado usa Pix direto via QR Code (`mpQrCode`/`mpQrCodeBase64` em `AssinaturaAtacado` e
> `ReservaAtacado`), não o checkout hospedado do Mercado Pago usado no resto do sistema (faturas/
> assinatura de lojista, que continuam em `Preference`/link). Mais recentemente: `ProdutoAtacado`
> ganhou `precoCatalogo` (preço impresso no catálogo do fornecedor, referência), `codigoAnatel`
> (homologação Anatel, opcional) e relação com `fornecedorId`; os models `FornecedorAtacado`
> (uso interno — nome/catálogo/telefone/endereço) e `CatalogoFornecedor`/`CatalogoFornecedorItem`
> (PDF do catálogo do fornecedor indexado por página, vira pré-cadastro de `ProdutoAtacado`). O
> arquivo PDF do catálogo do fornecedor (`CatalogoFornecedor.arquivoUrl`) é hospedado no
> **Cloudflare R2** (`lib/storage-r2.ts`), não no Supabase Storage — decisão por causa do teto de
> ~50MB por arquivo do plano Free da Supabase, que não é editável. O resto do storage (fotos de
> produto, prova de envio) continua no Supabase Storage normal (`lib/storage.ts`).
> Mais recentemente (WhatsApp + Fase 6, ver STATUS.md → "FASE 6"): o model `GrupoWhatsappCategoria`
> (vínculo categoria do catálogo do atacado ↔ grupo real de WhatsApp via Evolution API, usado pelo
> "Abrir caixa"); `RodadaAtacado` ganhou `grupoMensagemEnviada`/`grupoIdUsado` e o enum
> `RodadaAtacadoStatus` ganhou os estágios de fulfillment `SEPARANDO`/`EMBALANDO`/`PRONTA_ENVIO`
> entre `FECHADA` e `ENVIADA` (cada avanço de etapa dispara notificação 1:1 por WhatsApp pra todo
> comprador com reserva paga daquela caixa, via `lib/atacado.ts::avancarEtapaRodada`); `ReservaAtacado`
> ganhou `metodoFrete` (nome da opção de frete escolhida pelo comprador no checkout, que agora tem
> 3 opções de transportadora + retirada local grátis, ver `lib/atacado.ts::listarOpcoesFrete`).
> WhatsApp self-hospedado via Evolution API (Railway, não Vercel — precisa de conexão persistente);
> wrapper em `lib/evolution.ts` cobre grupo e 1:1 (`enviarMensagemGrupo`/`enviarImagemGrupo` e
> `enviarMensagemIndividual`/`enviarImagemIndividual`). Banner de imagem do produto pra WhatsApp é
> gerado on-demand via `next/og` em `GET /api/atacado/banner/[id]` (rota pública, sem auth).
> Telefone do comprador (`ReservaAtacado.compradorTelefone`/`AssinaturaAtacado.compradorTelefone`)
> é sempre Brasil sem DDI — `lib/evolution.ts::normalizarTelefoneBR` assume `55` na hora de enviar
> mensagem 1:1 (mensagem de grupo não precisa, usa JID); `lib/format.ts::mascararTelefone` aplica
> a máscara `(XX) XXXXX-XXXX` no campo de cadastro pra reduzir erro de digitação.
> Mais recentemente: `GrupoWhatsappCategoria` ganhou `linkConvite` (link de convite público
> `chat.whatsapp.com/...`, colado pelo admin, usado pelo botão "Quero!"/"Entrar no grupo" da vitrine
> pública do atacado em `/atacado` — diferente do `grupoId`/JID interno). Vitrine pública do atacado
> em `app/atacado/page.tsx` (não confundir com `app/atacado/[slug]/page.tsx`, que é o checkout de
> uma rodada). Auto-preenchimento do pré-cadastro por IA de visão:
> `lib/groq.ts::extrairDadosProdutoDeImagem` lê um recorte da página do catálogo PDF e devolve
> código/nome/categoria/custo/preço/PÇS-CX/marca/peso/dimensões/número Anatel (lê o selo da Anatel
> na imagem). O pré-cadastro tem 2 botões de recorte ("Ler com IA" preenche campos; "Recortar
> imagem" define só a foto). "Fornecedores" é item do menu lateral do admin
> (`/admin/atacado/fornecedores`, `FornecedoresAtacadoPanel`), não mais um diálogo.
> `ProdutoAtacado` ganhou `linkReferencia`/`posicaoMaisVendido` (prova social "Nº mais vendido no
> ML" — selo na vitrine abre o link num popup `window.open`, pois o ML bloqueia iframe/modal; a
> posição é manual, ML bloqueia leitura). Vitrine `/atacado` tem busca (`q`) + ordenação (`ordem`).
> Descrição do produto do atacado tem botão "Gerar com IA"
> (`lib/groq.ts::gerarDescricaoProdutoAtacado`). `ProdutoAtacado` ganhou `codigo` (casamento por
> `codigo`+`fornecedorId` ao subir catálogo novo: atualiza preços em vez de duplicar). Vitrine mostra
> `precoCatalogo` (não a venda sugerida). Selo "Mais vendido no ML" imita o visual do ML (amarelo +
> aperto de mão + tarja laranja) e abre o ranking em popup (`window.open`, ML bloqueia iframe).
> `RodadaAtacado.unidadesReservadasLoja`: admin reserva unidades da caixa pra própria loja e o custo
> é diluído no preço do coletivo (`lib/atacado.ts::calcularRodadaComReservaLoja`); `metaUnidades`
> guardada é sempre a meta do COLETIVO.
> Sempre confira o arquivo real antes de assumir este schema.

## 🔒 PRIVACIDADE DO FORNECEDOR (regra absoluta — todo o sistema)

Nenhuma informação que identifique o fornecedor pode aparecer em página/rota **pública** (vitrine
`/atacado`, checkout `/atacado/[slug]`, banner, e qualquer rota não-admin). Isso inclui: nome do
fornecedor, nome do catálogo, número de página do catálogo, custo de aquisição (`custoUnitario`) e
a marca de origem. Tudo isso é restrito ao painel admin. O vínculo interno produto↔catálogo↔página
fica em `CatalogoFornecedorItem` (uso admin), nunca exposto. Ao tocar qualquer superfície pública
do atacado, confira o `select` do Prisma e o que vai pro client — não exponha esses campos.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── USUÁRIOS ───────────────────────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  role          Role      @default(LOJISTA)
  status        UserStatus @default(PENDING)  // admin aprova lojistas
  phone         String?
  document      String?   // CNPJ ou CPF
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // relações
  lojista       Lojista?
  sessions      Session[]

  @@index([email])
  @@index([role, status])
}

enum Role {
  ADMIN
  LOJISTA
}

enum UserStatus {
  PENDING    // aguarda aprovação do admin
  ACTIVE
  SUSPENDED
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([token])
  @@index([userId])
}

// ─── LOJISTA ────────────────────────────────────────────────────────────────

model Lojista {
  id            String   @id @default(cuid())
  userId        String   @unique
  storeName     String
  storeUrl      String?
  logoUrl       String?
  approvedAt    DateTime?
  approvedBy    String?  // userId do admin

  user          User     @relation(fields: [userId], references: [id])
  integracoes   Integracao[]
  anuncios      Anuncio[]
  pedidos       Pedido[]
  faturas       Fatura[]

  @@index([userId])
}

// ─── INTEGRAÇÕES ML / SHOPEE ─────────────────────────────────────────────────

model Integracao {
  id            String    @id @default(cuid())
  lojistaId     String
  plataforma    Plataforma
  accountId     String    // ID da conta na plataforma
  accountName   String
  accessToken   String    // criptografado
  refreshToken  String    // criptografado
  tokenExpiry   DateTime
  ativa         Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  lojista       Lojista   @relation(fields: [lojistaId], references: [id])

  @@unique([lojistaId, plataforma])
  @@index([lojistaId])
}

enum Plataforma {
  MERCADOLIVRE
  SHOPEE
}

// ─── CATÁLOGO DO PABLO (ADMIN) ───────────────────────────────────────────────

model Produto {
  id            String    @id @default(cuid())
  sku           String    @unique
  nome          String
  descricao     String    @db.Text
  descricaoHtml String?   @db.Text  // rich text para anúncios
  categoria     String
  subcategoria  String?
  precoAtacado  Decimal   @db.Decimal(10, 2)  // quanto Pablo cobra do lojista
  pesoKg        Decimal   @db.Decimal(6, 3)
  dimensoes     Json?     // { comprimento, largura, altura } em cm
  estoque       Int       @default(0)
  estoqueMinimo Int       @default(5)
  imagens       ProdutoImagem[]
  ativo         Boolean   @default(true)
  destaque      Boolean   @default(false)
  tags          String[]
  atributos     Json?     // { cor, tamanho, material, etc }
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  anuncios      Anuncio[]
  itensPedido   ItemPedido[]

  @@index([ativo, destaque])
  @@index([categoria])
  @@index([sku])
}

model ProdutoImagem {
  id         String  @id @default(cuid())
  produtoId  String
  url        String
  alt        String?
  ordem      Int     @default(0)
  principal  Boolean @default(false)

  produto    Produto @relation(fields: [produtoId], references: [id], onDelete: Cascade)

  @@index([produtoId])
}

// ─── ANÚNCIOS (lojista publica produto no ML/Shopee) ────────────────────────

model Anuncio {
  id              String         @id @default(cuid())
  lojistaId       String
  produtoId       String
  plataforma      Plataforma
  plataformaItemId String?       // ID do anúncio na plataforma (ML: MLB123, Shopee: 123)
  titulo          String
  precoVenda      Decimal        @db.Decimal(10, 2)  // preço que lojista define
  status          AnuncioStatus  @default(RASCUNHO)
  url             String?        // link do anúncio na plataforma
  pausadoPor      String?        // motivo de pausa
  publicadoEm     DateTime?
  updatedAt       DateTime       @updatedAt
  createdAt       DateTime       @default(now())

  lojista         Lojista   @relation(fields: [lojistaId], references: [id])
  produto         Produto   @relation(fields: [produtoId], references: [id])
  pedidos         Pedido[]

  @@unique([lojistaId, produtoId, plataforma])
  @@index([lojistaId, status])
  @@index([plataformaItemId])
}

enum AnuncioStatus {
  RASCUNHO
  PUBLICADO
  PAUSADO
  REMOVIDO
  ERRO
}

// ─── PEDIDOS ────────────────────────────────────────────────────────────────

model Pedido {
  id                String       @id @default(cuid())
  lojistaId         String
  anuncioId         String?
  plataforma        Plataforma
  plataformaOrderId String       @unique  // ID do pedido na plataforma
  
  // comprador (dados do cliente final — só para Pablo fazer o envio)
  compradorNome     String
  compradorDoc      String?
  enderecoEntrega   Json         // endereço completo estruturado

  // valores
  valorVenda        Decimal      @db.Decimal(10, 2)  // quanto lojista recebeu
  valorCusto        Decimal      @db.Decimal(10, 2)  // quanto lojista deve ao Pablo
  frete             Decimal      @db.Decimal(10, 2)  @default(0)

  // fulfillment
  status            PedidoStatus @default(NOVO)
  rastreio          String?
  transportadora    String?
  notaFiscal        String?
  embalagemEm       DateTime?
  enviadoEm         DateTime?
  entregueEm        DateTime?
  canceladoEm       DateTime?
  motivoCancelamento String?

  // faturamento
  faturaId          String?

  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  lojista           Lojista      @relation(fields: [lojistaId], references: [id])
  anuncio           Anuncio?     @relation(fields: [anuncioId], references: [id])
  itens             ItemPedido[]
  fatura            Fatura?      @relation(fields: [faturaId], references: [id])

  @@index([lojistaId, status])
  @@index([plataformaOrderId])
  @@index([status, enviadoEm])
}

enum PedidoStatus {
  NOVO           // chegou da plataforma
  CONFIRMADO     // pagamento confirmado
  SEPARANDO      // Pablo separando no estoque
  EMBALANDO      // Pablo embalando
  AGUARDANDO_COLETA
  ENVIADO        // com rastreio
  ENTREGUE
  CANCELADO
  DEVOLVIDO
}

model ItemPedido {
  id         String  @id @default(cuid())
  pedidoId   String
  produtoId  String
  quantidade Int
  precoUnit  Decimal @db.Decimal(10, 2)  // preço de custo no momento

  pedido     Pedido  @relation(fields: [pedidoId], references: [id])
  produto    Produto @relation(fields: [produtoId], references: [id])

  @@index([pedidoId])
}

// ─── FINANCEIRO ─────────────────────────────────────────────────────────────

model Fatura {
  id          String        @id @default(cuid())
  lojistaId   String
  numero      String        @unique  // FAT-2024-0001
  periodoInicio DateTime
  periodoFim    DateTime
  totalPedidos  Int
  valorTotal    Decimal      @db.Decimal(10, 2)
  status        FaturaStatus @default(PENDENTE)
  vencimento    DateTime
  pago          Boolean      @default(false)
  pagoEm        DateTime?
  mpPaymentId   String?      // ID do pagamento no Mercado Pago

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  lojista     Lojista       @relation(fields: [lojistaId], references: [id])
  pedidos     Pedido[]

  @@index([lojistaId, status])
}

enum FaturaStatus {
  PENDENTE
  ENVIADA
  PAGA
  VENCIDA
  CANCELADA
}
```

## 🔐 AUTH — REGRAS ABSOLUTAS

```
- NextAuth.js v5 com JWT strategy
- Dois roles: ADMIN e LOJISTA
- Middleware protege rotas:
  /admin/* → só ADMIN
  /dashboard, /catalogo, /meus-anuncios, /pedidos (lojista), /integracoes → só LOJISTA ACTIVE
- Lojista PENDING → redireciona para /aguardando-aprovacao
- Access token: 1h | Refresh: 7d em httpOnly cookie
- Senha: bcrypt salt 12
- Admin criado via seed, não via cadastro público
```

## 🌐 INTEGRAÇÕES EXTERNAS

### Mercado Livre
```
OAuth 2.0: https://auth.mercadolivre.com.br/authorization
Publicar: POST https://api.mercadolibre.com/items
Webhook: POST /api/webhooks/mercadolivre (topic=orders_v2)
Listar pedidos: GET https://api.mercadolibre.com/orders/search
Renovar token: POST https://api.mercadolibre.com/oauth/token (grant_type=refresh_token)
App ID: process.env.ML_APP_ID
Secret: process.env.ML_SECRET
Redirect URI: process.env.ML_REDIRECT_URI
```

### Shopee
```
OAuth 2.0 com HMAC-SHA256 em cada request
Publicar: POST /api/v2/product/add_item
Webhook: POST /api/webhooks/shopee (order.status.update)
Listar pedidos: GET /api/v2/order/get_order_list
Partner ID: process.env.SHOPEE_PARTNER_ID
Partner Key: process.env.SHOPEE_PARTNER_KEY
Redirect URI: process.env.SHOPEE_REDIRECT_URI
```

## 📦 VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# Database
DATABASE_URL=

# Auth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Mercado Livre
ML_APP_ID=
ML_SECRET=
ML_REDIRECT_URI=
ML_ENCRYPTION_KEY=  # para encriptar tokens no DB

# Shopee
SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
SHOPEE_REDIRECT_URI=

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Mercado Pago (cobranças)
MP_ACCESS_TOKEN=
MP_WEBHOOK_SECRET=

# Resend (email)
RESEND_API_KEY=

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_KEY=

# App
NEXT_PUBLIC_APP_URL=
ADMIN_SEED_EMAIL=
ADMIN_SEED_PASSWORD=

# Cron (protege /api/cron/*)
CRON_SECRET=

# Groq (IA — otimização de anúncios, chat automático; gratuito)
GROQ_API_KEY=

# Evolution API (WhatsApp — notificação de rastreio 1:1 hoje; grupos de compra coletiva
# da Fase 6 pendente — aguardando setup do usuário na Railway)
EVOLUTION_API_URL=
EVOLUTION_INSTANCE=
EVOLUTION_API_KEY=

# Cosmos API (Bluesoft) — consulta de GTIN/EAN, alternativa à GS1 Brasil
# (que exige associação + liberação prévia ainda não obtida)
COSMOS_API_TOKEN=

# Melhor Envio (Fase 6 — cálculo real de frete por CEP no checkout de compra coletiva)
MELHOR_ENVIO_TOKEN=

# Cloudflare R2 (hospedagem dos PDFs de catálogo de fornecedor — plano Free da Supabase
# Storage tem teto fixo de ~50MB/arquivo, insuficiente pra esses arquivos)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_CATALOGOS=
R2_ENDPOINT=
R2_PUBLIC_URL_CATALOGOS=
```

**Capacidade e plano de upgrade (por prioridade):** o sistema roda hoje quase todo em planos
gratuitos. Gargalos na ordem em que aparecem (ver detalhes em [STATUS.md](STATUS.md) → "📊
CAPACIDADE E PLANO DE UPGRADE"): 1) **WhatsApp em rajada** (risco de ban — espaçar envios 1:1 antes
de volume alto; Railway ~US$5/mês pra ficar de pé); 2) **Groq diário** (cadastro em massa por IA);
3) **Supabase Free** (500 MB + conexões — 1º upgrade obrigatório, Pro ~US$25/mês); 4) **fotos no
Supabase Storage 1 GB** (PDFs já no R2 10 GB); 5) **Upstash 10k/dia + Vercel Hobby**; 6) **Resend
3k/mês**. Sem teto prático: Mercado Pago e Melhor Envio.

**Status real do deploy:** ver [STATUS.md](STATUS.md) → seção "🚀 DEPLOY" — projeto em produção na
Vercel no domínio próprio **https://www.dropyatacado.com.br** (canônico COM `www`; o apex sem www
faz 308 redirect e quebra webhooks POST — toda URL de integração deve usar `www`). Banco Supabase
próprio (`dropsync`, isolado), Redis Upstash, GitHub configurados. `lib/queue.ts` (BullMQ) nunca foi
implementado — substituído por rotas `/api/cron/*` por incompatibilidade com deploy serverless.
`MP_ACCESS_TOKEN` é da conta MP de produção (`APP_USR-...`); `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL`
sempre com `www`.

## 🎨 DESIGN SYSTEM

```
Cores:
  Primary: #1D9E75 (verde — marca DropSync)
  Primary Dark: #0F6E56
  Background: #F8FAFC
  Card: #FFFFFF
  Border: #E2E8F0
  Text Primary: #0F172A
  Text Secondary: #64748B
  Danger: #EF4444
  Warning: #F59E0B
  Success: #10B981

Fontes: Inter (sistema)

Componentes sempre via Shadcn/UI + customização com Tailwind
Sidebar fixa desktop, drawer mobile
Tabelas com paginação (10, 25, 50 por página)
Toasts via sonner
Loading states em todos os fetches
Empty states com CTA quando não há dados
```

**Dívida de polimento registrada (ver STATUS.md → "AUDITORIA DE OTIMIZAÇÃO"):**
dark mode com paleta genérica (não a identidade DropSync), contraste WCAG não verificado nos
badges de status, e cores fora dos tokens do tema em `status-badge.tsx`. Não corrigir agora —
só na passada final de otimização quando o projeto chegar a 90%.

## ⚙️ REGRAS DE DESENVOLVIMENTO

1. **TypeScript strict** — sem `any`, tipagem explícita em tudo
2. **Server Components por padrão**, `'use client'` só quando necessário (formulários, estado, eventos)
3. **Zod** valida TODOS os inputs de API route
4. **Prisma transactions** em operações que tocam múltiplas tabelas
5. **Error handling**: erros de negócio → response 4xx com `{ error: { code, message } }`, erros técnicos → 500 com log
6. **Nunca** hardcodar IDs, segredos ou URLs
7. **Sempre** usar índices Prisma nas queries com filtros
8. **Imagens** de produto via Supabase Storage, nunca base64 no banco
9. **Tokens OAuth** dos lojistas: encriptar com `ML_ENCRYPTION_KEY` antes de salvar no DB
10. **Rate limit** nas rotas de publicação (máx 10 req/min por lojista)

## 🚀 ORDEM DE IMPLEMENTAÇÃO

### FASE 1 — Fundação (COMEÇAR AQUI)
- [ ] Setup Next.js + Prisma + Supabase
- [ ] Schema completo + migration
- [ ] Auth (NextAuth) + middleware de proteção de rotas
- [ ] Seed: criar admin, 3 lojistas mock, 6 produtos mock
- [ ] Layout admin (sidebar + topbar)
- [ ] Layout lojista (sidebar + topbar)

### FASE 2 — Admin Core
- [ ] Dashboard admin (métricas em tempo real)
- [ ] CRUD completo de produtos com upload de imagens
- [ ] Gestão de lojistas (aprovar, suspender, ver detalhes)
- [ ] Painel de pedidos para fulfillment (separar, embalar, inserir rastreio)
- [ ] Financeiro admin (faturas por lojista)

### FASE 3 — Portal Lojista
- [ ] Dashboard lojista (métricas próprias)
- [ ] Catálogo Pablo (navegar + ver detalhes + simular margem)
- [ ] Publicação com 1 clique (formulário pré-preenchido, lojista só define preço)
- [ ] Meus anúncios (status, pausar, remover)
- [ ] Pedidos recebidos (timeline de status)
- [ ] Financeiro lojista (faturas + o que devo)

### FASE 4 — Integrações
- [ ] OAuth ML — conectar conta
- [ ] OAuth Shopee — conectar conta
- [ ] Publicação real no ML (POST /items)
- [ ] Publicação real no Shopee (product.add_item)
- [ ] Webhook ML (receber pedidos)
- [ ] Webhook Shopee (receber pedidos)
- [ ] Cron fallback polling a cada 15min

### FASE 5 — Financeiro Automatizado
- [ ] Geração automática de faturas quinzenais
- [ ] Cobranças via Mercado Pago (link de pagamento)
- [ ] Notificações por email (Resend)

## 📋 CONVENÇÕES DE CÓDIGO

```typescript
// API Routes — padrão de resposta
return NextResponse.json({ data: result }, { status: 200 })
return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Produto não encontrado' } }, { status: 404 })

// Validação de entrada — sempre Zod
const schema = z.object({ ... })
const parsed = schema.safeParse(await req.json())
if (!parsed.success) return NextResponse.json({ error: { code: 'VALIDATION', message: parsed.error.flatten() } }, { status: 422 })

// Auth check em API routes
const session = await auth()
if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
if (session.user.role !== 'ADMIN') return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })

// Prisma — sempre tipado
const produto = await prisma.produto.findUniqueOrThrow({ where: { id } })
```

## 🏁 COMO INICIAR O PROJETO (PABLO RODA ISSO)

```bash
npx create-next-app@latest dropsync --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd dropsync
npx shadcn@latest init
npx prisma init
# instalar deps
npm install prisma @prisma/client next-auth@beta bcryptjs zod bullmq
npm install @upstash/redis mercadopago resend
npm install -D @types/bcryptjs
# após configurar .env:
npx prisma db push
npx prisma db seed
npm run dev
```
