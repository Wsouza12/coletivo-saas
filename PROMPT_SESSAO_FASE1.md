# PROMPT DE SESSÃO — Cole isso no Claude Code para iniciar

---

Você é o engenheiro sênior responsável pelo projeto **DropSync**, uma plataforma SaaS de dropshipping B2B2C.

Leia o arquivo `CLAUDE.md` completamente antes de qualquer ação. Ele é a constituição do projeto.

## CONTEXTO DO PROJETO

**Pablo** é o fornecedor: tem estoque físico de produtos, faz o fulfillment (embala e envia). Ele é o **ADMIN** da plataforma.

**Lojistas** são os clientes do Pablo: têm lojas no Mercado Livre e/ou Shopee. Eles entram na plataforma, escolhem produtos do catálogo do Pablo, definem o preço de venda, publicam com 1 clique nas suas lojas, e quando vendem, Pablo recebe a notificação, embala e envia. O lojista deve ao Pablo o preço de atacado.

## STACK OBRIGATÓRIA

- Next.js 14 App Router + TypeScript
- Tailwind CSS + Shadcn/UI + Lucide React
- NextAuth.js v5 (JWT)
- PostgreSQL via Supabase + Prisma ORM
- BullMQ + Upstash Redis
- Mercado Livre API + Shopee Open Platform API
- Mercado Pago (cobranças)
- Resend (emails)
- Vercel (deploy)

## REGRAS ABSOLUTAS DE CODIFICAÇÃO

1. TypeScript strict em tudo — zero `any`
2. Server Components por padrão, `'use client'` só quando indispensável
3. Zod valida todos os inputs de API route antes de processar
4. Prisma transactions quando tocar mais de uma tabela
5. Tokens OAuth dos lojistas encriptados antes de salvar no DB
6. Nunca hardcodar segredos — sempre `process.env.*`
7. Error handling em TODAS as funções assíncronas
8. Comentários em português, código em inglês

## IMPLEMENTAR AGORA — FASE 1 (FUNDAÇÃO COMPLETA)

Implemente tudo abaixo em sequência, sem pausar para perguntar, a menos que encontre uma ambiguidade de negócio que não consiga resolver com o CLAUDE.md:

### 1.1 — Setup e dependências

Crie o projeto com:
```bash
npx create-next-app@latest dropsync --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd dropsync
npx shadcn@latest init --defaults
```

Instale as dependências:
```bash
npm install prisma @prisma/client next-auth@beta bcryptjs zod bullmq @upstash/redis mercadopago resend @supabase/supabase-js
npm install -D @types/bcryptjs prisma
```

### 1.2 — Prisma Schema

Crie `prisma/schema.prisma` com o schema **exatamente** como definido no CLAUDE.md. Inclua todos os models: User, Session, Lojista, Integracao, Produto, ProdutoImagem, Anuncio, Pedido, ItemPedido, Fatura e todos os enums.

### 1.3 — Variáveis de ambiente

Crie `.env.local` com todas as variáveis listadas no CLAUDE.md (com valores placeholder onde não há valor real). Crie também `.env.example` com as mesmas chaves sem valores.

### 1.4 — Lib utilitária

Crie os seguintes arquivos em `lib/`:

**`lib/prisma.ts`** — singleton do Prisma Client com connection pooling.

**`lib/auth.ts`** — configuração NextAuth v5 com:
- Credentials provider (email + senha)
- JWT com role e id do usuário no token
- Callbacks para enriquecer a session com `role`, `status`, `lojistaId`
- Verify: busca user no DB, verifica bcrypt, verifica status ACTIVE (ou ADMIN)

**`lib/redis.ts`** — singleton do cliente Upstash Redis.

**`lib/crypto.ts`** — funções `encrypt(text: string): string` e `decrypt(text: string): string` usando AES-256-GCM com `ML_ENCRYPTION_KEY` para tokens OAuth.

**`lib/validations.ts`** — schemas Zod para as entidades principais:
- `createProdutoSchema`
- `updateProdutoSchema`
- `publishAnuncioSchema` (produtoId, plataforma, precoVenda, titulo)
- `updatePedidoStatusSchema`
- `registerLojistaSchema`

### 1.5 — Middleware de rotas

Crie `middleware.ts` na raiz com:
- `/admin/*` → redireciona para `/login` se não for ADMIN
- `/dashboard`, `/catalogo`, `/meus-anuncios`, `/pedidos`, `/financeiro`, `/integracoes` → redireciona para `/login` se não for LOJISTA ACTIVE
- Lojista com status PENDING → redireciona para `/aguardando-aprovacao`
- Rotas públicas: `/`, `/login`, `/register`, `/api/auth/*`, `/api/webhooks/*`

### 1.6 — Seed completo

Crie `prisma/seed.ts` que cria:

**1 Admin:**
- email: `process.env.ADMIN_SEED_EMAIL`
- senha: `process.env.ADMIN_SEED_PASSWORD` (bcrypt hash)
- role: ADMIN, status: ACTIVE

**3 Lojistas (status ACTIVE para testes):**
```
lojista1@teste.com / senha: Teste123! / storeName: "Loja Alpha Tech"
lojista2@teste.com / senha: Teste123! / storeName: "Click Store"
lojista3@teste.com / senha: Teste123! / storeName: "Speed Shop"
```

**6 Produtos no catálogo:**
```
SKU: FONE-BT-01 | Fone Bluetooth 5.0 | Eletrônicos | R$89,00 | estoque: 150
SKU: CABO-UC-2M | Cabo USB-C 2 metros | Eletrônicos | R$14,90 | estoque: 500
SKU: CARR-65W-01 | Carregador Turbo 65W | Eletrônicos | R$44,90 | estoque: 80
SKU: MOUSE-WL-01 | Mouse Sem Fio 2.4GHz | Eletrônicos | R$64,90 | estoque: 120
SKU: LUMIN-LED-01 | Luminária LED USB | Casa | R$37,90 | estoque: 200
SKU: CAPAS-UN-01 | Capa Celular Universal | Acessórios | R$11,90 | estoque: 800
```

Cada produto deve ter pelo menos 1 entrada em `ProdutoImagem` com uma URL placeholder do Supabase Storage.

### 1.7 — Layout do Admin

Crie `app/(admin)/layout.tsx` com:
- Sidebar fixa à esquerda (240px) com logo "DropSync Admin"
- Itens de navegação com ícones Lucide: Dashboard, Produtos, Lojistas, Pedidos, Financeiro, Configurações
- Item ativo destacado em `#1D9E75`
- Topbar com nome do admin logado + botão logout
- Em mobile: sidebar vira drawer (Sheet do Shadcn)
- Background do conteúdo: `#F8FAFC`

### 1.8 — Layout do Lojista

Crie `app/(lojista)/layout.tsx` com:
- Sidebar fixa à esquerda (240px) com logo "DropSync" + nome da loja do lojista
- Itens: Dashboard, Catálogo, Meus Anúncios, Pedidos, Financeiro, Integrações
- Badges de notificação: "Pedidos" mostra count de pedidos NOVO
- Item ativo em `#1D9E75`
- Topbar com nome do lojista + indicadores de integração (ícone ML e Shopee coloridos se conectados, cinza se não)
- Botão logout

### 1.9 — Páginas de Auth

**`app/(auth)/login/page.tsx`** — formulário com:
- Email + senha
- Botão "Entrar" com loading state
- Link "Criar conta"
- Redirect: ADMIN → `/admin/dashboard`, LOJISTA ACTIVE → `/dashboard`, LOJISTA PENDING → `/aguardando-aprovacao`
- Tratamento de erro "Credenciais inválidas"

**`app/(auth)/register/page.tsx`** — formulário com:
- Nome completo, email, senha, confirmação de senha, nome da loja, telefone (opcional)
- Validação Zod no client e server
- Após cadastro: redireciona para `/aguardando-aprovacao`
- Chama `POST /api/auth/register` (criar essa API route)

**`app/(auth)/aguardando-aprovacao/page.tsx`** — página estática informando que o cadastro está em análise.

### 1.10 — API Route de Registro

Crie `app/api/auth/register/route.ts`:
- Valida com `registerLojistaSchema`
- Verifica se email já existe
- Cria `User` (role: LOJISTA, status: PENDING) + `Lojista` em transaction
- Hash da senha com bcrypt salt 12
- Retorna `{ message: 'Cadastro realizado. Aguarde aprovação.' }`
- Envia email ao admin via Resend notificando novo cadastro

### 1.11 — Migration e seed

Ao final, rode:
```bash
npx prisma db push
npx prisma db seed
```

E confirme que o seed rodou sem erros.

---

## QUANDO TERMINAR A FASE 1

Reporte:
1. Lista de arquivos criados
2. Qualquer decisão técnica que tomou (e por quê)
3. O que está pronto para testar (rota de teste: `/login` com as credenciais do seed)
4. Próximos passos (Fase 2)

**Não implemente a Fase 2 sem confirmação do Pablo.**

---

## CONTEXTO ADICIONAL SOBRE O PABLO

- Stack já conhecida: Next.js 14, TypeScript, Tailwind, Framer Motion, JWT, Mercado Pago, Stripe, Vercel
- Prefere código completo e funcional — não esboços
- Prefere comentários inline ao invés de explicações longas
- Está no Windows usando Claude Code no terminal PowerShell
- Mercado-alvo: Brasil (usar pt-BR em labels, moeda BRL, formatos de data dd/mm/yyyy)

---

*Leia o CLAUDE.md, confirme que leu, e comece pela Fase 1 sem mais perguntas.*
