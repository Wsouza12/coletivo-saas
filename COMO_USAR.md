# COMO USAR — DropSync no Claude Code
# Leia isso primeiro. Leva 2 minutos.

## ESTRUTURA DOS ARQUIVOS

```
CLAUDE.md                    → Fica NA RAIZ do projeto. Nunca apagar.
PROMPT_SESSAO_FASE1.md       → Cole no Claude Code para iniciar o projeto
PROMPT_SESSAO_FASE2.md       → Cole após confirmar Fase 1 funcionando
PROMPT_SESSAO_FASE3_4.md     → Cole após confirmar Fase 2 funcionando
PROMPT_SESSAO_FASE5.md       → Cole após confirmar Fases 3+4 funcionando
```

---

## PASSO A PASSO

### 1. Crie a pasta do projeto
```powershell
mkdir dropsync
cd dropsync
```

### 2. Copie o CLAUDE.md para a raiz do projeto
```powershell
# Copie o conteúdo de CLAUDE.md para:
# C:\caminho\dropsync\CLAUDE.md
```

### 3. Abra o Claude Code na pasta
```powershell
claude
```

### 4. Cole o prompt da Fase 1
Copie TODO o conteúdo de `PROMPT_SESSAO_FASE1.md` e cole no Claude Code.
Aguarde a implementação completa.

### 5. Teste a Fase 1
```powershell
# Configure o .env.local com seus valores reais
# Execute:
npx prisma db push
npx prisma db seed
npm run dev
# Acesse: http://localhost:3000/login
# Teste com admin e com lojista
```

### 6. Quando Fase 1 estiver OK, inicie nova sessão
```powershell
# No Claude Code, nova sessão para economizar contexto:
/compact
# ou feche e abra novamente
claude
```
Cole o prompt da Fase 2.

### 7. Repita para Fases 3, 4 e 5.

---

## DICAS DE TOKEN NO CLAUDE CODE

- Use `/compact` quando a sessão estiver longa antes de implementar uma fase nova
- O CLAUDE.md é lido automaticamente pelo Claude Code em cada sessão (fica na raiz)
- Se o Claude Code "esquecer" o contexto, diga: "Releia o CLAUDE.md e continue a implementação"
- Para pedir só uma parte: "Implemente apenas o item 2.3 do PROMPT_FASE2"

---

## VARIÁVEIS DE AMBIENTE — ONDE CONSEGUIR

| Variável | Onde criar |
|----------|-----------|
| DATABASE_URL | supabase.com → Settings → Database → Connection string |
| NEXTAUTH_SECRET | `openssl rand -base64 32` no terminal |
| ML_APP_ID + ML_SECRET | developers.mercadolivre.com.br → Criar app |
| SHOPEE_PARTNER_ID + KEY | open.shopee.com → Partner account |
| UPSTASH_REDIS_* | upstash.com → Create database → REST API |
| MP_ACCESS_TOKEN | mercadopago.com.br/developers → Credenciais |
| RESEND_API_KEY | resend.com → API Keys |
| SUPABASE_SERVICE_KEY | supabase.com → Settings → API → service_role |
| ML_ENCRYPTION_KEY | `openssl rand -hex 32` |

---

## FLUXO DO NEGÓCIO (RESUMO)

```
LOJISTA                           PABLO (ADMIN)
   │                                    │
   ├─ Cadastra na plataforma            │
   │                                    ├─ Aprova cadastro
   │◄── Email boas-vindas ──────────────┤
   │                                    │
   ├─ Conecta conta ML/Shopee           │
   ├─ Escolhe produto do catálogo       │
   ├─ Define preço de venda             │
   ├─ Publica com 1 clique ────────────►│ ML/Shopee API
   │                                    │
   │  [CLIENTE FINAL COMPRA NA LOJA ML/SHOPEE DO LOJISTA]
   │                                    │
   │◄── Webhook ML/Shopee ─────────────►├─ Recebe notificação
   │                                    ├─ Vê pedido no painel
   │                                    ├─ Separa produto
   │                                    ├─ Embala
   │                                    ├─ Insere rastreio
   │◄── Email "Pedido Enviado" ─────────┤
   │                                    │
   │  [A cada 15 dias]                  │
   │◄── Fatura emitida ─────────────────┤
   ├─ Paga via Mercado Pago             │
   │                                    ├─ Recebe pagamento
```
