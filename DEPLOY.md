# Checklist de Deploy — DropSync

## Supabase

- [ ] Criar projeto no Supabase
- [ ] Copiar `DATABASE_URL` (Settings → Database → Connection string, modo "Transaction pooler" para serverless)
- [ ] Executar `npx prisma db push` com o `DATABASE_URL` de produção
- [ ] Executar `npx prisma db seed` (cria admin via `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD`)
- [ ] Criar bucket `produtos` no Supabase Storage (público)
- [ ] Criar bucket `etapas-pedidos` no Supabase Storage (privado — fotos de prova de envio)
- [ ] Configurar RLS: bucket `produtos` com leitura pública e escrita restrita à service role; bucket `etapas-pedidos` sem acesso público

## Upstash Redis

- [ ] Criar database no Upstash
- [ ] Copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`

## Vercel

- [ ] Conectar repositório GitHub
- [ ] Configurar todas as variáveis de ambiente de `.env.example`
- [ ] `vercel.json` na raiz já define os crons (sync-pedidos, refresh-tokens, gerar-faturas, alertas-vencimento)
  - **Atenção:** no plano Hobby da Vercel, crons só podem ser agendados com frequência **diária** (não suporta `*/15 * * * *`). Em produção sem plano Pro, ajuste `sync-pedidos` para `0 * * * *` (a cada hora) ou substitua por Upstash QStash, que não tem essa limitação.
- [ ] Deploy

## Mercado Livre

- [ ] Criar app em https://developers.mercadolivre.com.br
- [ ] Configurar Redirect URI = `NEXT_PUBLIC_APP_URL/api/lojista/integracoes/ml/callback`
- [ ] Configurar Webhook URL = `NEXT_PUBLIC_APP_URL/api/webhooks/mercadolivre`
- [ ] Ativar tópico `orders_v2`

## Shopee

- [ ] Criar app no Shopee Open Platform
- [ ] Configurar Auth Redirect URL = `NEXT_PUBLIC_APP_URL/api/lojista/integracoes/shopee/callback`
- [ ] Configurar Push URL = `NEXT_PUBLIC_APP_URL/api/webhooks/shopee`

## Mercado Pago

- [ ] Criar aplicação em https://www.mercadopago.com.br/developers
- [ ] Copiar `MP_ACCESS_TOKEN`
- [ ] Configurar Webhook URL = `NEXT_PUBLIC_APP_URL/api/webhooks/mercadopago`
- [ ] Ativar evento `payment`
- [ ] Copiar a assinatura secreta do webhook para `MP_WEBHOOK_SECRET`

## Resend (email)

- [ ] Criar conta e copiar `RESEND_API_KEY`
- [ ] Verificar domínio de envio (ou usar `onboarding@resend.dev` em modo de teste)

## Evolution API (WhatsApp — opcional)

- [ ] Configurar instância e copiar `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_API_KEY`

## Testes pós-deploy

- [ ] Login admin funciona
- [ ] Cadastro de lojista → email ao admin
- [ ] Aprovação de lojista → email de boas-vindas
- [ ] OAuth ML conecta e salva token
- [ ] OAuth Shopee conecta e salva token
- [ ] Publicação de produto no ML cria item real
- [ ] Webhook ML recebe pedido de teste (ver /admin/configuracoes → Sistema)
- [ ] Webhook Shopee recebe pedido de teste
- [ ] "Gerar faturas agora" (em Sistema) gera e envia fatura com link MP
- [ ] Pagamento via link MP confirma e marca fatura como PAGA (testar em modo sandbox do MP)
- [ ] Alerta de vencimento dispara para fatura a 2 dias do prazo
