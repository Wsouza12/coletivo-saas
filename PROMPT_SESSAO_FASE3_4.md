# PROMPT DE SESSÃO — FASE 3: Portal Lojista Completo

> Cole após confirmar Fase 2 testada e aprovada.

---

Leia o `CLAUDE.md`. Fases 1 e 2 completas. Implemente a **Fase 3 — Portal do Lojista**.

## 3.1 — Dashboard Lojista (`/dashboard`)

KPIs do lojista logado:
- Pedidos hoje (desta loja)
- Anúncios ativos (ML + Shopee somados)
- Receita do mês (soma `valorVenda` dos pedidos ENVIADO/ENTREGUE)
- Margem do mês (valorVenda - valorCusto)

**Tabela "Últimos pedidos"** (10 mais recentes):
- Produto, Plataforma badge, Valor venda, Status badge, Data

**Card "Próxima fatura"**:
- Valor estimado (pedidos não faturados), vencimento estimado, botão "Ver financeiro"

**Card "Ações rápidas"**:
- "Publicar novo produto" → `/catalogo`
- "Ver pedidos pendentes" → `/pedidos?status=NOVO`

**Alertas**:
- Se alguma integração expirou → banner vermelho "Sua integração com ML/Shopee expirou. Reconectar →"
- Se estoque de produto anunciado ≤ mínimo → aviso amarelo

---

## 3.2 — Catálogo (`/catalogo`)

Catálogo de produtos do Pablo disponíveis para publicação.

### Grid de produtos
- Cards com: imagem principal, nome, SKU, preço atacado (Pablo cobra), badge categoria
- Hover: mostra campo "Defina seu preço" (input) e calcula margem em tempo real
- Filtros: busca, categoria, ordenar por (nome, preço asc/desc, destaque)
- Apenas produtos `ativo: true` são exibidos
- Estoque 0 mostra badge "Sem estoque" e bloqueia publicação

### Detalhe do produto `/catalogo/[id]`

Layout 2 colunas:
- **Esquerda**: galeria de imagens (thumbnail list + imagem principal grande)
- **Direita**:
  - Nome, SKU, descrição completa
  - Preço atacado (custo): R$ XX,XX
  - Estoque disponível
  - Peso e dimensões
  - Tags e atributos

**Painel "Publicar este produto"** (card fixo na direita):
- Select: Plataforma (Mercado Livre | Shopee | Ambas)
- Campo: Título do anúncio (pré-preenchido com nome do produto, editável, max 60 chars)
- Campo: Preço de venda (R$) — com validação > preço atacado
- Cálculo automático: Margem bruta = preço venda - preço atacado (exibir em verde)
- Botão "Publicar agora" → chama `POST /api/lojista/publicar`
  - Se integração não conectada → redireciona para `/integracoes`
  - Se já existe anúncio ativo → pergunta se quer criar outro ou ver o existente
- Loading state com "Publicando no Mercado Livre..." / "Publicando na Shopee..."
- Sucesso: toast + link para ver o anúncio

### API Routes:
```
GET  /api/lojista/catalogo          → lista produtos (filtros, paginação)
GET  /api/lojista/catalogo/[id]     → detalhe + status de anúncios deste lojista
POST /api/lojista/publicar          → { produtoId, plataforma, titulo, precoVenda }
```

Lógica do `POST /api/lojista/publicar`:
1. Valida com `publishAnuncioSchema`
2. Busca integração do lojista para a plataforma solicitada
3. Se Fase 4 implementada: chama API ML ou Shopee e obtém `plataformaItemId`
4. Se Fase 4 ainda não implementada: cria `Anuncio` com status PUBLICADO e `plataformaItemId = null` (mock)
5. Cria registro `Anuncio` no DB
6. Retorna anúncio criado

---

## 3.3 — Meus Anúncios (`/meus-anuncios`)

### Tabs: Todos | Mercado Livre | Shopee

Tabela de anúncios do lojista logado:
- Colunas: Imagem, Produto, Plataforma badge, Título anúncio, Preço venda, Margem (calculada), Status badge, Publicado em, Ações
- Status badge: PUBLICADO=verde, PAUSADO=amarelo, ERRO=vermelho, REMOVIDO=cinza

Ações por anúncio:
- "Ver na plataforma" (abre `url` em nova aba) — se tiver URL
- "Pausar" → PATCH status para PAUSADO
- "Reativar" → PATCH status para PUBLICADO
- "Remover" → confirm dialog → PATCH status para REMOVIDO

Ao pausar/remover: se Fase 4 implementada, também pausa/remove na plataforma.

### API Routes:
```
GET    /api/lojista/anuncios              → lista anúncios do lojista logado
PATCH  /api/lojista/anuncios/[id]/status  → { status }
```

---

## 3.4 — Pedidos Lojista (`/pedidos`)

Visão dos pedidos **do lojista logado** (não do admin).

Tabs por status: Todos | Novos | Em processamento | Enviados | Entregues

Tabela:
- #Pedido da plataforma, Produto(s), Plataforma badge, Valor venda, Status do fulfillment (o que Pablo está fazendo), Data

**Detalhe do pedido** (modal ou página `/pedidos/[id]`):
- Número do pedido, data
- Produto(s) e quantidades
- Endereço de entrega (mostrar só cidade/UF — Pablo já tem o endereço completo)
- Valor venda (quanto o lojista recebeu/receberá da plataforma)
- Status de fulfillment com timeline
- Código de rastreio + transportadora (quando disponível)

**Importante**: o lojista NÃO vê o endereço completo do comprador — só Pablo precisa disso para envio.

### API Routes:
```
GET  /api/lojista/pedidos          → lista pedidos do lojista logado (com filtros)
GET  /api/lojista/pedidos/[id]     → detalhe (sem endereço completo)
```

---

## 3.5 — Financeiro Lojista (`/financeiro`)

**KPIs:**
- Fatura atual em aberto (estimada)
- Total pago este ano
- Próximo vencimento

**Tabela de faturas:**
- Nº, Período, Qtd pedidos, Valor, Vencimento, Status badge, Ações

Ação por fatura ENVIADA:
- Botão "Pagar agora" → abre link de pagamento Mercado Pago em nova aba

**Detalhe da fatura** (modal):
- Lista de todos os pedidos incluídos na fatura
- Valor de cada pedido
- Total

### API Routes:
```
GET  /api/lojista/financeiro/faturas       → faturas do lojista logado
GET  /api/lojista/financeiro/faturas/[id]  → detalhe com pedidos
GET  /api/lojista/financeiro/resumo        → KPIs
```

---

## 3.6 — Integrações (`/integracoes`)

Cards para cada plataforma:

**Card Mercado Livre:**
- Logo ML + título
- Se conectado: "Conectado como [accountName]" + badge verde + botão "Desconectar"
- Se não conectado: botão "Conectar Mercado Livre" → inicia OAuth flow
  - Redireciona para: `https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=ML_APP_ID&redirect_uri=ML_REDIRECT_URI&state=[lojistaId]`
- Callback em `/api/lojista/integracoes/ml/callback`:
  1. Troca `code` por `access_token` + `refresh_token`
  2. Encripta tokens com `lib/crypto.ts`
  3. Salva em `Integracao` (upsert por lojistaId + MERCADOLIVRE)
  4. Redireciona para `/integracoes?success=ml`

**Card Shopee:**
- Mesmo fluxo mas com autenticação Shopee (HMAC-SHA256)
- Callback em `/api/lojista/integracoes/shopee/callback`

**Ao desconectar:**
- Deleta ou desativa `Integracao` no DB
- Anúncios da plataforma ficam com status PAUSADO (não são apagados)

### API Routes:
```
GET    /api/lojista/integracoes                      → lista integrações do lojista
DELETE /api/lojista/integracoes/[plataforma]         → desconectar
GET    /api/lojista/integracoes/ml/callback          → OAuth callback ML
GET    /api/lojista/integracoes/shopee/callback      → OAuth callback Shopee
POST   /api/lojista/integracoes/ml/refresh           → renovar token ML manualmente
```

**Job de renovação automática de tokens:**
Crie worker BullMQ `refreshTokensWorker` que roda a cada 6h:
- Busca todas `Integracao` onde `tokenExpiry < now() + 2h`
- Renova token na API correspondente
- Atualiza DB com novo token encriptado

---

## QUANDO TERMINAR A FASE 3

Reporte e aguarde Fase 4.

---

---

# PROMPT DE SESSÃO — FASE 4: Integrações Reais ML + Shopee

> Cole após Fase 3 completa e testada.

---

Leia o `CLAUDE.md`. Fases 1-3 completas. Implemente a **Fase 4 — Integrações Reais** com Mercado Livre e Shopee APIs.

## 4.1 — Wrapper Mercado Livre (`lib/mercadolivre.ts`)

Classe `MercadoLivreClient`:

```typescript
class MercadoLivreClient {
  constructor(private accessToken: string) {}
  
  // Publicar produto
  async publishItem(data: MLItemPayload): Promise<{ id: string; permalink: string }>
  
  // Pausar anúncio
  async pauseItem(itemId: string): Promise<void>
  
  // Reativar anúncio
  async activateItem(itemId: string): Promise<void>
  
  // Listar pedidos (polling)
  async getOrders(since: Date): Promise<MLOrder[]>
  
  // Obter pedido específico
  async getOrder(orderId: string): Promise<MLOrder>
  
  // Renovar token
  static async refreshToken(refreshToken: string): Promise<MLTokenResponse>
}
```

`MLItemPayload` deve mapear os campos do `Produto` para o formato exigido pelo ML:
- `title`, `category_id`, `price`, `currency_id: 'BRL'`, `available_quantity`
- `listing_type_id: 'gold_special'`
- `condition: 'new'`
- `pictures: [{ url }]` (URLs públicas do Supabase Storage)
- `shipping: { mode: 'me2', free_shipping: false }`

Trate `401 Unauthorized` com auto-refresh de token e retry 1x.
Trate rate limiting (429) com exponential backoff.

## 4.2 — Wrapper Shopee (`lib/shopee.ts`)

Classe `ShopeeClient`:

```typescript
class ShopeeClient {
  constructor(
    private partnerId: string,
    private partnerKey: string,
    private accessToken: string,
    private shopId: string
  ) {}
  
  // Assina request (HMAC-SHA256 obrigatório em todo endpoint)
  private sign(path: string, timestamp: number): string
  
  // Publicar produto
  async addItem(data: ShopeeItemPayload): Promise<{ item_id: number }>
  
  // Pausar produto (unlist)
  async unlistItem(itemId: number): Promise<void>
  
  // Listar pedidos
  async getOrderList(params: ShopeeOrderListParams): Promise<ShopeeOrder[]>
  
  // Detalhe pedido
  async getOrderDetail(orderSn: string): Promise<ShopeeOrderDetail>
  
  // Renovar token
  static async refreshToken(refreshToken: string, shopId: string): Promise<ShopeeTokenResponse>
}
```

## 4.3 — Publicação Real

Atualize `POST /api/lojista/publicar` para:
1. Buscar integração do lojista + decriptar token
2. Instanciar client (ML ou Shopee)
3. Fazer upload das imagens do produto para URL pública (se necessário)
4. Chamar `publishItem` / `addItem`
5. Salvar `plataformaItemId` e `url` no `Anuncio`
6. Em caso de erro da API externa: salvar `Anuncio` com status ERRO e `pausadoPor = mensagem de erro`

## 4.4 — Webhook Mercado Livre

`POST /api/webhooks/mercadolivre`:

```typescript
// Valida assinatura do webhook (header x-signature)
// Recebe: { resource: '/orders/v2/1234567', topic: 'orders_v2' }
// Extrai orderId da URL
// Busca a integração pelo userId do vendedor (user_id no webhook)
// Decripta token e busca detalhes do pedido na API ML
// Mapeia MLOrder → Pedido no banco:
//   - Encontra lojistaId via Integracao.accountId
//   - Encontra anuncioId via plataformaItemId
//   - Cria Pedido + ItemPedido em transaction
//   - Se já existe (plataformaOrderId único): ignora ou atualiza status
// Retorna 200 imediatamente (ML espera resposta rápida)
```

## 4.5 — Webhook Shopee

`POST /api/webhooks/shopee`:

```typescript
// Valida assinatura HMAC-SHA256 (header Authorization)
// Recebe eventos: ORDER_STATUS_UPDATE, etc.
// Mesma lógica de mapeamento para Pedido
// Push ID → busca detalhes via getOrderDetail
// Cria/atualiza Pedido no banco
// Retorna 200
```

## 4.6 — Cron Fallback (`/api/cron/sync-pedidos`)

Rota protegida por `Authorization: Bearer CRON_SECRET`:

```typescript
// Roda a cada 15 minutos (configurar no vercel.json ou Upstash QStash)
// Para cada Integracao ativa:
//   1. Decripta token
//   2. Busca pedidos desde último sync (salvar lastSyncAt no Redis por integraçãoId)
//   3. Para cada pedido novo: cria Pedido no DB se não existe
//   4. Atualiza lastSyncAt no Redis
// Retorna { synced: N, errors: [...] }
```

## 4.7 — Mappers

Crie `lib/mappers/ml.ts` e `lib/mappers/shopee.ts` com funções puras:

```typescript
// ml.ts
export function mlOrderToPedido(mlOrder: MLOrder, lojistaId: string, anuncioId: string): Omit<Pedido, 'id'|'createdAt'|'updatedAt'>

// shopee.ts  
export function shopeeOrderToPedido(order: ShopeeOrderDetail, lojistaId: string, anuncioId: string): Omit<Pedido, 'id'|'createdAt'|'updatedAt'>
```

## QUANDO TERMINAR A FASE 4

Reporte e aguarde Fase 5 (financeiro automatizado com Mercado Pago + emails Resend).
