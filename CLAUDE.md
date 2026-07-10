# CLAUDE.md — Coletivo SaaS (white-label)
> Lê este arquivo inteiro antes de qualquer ação. É a lei deste repositório.

## 📍 O QUE É ESTE REPOSITÓRIO
**Coletivo SaaS** — versão **white-label, revendável** do módulo de **Compras Coletivas** (atacado
coletivo) extraído da plataforma DropyAtacado. É um **produto separado**: você (Pablo) **hospeda e
mantém** uma instância por cliente e cobra **mensalidade**, com **suporte/updates**. Cada cliente
tem a **infra dele** (Supabase, WhatsApp/Evolution, conta Mercado Pago, domínio); o **código é único**
(corrige uma vez, todos recebem no deploy).

- **Origem:** cópia do repositório `dropsync` (DropyAtacado). O `dropsync` original **NÃO é tocado**.
- **Caminho local:** `C:\Users\pablo\coletivo-saas`
- **GitHub:** https://github.com/Wsouza12/coletivo-saas
- **Dados NÃO vêm juntos:** a cópia é só código. Fornecedores/produtos/catálogos/embeddings ficam no
  banco do `dropsync` e **não** são copiados — cada instância nasce **vazia** e o cliente cadastra os
  fornecedores dele (privacidade do fornecedor + é o seu ativo).

## 🗺️ ETAPAS / ONDE ESTAMOS (resumo — detalhe em [STATUS.md](STATUS.md))
`✅ Fase 0 Extração` · `✅ Fase 1 Enxugar+White-label` · `✅ Fase 2 Painel Dev` ·
`👉 Fase 3 GitHub (push bloqueado por permissão)` · `⏳ Fase 4 Deploy Vercel` ·
`⏳ Fase 5 Infra cliente + banco` · `⏳ Fase 6 Chaves /admin/dev + testes` · `⏳ Fase 7 Vender`.

## 🎯 O QUE ESTE PRODUTO FAZ (só o coletivo)
- **Vitrine pública principal** `/` (Catálogo premium com busca e categorias) + checkout `/atacado/[slug]` (Pix direto via Mercado Pago)
- **Rodadas** de compra coletiva (reservas, meta, rateio, frete via Melhor Envio com margem de segurança configurável)
- **Assinaturas** (Venda avulsa via `/assinatura` + aplicação de desconto automático no checkout para assinantes)
- **WhatsApp (Evolution):** abrir caixa no grupo, boas-vindas por IA ao novo membro, robô/moderador,
  disparo, reserva manual (prova social)
- **Agenda de Postagem** (Produtos / Catálogos / Mensagens / **IA** que gera gatilhos com dados reais
  e agenda)
- **Cadastro de produto por IA de visão** (lê recorte da página do catálogo — Groq)
- **Mapa de Catálogos / busca visual** por foto (Jina CLIP + pgvector)
- **Catálogos (Fornecedores)** + catálogos PDF privados (Cloudflare R2) + **rastreio de origem de leads**
- **Links rastreados** `/r/[slug]`, `/r/comunidade`

## 🚫 O QUE FOI TIRADO (não é do coletivo)
Do **menu admin** (o código dessas rotas pode até existir em parte, mas foi tirado do menu e desativado): Dropi/lojista, integrações **Mercado Livre/Shopee**, **Lista de Fornecedores** (infoproduto), **Instagram/geração de conteúdo social**, **quiz/leads**, produtos do lojista, faturas do lojista, devoluções. A vitrine antiga de dropshipping foi substituída 100% pelo Catálogo de Atacado na raiz (`/`).

## 🏷️ WHITE-LABEL
- Nome da marca vem de **`NEXT_PUBLIC_APP_NAME`** (via `lib/brand.ts` → `APP_NAME`). Usado na home,
  login, register, vitrine, checkout, comunidade e `<title>`. Cada cliente põe a marca dele.
- URL pública em `NEXT_PUBLIC_APP_URL`.

## 🔑 PAINEL DO DESENVOLVEDOR (`/admin/dev`) — coração do white-label
As chaves de API de cada cliente são configuradas **pela UI** (não só `.env`):
- **Model `ConfigApp`** (Prisma): `{ chave, valor(criptografado), updatedAt }`.
- **Criptografia:** `lib/crypto.ts` (AES-256-GCM, key = `ML_ENCRYPTION_KEY`).
- **`lib/config-app.ts`:** `getConfig`, `setConfig`, `getConfigStatus`, **`hidratarEnv`**.
- **`instrumentation.ts`:** no startup do servidor injeta as chaves do banco no `process.env`
  (`hidratarEnv`). Por isso os wrappers (`groq`, `jina`, `mercadopago`, `evolution`, `storage-r2`,
  `melhor-envio`, `resend`) **não foram alterados** — só passam a enxergar as chaves do painel.
  ⚠️ Aplica no **próximo restart/redeploy** (não em tempo real).
- **`/api/admin/dev/config`** (GET status / POST salvar), só ADMIN.
- Chaves geridas pelo painel: `GROQ_API_KEY`, `JINA_API_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`,
  `EVOLUTION_API_URL/INSTANCE/API_KEY`, `R2_*`, `MELHOR_ENVIO_TOKEN`, `RESEND_API_KEY`,
  `SUPABASE_SERVICE_KEY`.
- **NÃO** geridas pelo painel (ficam no `.env` da Vercel):
  - **Bootstrap:** `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `ML_ENCRYPTION_KEY`, `CRON_SECRET`
  - **Build-time (inlinadas):** `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`
    *(⚠️ ATENÇÃO: As chaves `NEXT_PUBLIC_*` são gravadas no build da Vercel e não mudam sozinhas. Se trocar de Supabase, é preciso setar a variável na dashboard da Vercel e disparar um REDEPLOY MANUAL)*.

## 🚨 ARMADILHAS / ERROS CONHECIDOS (Troubleshooting)
1. **Supabase "Signature Verification Failed" / "Invalid Compact JWS"**: Ocorre porque a biblioteca oficial (`@supabase/supabase-js`) usada em conjunto com JWT local tem bugs lidando com o formato novo de chaves secretas do Supabase (as opacas que começam com `sb_...`). SEMPRE utilize o formato antigo (*Legacy anon, service_role API keys*) que começam com `eyJ...`.
2. **Deploy não atualiza na Vercel**: Lembre-se que o código possui DOIS remotes. O `origin` (Wsouza12) e o `vercelrepo` (do cliente). Para forçar o deploy, precisa rodar `git push vercelrepo main`. Somente dar push no origin não atualiza o site.

## 🏗️ STACK (não mudar sem perguntar)
Next.js 14 App Router + TypeScript + Tailwind + Shadcn/UI · NextAuth v5 (JWT) · Prisma + PostgreSQL
(Supabase) + **pgvector** · Mercado Pago (Pix) · Evolution API (WhatsApp, self-host Railway) · Groq
(IA) · Jina (CLIP) · Cloudflare R2 (PDFs) · Melhor Envio (frete) · Resend (e-mail) · Deploy Vercel.

## 🔒 PRIVACIDADE DO FORNECEDOR (regra absoluta)
Nada que identifique o fornecedor (nome, catálogo, página, custo `custoUnitario`, marca de origem)
pode aparecer em rota **pública** (vitrine `/atacado`, checkout, banner, `/r/*`). Restrito ao admin.

## ⚙️ SETUP POR CLIENTE
Ver **[SETUP.md](SETUP.md)** — passo a passo: GitHub → Supabase (+pgvector) → schema/admin → Vercel
(env mínimo) → Evolution/Railway → chaves no `/admin/dev` → webhooks MP/Evolution → cron → testes.

## 🧩 CONVENÇÕES
- Resposta API: `NextResponse.json({ data })` / `{ error: { code, message } }`. Zod em todo input.
- Auth: `const s = await auth(); if (s.user.role !== "ADMIN") 403`.
- Categoria de produto **sem vínculo** de grupo cai no grupo padrão **"Produtos Disponíveis"**
  (`lib/atacado.ts::resolverGrupoCategoria`) — categoria nova não precisa ser vinculada na mão.
- Ao mexer em superfície pública, conferir o `select` do Prisma pra não vazar campo do fornecedor.

> Este arquivo é a lei DESTE repo (coletivo-saas). O CLAUDE.md do `dropsync` descreve a plataforma
> completa (com Dropi/ML/Shopee/Lista) — aqui é só o coletivo white-label.
