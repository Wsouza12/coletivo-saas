# PROMPT DE SESSÃO — FASE 2: Painel Admin Completo

> Cole após confirmar que a Fase 1 está funcionando (login + seed + layouts).

---

Leia o `CLAUDE.md`. A Fase 1 está completa. Implemente a **Fase 2 — Admin Core** completa.

## 2.1 — Dashboard Admin (`/admin/dashboard`)

Página com métricas em tempo real via Server Component (sem fetch client):

**Row de KPIs (4 cards):**
- Total de pedidos hoje
- Pedidos aguardando fulfillment (status: NOVO + CONFIRMADO + SEPARANDO + EMBALANDO)
- Receita do mês (soma de `valorCusto` de pedidos ENVIADO + ENTREGUE)
- Lojistas ativos

**Tabela "Pedidos para fulfillment"** (últimos 10, status ≠ ENVIADO/ENTREGUE/CANCELADO):
- Colunas: #, Produto(s), Lojista, Plataforma badge, Valor custo, Status badge, Ações (→ ver detalhes)
- Badge de status com cores: NOVO=azul, CONFIRMADO=verde claro, EMBALANDO=amarelo, AGUARDANDO_COLETA=laranja

**Gráfico de pedidos dos últimos 7 dias** — use Recharts (BarChart, dados do Prisma agrupados por dia).

**Lista de lojistas aguardando aprovação** (status PENDING) com botão "Aprovar" inline.

### API Routes necessárias:
- `GET /api/admin/dashboard` → métricas agregadas (usar Prisma `groupBy` e `count`)

---

## 2.2 — CRUD de Produtos (`/admin/produtos`)

### Listagem `/admin/produtos`
- Tabela com: Imagem thumb, SKU, Nome, Categoria, Preço atacado, Estoque, Status (ativo/inativo), Ações
- Filtros: busca por nome/SKU, filtro por categoria, filtro ativo/inativo
- Paginação (25 por página, cursor-based)
- Botão "Novo Produto" → `/admin/produtos/novo`
- Inline toggle ativo/inativo

### Formulário de Produto (`/admin/produtos/novo` e `/admin/produtos/[id]`)
Campos:
- SKU (gerado automaticamente: `CATEG-RAND-XX`, editável)
- Nome, Descrição (textarea rico — use `@uiw/react-md-editor` ou textarea simples)
- Categoria (select: Eletrônicos, Casa, Moda, Esporte, Beleza, Outros)
- Subcategoria (input texto)
- Preço de Atacado (R$)
- Peso em kg, Dimensões (comprimento × largura × altura em cm)
- Estoque atual + Estoque mínimo (alerta)
- Tags (input chips)
- Atributos dinâmicos (+ Adicionar atributo → pares chave:valor)
- Upload de imagens (múltiplas, drag-and-drop, upload para Supabase Storage)
- Reordenar imagens (drag-and-drop)
- Marcar imagem principal
- Toggle: Ativo, Destaque

Validação: Zod `createProdutoSchema` / `updateProdutoSchema`.

### API Routes:
```
GET    /api/admin/produtos          → lista paginada com filtros
POST   /api/admin/produtos          → criar produto
GET    /api/admin/produtos/[id]     → detalhe
PUT    /api/admin/produtos/[id]     → atualizar
DELETE /api/admin/produtos/[id]     → soft delete (ativo=false)
POST   /api/admin/produtos/[id]/imagens  → upload imagem (multipart → Supabase Storage)
DELETE /api/admin/produtos/[id]/imagens/[imgId] → remover imagem
```

---

## 2.3 — Gestão de Lojistas (`/admin/lojistas`)

### Listagem
- Colunas: Avatar (iniciais), Nome da loja, Email, Status badge, # Anúncios, # Pedidos mês, Cadastrado em, Ações
- Filtro por status: Todos, Pendente, Ativo, Suspenso
- Botão de ação por linha: Aprovar (PENDING→ACTIVE), Suspender (ACTIVE→SUSPENDED), Reativar (SUSPENDED→ACTIVE)
- Click na linha → `/admin/lojistas/[id]`

### Detalhe do Lojista `/admin/lojistas/[id]`
Tabs:
1. **Visão Geral** — dados do lojista, data de aprovação, integrações conectadas (ML/Shopee)
2. **Anúncios** — lista de anúncios publicados (produto, plataforma, preço venda, status)
3. **Pedidos** — pedidos do lojista com status
4. **Financeiro** — faturas emitidas ao lojista

Ação: Botão "Aprovar" / "Suspender" no header.
Ao aprovar: envia email de boas-vindas ao lojista via Resend.

### API Routes:
```
GET    /api/admin/lojistas              → lista paginada com filtros
GET    /api/admin/lojistas/[id]         → detalhe completo com relações
PATCH  /api/admin/lojistas/[id]/status  → { status: 'ACTIVE' | 'SUSPENDED' }
```

---

## 2.4 — Painel de Pedidos Admin (`/admin/pedidos`)

Esta é a tela de **fulfillment** do Pablo — o mais importante do admin.

### Listagem com tabs por status:
- **Novos** (NOVO + CONFIRMADO)
- **Em processamento** (SEPARANDO + EMBALANDO + AGUARDANDO_COLETA)
- **Enviados** (ENVIADO)
- **Entregues/Cancelados**

Colunas: #Order, Plataforma badge (ML/Shopee), Produto(s), Lojista, Endereço (cidade/UF), Valor custo, Status, Data, Ações

**Ações por pedido:**
- NOVO → botão "Confirmar" (→ CONFIRMADO)
- CONFIRMADO → botão "Iniciar Separação" (→ SEPARANDO)
- SEPARANDO → botão "Iniciar Embalagem" (→ EMBALANDO)
- EMBALANDO → botão "Pronto p/ Coleta" (→ AGUARDANDO_COLETA) + campo Nota Fiscal
- AGUARDANDO_COLETA → botão "Marcar Enviado" → modal com campo de rastreio + transportadora (→ ENVIADO)

### Modal "Marcar Enviado":
- Campo Código de Rastreio
- Select transportadora: Correios, Jadlog, Total Express, Sequoia, Outro
- Botão confirmar → atualiza DB, registra `enviadoEm`, envia notificação ao lojista por email

### Detalhe do Pedido `/admin/pedidos/[id]`
- Header: #Pedido, plataforma, data
- Dados do comprador (nome, endereço de entrega completo)
- Produtos do pedido com quantidade e preço de custo
- Timeline de status (vertical, mostrando cada mudança com timestamp)
- Lojista responsável (link para `/admin/lojistas/[id]`)
- Rastreio + NF se enviado

### API Routes:
```
GET    /api/admin/pedidos              → lista com filtro status, paginação
GET    /api/admin/pedidos/[id]         → detalhe
PATCH  /api/admin/pedidos/[id]/status  → { status, rastreio?, transportadora?, notaFiscal? }
```

Ao atualizar status:
- Salva no DB com transaction
- Notifica lojista por email (Resend template por status)
- Se ENVIADO: dispara job no BullMQ para atualizar status na plataforma (ML/Shopee) após implementação da Fase 4

---

## 2.5 — Financeiro Admin (`/admin/financeiro`)

### Visão geral
- KPIs: Total a receber (faturas PENDENTE+ENVIADA), Recebido este mês, Lojistas inadimplentes (fatura VENCIDA)
- Tabela de faturas ordenadas por vencimento

### Tabela de faturas
Colunas: Nº Fatura, Lojista, Período, Qtd pedidos, Valor, Vencimento, Status badge, Ações

Ações:
- PENDENTE → "Enviar Fatura" (muda para ENVIADA, envia email ao lojista com link de pagamento Mercado Pago)
- ENVIADA → "Marcar como Paga" (manual, para casos offline)

### Botão "Gerar Faturas"
Abre modal de confirmação → gera faturas para todos os lojistas que têm pedidos ENVIADO/ENTREGUE não faturados no período selecionado.

Lógica de geração:
- Agrupa pedidos por `lojistaId` onde `faturaId IS NULL AND status IN (ENVIADO, ENTREGUE)`
- Cria uma `Fatura` por lojista com o total de `valorCusto` dos pedidos
- Associa os pedidos à fatura (`faturaId`)
- Gera número sequencial: `FAT-2024-XXXX`
- Vencimento: 7 dias a partir da geração

### API Routes:
```
GET  /api/admin/financeiro/faturas          → lista com filtros
POST /api/admin/financeiro/faturas/gerar    → gera faturas do período
PATCH /api/admin/financeiro/faturas/[id]    → { status: 'ENVIADA' | 'PAGA' }
GET  /api/admin/financeiro/resumo           → KPIs
```

---

## 2.6 — Configurações Admin (`/admin/configuracoes`)

Tabs:
1. **Perfil** — nome, email, senha (com confirmação)
2. **Plataformas** — chaves de API do ML e Shopee (exibir mascaradas, botão editar)
3. **Notificações** — toggles: "Email ao receber novo pedido", "Email ao lojista ser aprovado"
4. **Categorias** — CRUD de categorias de produtos (nome, ativa)

---

## QUANDO TERMINAR A FASE 2

Reporte:
1. Todas as rotas implementadas (lista)
2. Quaisquer dependências adicionais instaladas
3. Screenshot mental do fluxo de fulfillment (NOVO → ENVIADO)
4. Confirme que o seed popula dados suficientes para testar todas as telas

**Aguardar confirmação do Pablo para Fase 3.**
