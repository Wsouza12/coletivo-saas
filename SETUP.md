# Setup por Cliente — Compras Coletivas (white-label)

Passo a passo pra subir uma instância nova pra um cliente. Cada cliente = 1 deploy
Vercel + 1 Supabase + 1 Evolution/WhatsApp + 1 conta Mercado Pago. Você hospeda e
mantém; ele usa. Tempo: ~1h na primeira vez.

---

## 0. Repositório (uma vez)
- `git init && git add -A && git commit -m "base coletivo saas"`
- Suba num repo **privado** no GitHub (ex: `coletivo-saas`)
- Cada cliente vira um **projeto Vercel** apontando pra esse mesmo repo (código único = manutenção única)

## 1. Banco — Supabase (do cliente)
- Crie um **projeto Supabase novo** pra ele
- SQL Editor → `create extension if not exists vector;` (pgvector — usado na busca visual)
- Pegue a **connection string** (Session/Pooler) → `DATABASE_URL` e `DIRECT_URL`

## 2. Migrar schema + admin
Local, apontando pro banco dele:
- `npx prisma db push`
- Depois de subir na Vercel: crie o admin (seed) com `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`
  (rota/seed de admin) — ou insira manual na tabela `User` (role ADMIN, senha bcrypt)

## 3. Vercel — variáveis MÍNIMAS (.env)
Só o **bootstrap** e as **públicas** vão aqui (o resto vai no painel /admin/dev depois):
```
DATABASE_URL=...            # Supabase do cliente
DIRECT_URL=...
NEXTAUTH_URL=https://DOMINIO_DELE
NEXTAUTH_SECRET=<gerar aleatório forte>
ML_ENCRYPTION_KEY=<64 chars hex>   # usado pra criptografar as chaves do painel
CRON_SECRET=<aleatório forte>
NEXT_PUBLIC_APP_URL=https://DOMINIO_DELE
NEXT_PUBLIC_APP_NAME=Nome Da Marca Dele
NEXT_PUBLIC_SUPABASE_URL=...        # do Supabase dele (build-time)
```
> Gerar `ML_ENCRYPTION_KEY`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## 4. Deploy na Vercel
- Importe o repo → defina as env acima → deploy
- Aponte o **domínio dele** (com `www`) pro projeto

## 5. Chaves de integração — pelo painel `/admin/dev`
Logue no admin dele → **Desenvolvedor** → cole (fica criptografado no banco):
| Serviço | Chaves | Onde pegar |
|---|---|---|
| **Groq** (IA) | `GROQ_API_KEY` | console.groq.com (grátis) |
| **Jina** (busca visual) | `JINA_API_KEY` | jina.ai (grátis ~1M tokens/mês) |
| **Mercado Pago** | `MP_ACCESS_TOKEN` (APP_USR-...), `MP_WEBHOOK_SECRET` | conta MP **do cliente** |
| **Evolution** (WhatsApp) | `EVOLUTION_API_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_API_KEY` | instância na Railway (passo 6) |
| **Cloudflare R2** (catálogos) | `R2_*` (6 chaves) | dash Cloudflare R2 (bucket dele) |
| **Supabase** (server) | `SUPABASE_SERVICE_KEY` | Supabase dele |
| **Melhor Envio** | `MELHOR_ENVIO_TOKEN` | pode reaproveitar o seu |
| **Resend** (e-mail) | `RESEND_API_KEY` | resend.com |
> Depois de salvar, **redeploy/restart** na Vercel pra aplicar (as chaves entram no ambiente no startup).

## 6. WhatsApp — Evolution API (Railway)
- Suba uma **instância Evolution** na Railway (plano pago ~US$5/mês pra ficar de pé)
- Conecte o **número de WhatsApp do cliente** (QR code)
- Configure o webhook: use o botão **"Configurar webhook"** no painel WhatsApp do admin
  (aponta pra `https://DOMINIO_DELE/api/webhooks/evolution` com `MESSAGES_UPSERT` + `GROUP_PARTICIPANTS_UPDATE`)
- No painel **WhatsApp**, vincule os grupos às categorias — pelo menos o **"Produtos Disponíveis"**
  (categorias de produto sem vínculo caem nele por padrão)

## 7. Mercado Pago (conta do cliente)
- Pegue o `MP_ACCESS_TOKEN` de **produção** (`APP_USR-...`) → painel /admin/dev
- Configure o **webhook** MP pra `https://DOMINIO_DELE/api/webhooks/mercadopago`

## 8. Cron (cron-job.org)
Crie os jobs apontando pro domínio dele, header `Authorization: Bearer <CRON_SECRET>`:
- `/api/cron/sync-pedidos` (15 min)
- `/api/cron/postagens-agendadas` (5 min) — Agenda de Postagem
- (outros conforme usar)

## 9. Conferir
- `/` (landing), `/atacado` (vitrine), login admin
- Painel Desenvolvedor: todas as chaves em **verde** (salva no painel / no .env)
- Criar um produto, abrir uma rodada, testar Pix e post no WhatsApp

---

## Manutenção / updates
- Bug ou feature nova: corrige **neste repo** → deploy → todos os clientes recebem
- Cada cliente é isolado (banco/WhatsApp/MP próprios); só o **código** é compartilhado

## Custos por cliente (planos free no começo)
- Supabase Free · Groq/Jina Free · Vercel (seu) · R2 Free · Resend Free
- **Railway ~US$5/mês** (Evolution sempre ligado) — único custo fixo relevante
- Repasse na mensalidade que você cobrar
