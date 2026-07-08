# PROMPT DE SESSÃO — FASE 5: Financeiro Automatizado + Email + Deploy

> Cole após Fase 4 completa e testada com ao menos um pedido real recebido.

---

Leia o `CLAUDE.md`. Fases 1-4 completas. Implemente a **Fase 5 — Financeiro + Emails + Deploy**.

## 5.1 — Templates de Email (Resend)

Crie `lib/emails/` com componentes React Email para cada template.

**Instale:** `npm install @react-email/components react-email`

Templates necessários:

### `emails/NovoLojista.tsx`
Para: Pablo (admin)
Assunto: "Novo lojista aguardando aprovação — [Nome da Loja]"
Conteúdo: nome, email, data de cadastro, botão "Aprovar no DropSync"

### `emails/BemVindoLojista.tsx`
Para: lojista
Assunto: "Sua conta foi aprovada! Bem-vindo ao DropSync"
Conteúdo: nome da loja, CTA "Acessar plataforma", primeiros passos (conectar ML/Shopee, escolher produtos)

### `emails/PedidoRecebido.tsx`
Para: Pablo
Assunto: "Novo pedido #[ID] — [Produto] via [ML/Shopee]"
Conteúdo: dados do pedido, lojista, endereço de entrega, CTA "Ver pedido no admin"

### `emails/PedidoEnviado.tsx`
Para: lojista
Assunto: "Pedido #[ID] enviado com rastreio"
Conteúdo: rastreio, transportadora, produto(s)

### `emails/FaturaEmitida.tsx`
Para: lojista
Assunto: "Fatura #[NUM] disponível — Vencimento: [DATA]"
Conteúdo: período, qtd pedidos, valor total, botão "Pagar agora" (link Mercado Pago)

### `emails/FaturaVencendo.tsx`
Para: lojista
Assunto: "⚠️ Fatura #[NUM] vence em 2 dias"
Conteúdo: valor, CTA pagar

Crie `lib/email.ts` com função wrapper:
```typescript
export async function sendEmail(to: string, template: React.ReactElement, subject: string): Promise<void>
```

---

## 5.2 — Integração Mercado Pago (Cobrança de Faturas)

**`lib/mercadopago.ts`**:

```typescript
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN! })

// Gera link de pagamento para uma fatura
export async function createFaturaPaymentLink(fatura: Fatura & { lojista: Lojista & { user: User } }): Promise<string> {
  // Cria Preference no MP com:
  // - item: { title: `Fatura DropSync #${fatura.numero}`, unit_price: fatura.valorTotal, quantity: 1 }
  // - payer: { email: lojista.user.email, name: lojista.storeName }
  // - back_urls + auto_return: approved/failure/pending
  // - external_reference: fatura.id (para webhook identificar)
  // Retorna preference.init_point (URL de pagamento)
}

// Webhook de pagamento confirmado
export async function handleMPWebhook(paymentId: string): Promise<void> {
  // Busca payment no MP
  // Extrai external_reference (faturaId)
  // Se status=approved: atualiza Fatura para PAGA, salva mpPaymentId, pagoEm
  // Envia confirmação ao lojista
}
```

**`POST /api/admin/financeiro/faturas/[id]/enviar`**:
1. Gera link de pagamento MP
2. Salva link na fatura (adicionar campo `mpPaymentLink` no schema)
3. Envia email `FaturaEmitida` ao lojista com o link
4. Atualiza status para ENVIADA

**`POST /api/webhooks/mercadopago`**:
1. Valida `x-signature` com `MP_WEBHOOK_SECRET`
2. Chama `handleMPWebhook(paymentId)`
3. Retorna 200

---

## 5.3 — Jobs Automáticos (BullMQ)

Crie `lib/queue.ts` com as queues e workers:

```typescript
// Queues
export const emailQueue = new Queue('emails')
export const syncQueue = new Queue('sync-pedidos')
export const faturaQueue = new Queue('faturas')

// Workers
// emailWorker: processa envio de emails
// syncWorker: sync de pedidos ML/Shopee  
// faturaWorker: geração automática de faturas
```

**Worker de faturas** (`lib/workers/faturaWorker.ts`):
- Job `gerar-faturas-quinzenais`: roda nos dias 1 e 16 de cada mês (cron: `0 9 1,16 * *`)
- Lógica: mesmo do botão manual no admin
- Após gerar: envia email `FaturaEmitida` para cada lojista

**Worker de alertas de fatura** (`lib/workers/alertaVencimentoWorker.ts`):
- Roda diariamente às 9h
- Busca faturas com vencimento em 2 dias e status ≠ PAGA
- Envia email `FaturaVencendo` para cada lojista

---

## 5.4 — Schema Atualização para Fase 5

Adicione ao `prisma/schema.prisma`:

```prisma
model Fatura {
  // ... campos existentes +
  mpPaymentLink  String?   // link de pagamento MP
  mpPaymentId    String?   // ID do pagamento confirmado
}

// Log de emails enviados
model EmailLog {
  id        String   @id @default(cuid())
  to        String
  subject   String
  template  String
  status    String   // sent | failed
  error     String?
  createdAt DateTime @default(now())

  @@index([to])
  @@index([createdAt])
}
```

---

## 5.5 — Deploy Checklist

Crie `DEPLOY.md` com checklist completo:

```markdown
# Checklist de Deploy — DropSync

## Supabase
- [ ] Criar projeto no Supabase
- [ ] Executar `npx prisma db push` com DATABASE_URL do Supabase
- [ ] Executar `npx prisma db seed`
- [ ] Criar bucket `produtos` no Supabase Storage (público)
- [ ] Configurar RLS no bucket (leitura pública, escrita apenas service role)

## Upstash Redis
- [ ] Criar database no Upstash
- [ ] Copiar REST URL e REST Token

## Vercel
- [ ] Conectar repositório GitHub
- [ ] Configurar todas as variáveis de ambiente do .env.example
- [ ] Configurar vercel.json para cron jobs:
  {
    "crons": [
      { "path": "/api/cron/sync-pedidos", "schedule": "*/15 * * * *" },
      { "path": "/api/cron/alertas-vencimento", "schedule": "0 9 * * *" }
    ]
  }
- [ ] Deploy

## Mercado Livre
- [ ] Criar app em https://developers.mercadolivre.com.br
- [ ] Configurar Redirect URI = NEXT_PUBLIC_APP_URL/api/lojista/integracoes/ml/callback
- [ ] Configurar Webhook URL = NEXT_PUBLIC_APP_URL/api/webhooks/mercadolivre
- [ ] Ativar tópico orders_v2

## Shopee
- [ ] Criar app no Shopee Open Platform
- [ ] Configurar Auth Redirect URL
- [ ] Configurar Push URL = NEXT_PUBLIC_APP_URL/api/webhooks/shopee

## Mercado Pago
- [ ] Criar aplicação em https://www.mercadopago.com.br/developers
- [ ] Configurar Webhook URL = NEXT_PUBLIC_APP_URL/api/webhooks/mercadopago
- [ ] Ativar eventos: payment

## Testes pós-deploy
- [ ] Login admin funciona
- [ ] Cadastro lojista → email ao admin
- [ ] Aprovação lojista → email de boas-vindas
- [ ] OAuth ML conecta e salva token
- [ ] OAuth Shopee conecta e salva token
- [ ] Publicação de produto no ML cria item real
- [ ] Webhook ML recebe pedido de teste
- [ ] Geração de fatura funciona
- [ ] Pagamento MP funciona (modo sandbox)
```

---

## 5.6 — Página de Status do Sistema (`/admin/configuracoes` → tab Sistema)

Exibe status em tempo real:
- Webhook ML: último recebido (timestamp do Redis)
- Webhook Shopee: último recebido
- Job de sync: última execução + quantos pedidos sincronizados
- Job de faturas: última execução
- Redis: status de conexão
- DB: status de conexão (ping simples)
- Integrations: quantas ativas (ML: N, Shopee: N)

Botões de ação manual:
- "Forçar sync agora" → POST `/api/cron/sync-pedidos` com Bearer token
- "Gerar faturas agora" → mesma lógica do botão no financeiro
- "Testar email" → envia email de teste ao admin

---

## ENTREGÁVEL FINAL

Ao concluir a Fase 5, gere um `STATUS.md` na raiz do projeto:

```markdown
# DropSync — Status do Projeto

## Implementado
- [x] Auth completo (admin + lojista + middleware)
- [x] Schema completo (12 models)
- [x] Admin: dashboard, produtos, lojistas, pedidos, financeiro
- [x] Lojista: dashboard, catálogo, publicação, anúncios, pedidos, financeiro, integrações
- [x] OAuth ML + Shopee
- [x] Publicação real no ML e Shopee
- [x] Webhooks ML + Shopee
- [x] Cron fallback sync
- [x] Financeiro automatizado (faturas quinzenais)
- [x] Cobrança via Mercado Pago
- [x] Emails via Resend (6 templates)
- [x] Jobs BullMQ (email, sync, fatura, alerta)
- [x] Deploy em Vercel + Supabase + Upstash

## URLs
- Admin: /admin/dashboard
- Lojista: /dashboard
- API Docs: /api (listar rotas implementadas)

## Credenciais de teste
- Admin: [ADMIN_SEED_EMAIL]
- Lojistas: lojista1@teste.com, lojista2@teste.com, lojista3@teste.com
- Senha lojistas: Teste123!
```
