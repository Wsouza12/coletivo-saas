# STATUS — Coletivo SaaS (white-label)

> Produto separado, revendável, extraído do `dropsync`. Você hospeda por cliente + mensalidade.
> Caminho local: `C:\Users\pablo\coletivo-saas` · GitHub: https://github.com/Wsouza12/coletivo-saas

## 🗺️ ETAPAS DO PROJETO — ONDE ESTAMOS

```
[✅] FASE 0 — Extração
     Cópia do dropsync numa pasta separada (original intocado), sem segredos. git init + commit.

[✅] FASE 1 — Enxugar + White-label
     Menu admin só do coletivo. Marca via NEXT_PUBLIC_APP_NAME (lib/brand.ts) em todas as telas.
     Home/links → /atacado. Build local passando (exit 0).

[✅] FASE 2 — Painel do Desenvolvedor
     /admin/dev com chaves criptografadas (ConfigApp + lib/config-app + instrumentation.ts).
     Wrappers intactos (env hidratado no startup). API /api/admin/dev/config.

[✅] FASE 3 — GitHub
     Repo criado (Wsouza12/coletivo-saas) e push realizado com sucesso (permissão concedida).

[✅] FASE 4 — Deploy na Vercel (você)
     Importar repo + .env mínimo (bootstrap + NEXT_PUBLIC_*). Domínio.

[✅] FASE 5 — Infra do cliente (você) + banco
     Supabase (+ create extension vector) → prisma db push + admin seed (eu rodo com o DATABASE_URL).
     Evolution/Railway (WhatsApp), conta Mercado Pago, cron-job.org.

[👉] FASE 6 — Chaves no /admin/dev + testes ponta a ponta  ← VOCÊ ESTÁ AQUI
     Colar MP/Groq/Jina/Evolution/R2/Melhor Envio/Resend → redeploy → testar vitrine, Pix, WhatsApp.

[ ] FASE 7 — Vender/hospedar por cliente
     Repetir Fases 4-6 por cliente (código único). Cobrar mensalidade.

[ ] OPCIONAIS — deletar código morto (lojista/ML/Shopee/Lista/quiz) · seed de dados de teste.
```


## ✅ FEITO
- **Cópia independente criada** a partir do `dropsync` (original intocado), sem `node_modules`/`.git`/
  `.next`/segredos. `git init` + commit inicial (447 arquivos, sem `.env`).
- **Build passando** local (`npm run build` → exit 0). Prisma client gerado.
- **Menu admin enxugado** — só coletivo: Dashboard, Compras Coletivas, Catálogo, Fornecedores, Mapa de
  Catálogos, Agenda, Origem dos Leads, Avisos, WhatsApp, Configurações, **Desenvolvedor**.
- **White-label** — marca via `NEXT_PUBLIC_APP_NAME` (`lib/brand.ts`) em todas as telas ativas
  (home/login/register/`/atacado`/checkout/comunidade/`<title>`). Links `/vitrine`→`/atacado`.
- **Painel do Desenvolvedor** (`/admin/dev`) — chaves de API criptografadas no banco (`ConfigApp` +
  `lib/config-app.ts` + `instrumentation.ts` hidrata o `process.env` no startup; wrappers intactos).
  API `/api/admin/dev/config`. Status por chave (banco/env/faltando).
- **Fix herdado:** categoria de produto sem vínculo cai no grupo "Produtos Disponíveis" por padrão.
- **[SETUP.md](SETUP.md)** — checklist completo de deploy por cliente.
- **Customizações Recentes:**
  - Renomeado *Fornecedores* para *Catálogos* com suporte a PDF privado por produto.
  - Removido todo o código relacionado a Instagram e Dropshipping antigo (ML/Shopee).
  - Adicionado campo "Margem de Segurança de Frete (%)" no painel financeiro (aplica sobre o Melhor Envio).
  - Redesign da página inicial (Catálogo) com visual premium (Hero Banner, Benefícios) substituindo a antiga "Vitrine".
  - **Novo fluxo de Assinaturas**: 
    - Desconto dinâmico configurável (ex: assinante paga 10% de taxa no checkout em vez de 15%).
    - Nova rota autônoma `/assinatura` para venda manual/divulgação por link externo (gera QR Code Pix e atualiza instantaneamente).
    - Botão "Copiar Link" incluído no painel admin em "Assinantes".
  - **PDF do Estoque Próprio (Catálogo Pronta Entrega)**: Refatorado para incluir capa com logo da marca, layout de cards otimizado (foco no preço), e exclusão automática do PDF antigo ao regerar, garantindo apenas um catálogo atualizado. Layout da grid do painel admin otimizada para os cards.

## ⚠️ ERROS MAPEADOS E RESOLVIDOS (Guia Rápido)
- **Supabase e Chaves JWT**: A lib `@supabase/supabase-js` (versões antigas ou uso direto local) frequentemente falha em decodificar JWS compacto com as novas chaves `sb_...` opacas geradas pelo Supabase ("Invalid Compact JWS" / "signature verification failed"). Use as chaves *Legacy anon, service_role API keys* (formato `eyJ...`).
- **NEXT_PUBLIC_* Variáveis**: Variáveis prefixadas com `NEXT_PUBLIC_` (como `NEXT_PUBLIC_SUPABASE_URL`) são inlinadas no build do frontend pelo Next.js. Elas **NÃO PODEM** ser sobrescritas dinamicamente pelo painel Desenvolvedor/ConfigApp no banco. Mudanças nelas exigem atualização direto na Vercel e um **redeploy completo**.
- **Duplo Push (Deploy Vercel)**: A base local possui os remotes `origin` (código base) e `vercelrepo` (conectado à Vercel do cliente). Ao empurrar atualizações para disparar deploy, lembre-se sempre de fazer `git push vercelrepo main`, caso contrário a atualização não sobe!

## ⏳ PENDENTE
1. **Deploy na Vercel** (você) — importar repo + `.env` mínimo (bootstrap + `NEXT_PUBLIC_*`).
3. **Infra do cliente** (você) — Supabase (+`create extension vector`), Evolution/Railway (número
   WhatsApp), conta Mercado Pago, domínio, cron-job.org.
4. **Chaves no `/admin/dev`** — MP, Groq, Jina, Evolution, R2, Melhor Envio, Resend → redeploy.
5. **`prisma db push` + admin seed** no banco do cliente (posso rodar quando tiver o `DATABASE_URL`).
6. **(Opcional)** deletar código morto restante (se houver resquícios).
7. **(Opcional)** seed de dados de teste (fornecedores/produtos fake) pra validar antes de vender.

## 🔁 LIMITES (o que o assistente NÃO faz)
Não cria contas, não digita chaves/senhas, não faz login/deploy em serviços externos por você
(Vercel/Supabase/MP/GitHub). Faz a parte de **código** (repo, seed, fixes) e **guia** o resto.

## 💰 CUSTO POR CLIENTE (planos free no início)
Supabase Free · Groq/Jina Free · Vercel · R2 Free · Resend Free · **Railway ~US$5/mês** (Evolution
sempre ligado — único custo fixo). Repassar na mensalidade.
