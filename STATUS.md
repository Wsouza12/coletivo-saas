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
     Repo criado (Wsouza12/coletivo-saas) e pushs realizados com sucesso.

[✅] FASE 4 — Deploy na Vercel (você)
     Projeto importado + .env configurado + deploy no ar.

[✅] FASE 5 — Infra do cliente (você) + banco
     Supabase ativo, Evolution/Railway (WhatsApp) online, cron-job.org configurado.

[✅] FASE 6 — Chaves no /admin/dev + testes ponta a ponta
     Integrações MP, IA, R2, Cron, Resend testadas e validadas em produção.

[👉] FASE 7 — Operação e Vendas  ← VOCÊ ESTÁ AQUI
     Sistema 100% pronto. Monitorar primeiros usos reais. Vender novas instâncias.

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
  - **Cadastro de Estoque Próprio Refatorado**: Regras rígidas (Preço de Custo, Preço de Venda, Pesos e Medidas obrigatórios). Geração de SKU automático de 5 dígitos (ex: RF-123). Auto-categorização por IA. A Prova Social de Vendas agora é opcional.
  - **Impressão de Documentos (Caixas Fechadas)**: Refatoração completa da impressão. Geração inteligente: Ficha de Separação em folha A4 cheia, e Etiquetas + Declaração de Conteúdo dimensionadas para A5 Paisagem, de forma que o Chrome empilha duas unidades perfeitas em uma folha A4 (economizando papel). Botão "🖨️ Imprimir" movido direto para o card principal.
  - **Automatização (Cron Jobs)**: Painel de Desenvolvedor atualizado com instruções e URLs prontas para configurar no Cron-Job.org (bypassando limite do plano free da Vercel). Loop de mensagens do atacado e Postagens Agendadas 100% ativos via requisições externas com autenticação `CRON_SECRET`.
  - **Melhorias no Webhook do WhatsApp (Bot)**: 
    - Busca de código 100% tolerante a erros de digitação (ignora hífens, espaços, pontos e corrige confusão entre 'I' maiúsculo e 'L' minúsculo via SQL puro).
    - O bot agora responde a administradores interagindo do seu número pessoal, removendo o loop infinito (ignora apenas a si mesmo).
    - Remoção de dupla marcação (@) para mensagens mais limpas em modo *reply*.
    - Tratamento de solicitações duplicadas: alerta quando a caixa do produto já se encontra pendente de aprovação.
    - Produtos podem ser solicitados pelo código mesmo que estejam ocultos na vitrine pública.
  - **Admin**: Máscaras automáticas de CPF/CNPJ e Telefone aplicadas nos modais de detalhes de compradores de caixas.

## ⚠️ ERROS MAPEADOS E RESOLVIDOS (Guia Rápido)
- **Supabase e Chaves JWT**: A lib `@supabase/supabase-js` (versões antigas ou uso direto local) frequentemente falha em decodificar JWS compacto com as novas chaves `sb_...` opacas geradas pelo Supabase ("Invalid Compact JWS" / "signature verification failed"). Use as chaves *Legacy anon, service_role API keys* (formato `eyJ...`).
- **NEXT_PUBLIC_* Variáveis**: Variáveis prefixadas com `NEXT_PUBLIC_` (como `NEXT_PUBLIC_SUPABASE_URL`) são inlinadas no build do frontend pelo Next.js. Elas **NÃO PODEM** ser sobrescritas dinamicamente pelo painel Desenvolvedor/ConfigApp no banco. Mudanças nelas exigem atualização direto na Vercel e um **redeploy completo**.
- **Duplo Push (Deploy Vercel)**: A base local possui os remotes `origin` (código base) e `vercelrepo` (conectado à Vercel do cliente). Ao empurrar atualizações para disparar deploy, lembre-se sempre de fazer `git push vercelrepo main`, caso contrário a atualização não sobe!

## ⏳ PENDENTE
1. **(Opcional)** deletar código morto restante (se houver resquícios).
2. **(Opcional)** seed de dados de teste (fornecedores/produtos fake) pra validar antes de vender para novos clientes.

## 🔁 LIMITES (o que o assistente NÃO faz)
Não cria contas, não digita chaves/senhas, não faz login/deploy em serviços externos por você
(Vercel/Supabase/MP/GitHub). Faz a parte de **código** (repo, seed, fixes) e **guia** o resto.

## 💰 CUSTO POR CLIENTE (planos free no início)
Supabase Free · Groq/Jina Free · Vercel · R2 Free · Resend Free · **Railway ~US$5/mês** (Evolution
sempre ligado — único custo fixo). Repassar na mensalidade.
