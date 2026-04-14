# NG Hub — Architecture Document

**Versão:** 1.0.0
**Data:** 2026-04-14
**Autor:** Aria (Architect)
**Base:** docs/prd.md v1.0.0

---

## 1. Visão Geral do Sistema

O NG Hub é uma aplicação web full-stack que agrega métricas de campanhas Meta Ads em um painel unificado. Os dados são sincronizados periodicamente da Meta Ads API e armazenados em cache no Supabase — o frontend sempre lê do banco local, nunca diretamente da API de terceiros.

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│              Next.js App (React + RSC)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────────┐
│                     VERCEL (Edge/Serverless)                 │
│                   Next.js API Routes                         │
│          /api/sync   /api/meta/*   /api/auth/*               │
└──────────┬──────────────────────────┬────────────────────────┘
           │                          │
┌──────────▼──────────┐   ┌───────────▼────────────────────────┐
│     SUPABASE         │   │         META ADS API               │
│  PostgreSQL + Auth   │   │   Graph API v21.0                  │
│  RLS + Edge Fn       │   │   (somente via servidor)           │
└─────────────────────┘   └────────────────────────────────────┘
```

**Princípio central:** A Meta Ads API nunca é chamada diretamente pelo browser — sempre via API Route no servidor, onde as credenciais ficam protegidas.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão | Justificativa |
|--------|-----------|--------|---------------|
| Framework | Next.js (App Router) | 14.x | SSR nativo, API Routes, deploy trivial na Vercel |
| Linguagem | TypeScript | 5.x | Type safety end-to-end |
| Estilização | Tailwind CSS | 3.x | Utilitário, sem overhead de CSS-in-JS |
| Componentes UI | shadcn/ui | latest | Headless, acessível, customizável |
| Gráficos | Recharts | 2.x | Leve, responsivo, integra bem com React |
| Auth | Supabase Auth | - | JWT gerenciado, sessão persistente |
| Banco de dados | Supabase (PostgreSQL) | - | Cache de métricas + auth unificados |
| ORM / Query | Supabase JS Client | 2.x | Tipado, direto, sem overhead de ORM |
| Cron Job | Vercel Cron | - | Nativo na Vercel, zero configuração extra |
| Deploy | Vercel | - | CI/CD automático, Edge Network |
| Meta API | Facebook Business SDK | v21.0 | SDK oficial com tipagem |

---

## 3. Estrutura de Pastas

```
ng-hub/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Route group — sem layout do dashboard
│   │   │   └── login/
│   │   │       └── page.tsx          # Tela de login
│   │   ├── (dashboard)/              # Route group — com layout do dashboard
│   │   │   ├── layout.tsx            # Layout: sidebar + header + auth guard
│   │   │   ├── page.tsx              # Dashboard principal (lista campanhas)
│   │   │   └── campaigns/
│   │   │       └── [campaignId]/
│   │   │           ├── page.tsx      # Detalhe campanha + conjuntos
│   │   │           └── ad-sets/
│   │   │               └── [adSetId]/
│   │   │                   └── page.tsx  # Detalhe conjunto + anúncios
│   │   └── api/
│   │       ├── sync/
│   │       │   └── route.ts          # POST /api/sync — dispara sincronização
│   │       ├── meta/
│   │       │   └── test/
│   │       │       └── route.ts      # GET /api/meta/test — valida credenciais
│   │       └── cron/
│   │           └── daily-sync/
│   │               └── route.ts      # GET /api/cron/daily-sync — Vercel Cron
│   ├── components/
│   │   ├── ui/                       # shadcn/ui base components
│   │   ├── dashboard/
│   │   │   ├── CampaignCard.tsx      # Card de campanha com métricas
│   │   │   ├── MetricsBadge.tsx      # Badge de status (ativo/pausado)
│   │   │   ├── SyncButton.tsx        # Botão "Atualizar Agora" + estado
│   │   │   ├── LastSyncInfo.tsx      # Data/hora da última sync
│   │   │   └── FiltersBar.tsx        # Filtros conta + período
│   │   └── campaigns/
│   │       ├── PerformanceChart.tsx  # Gráfico Recharts de evolução
│   │       ├── AdSetCard.tsx         # Card de conjunto de anúncios
│   │       └── AdCard.tsx            # Card de anúncio individual
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Supabase browser client
│   │   │   ├── server.ts             # Supabase server client (cookies)
│   │   │   └── queries.ts            # Queries reutilizáveis (campanhas, métricas)
│   │   ├── meta/
│   │   │   ├── client.ts             # Meta API client (server-side only)
│   │   │   ├── sync.ts               # Lógica de sincronização
│   │   │   └── transformers.ts       # Transforma resposta Meta → schema interno
│   │   └── providers/
│   │       ├── base.ts               # Interface AdProvider (extensível)
│   │       ├── meta.ts               # MetaProvider implements AdProvider
│   │       └── index.ts              # Registry de providers
│   └── types/
│       ├── database.ts               # Tipos gerados do Supabase (via CLI)
│       ├── meta.ts                   # Tipos da Meta Ads API
│       └── dashboard.ts              # Tipos da camada de apresentação
├── supabase/
│   └── migrations/                   # SQL migrations versionadas
│       ├── 001_initial_schema.sql
│       ├── 002_rls_policies.sql
│       └── 003_indexes.sql
├── docs/
│   ├── prd.md
│   └── architecture.md               # Este documento
├── .env.local.example                # Template de variáveis de ambiente
├── vercel.json                       # Config Vercel Cron
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. Schema do Banco de Dados (Supabase)

### Tabelas

```sql
-- Contas de anúncio vinculadas à BM
CREATE TABLE ad_accounts (
  id           TEXT PRIMARY KEY,       -- Meta account_id (ex: "act_123456")
  name         TEXT NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'BRL',
  timezone     TEXT NOT NULL,
  status       TEXT NOT NULL,          -- ACTIVE | DISABLED
  synced_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Campanhas
CREATE TABLE campaigns (
  id           TEXT PRIMARY KEY,       -- Meta campaign_id
  account_id   TEXT NOT NULL REFERENCES ad_accounts(id),
  name         TEXT NOT NULL,
  status       TEXT NOT NULL,          -- ACTIVE | PAUSED | DELETED | ARCHIVED
  objective    TEXT,                   -- CONVERSIONS | TRAFFIC | AWARENESS etc.
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Conjuntos de anúncios
CREATE TABLE ad_sets (
  id           TEXT PRIMARY KEY,       -- Meta adset_id
  campaign_id  TEXT NOT NULL REFERENCES campaigns(id),
  name         TEXT NOT NULL,
  status       TEXT NOT NULL,
  daily_budget BIGINT,                 -- em centavos
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Anúncios individuais
CREATE TABLE ads (
  id           TEXT PRIMARY KEY,       -- Meta ad_id
  ad_set_id    TEXT NOT NULL REFERENCES ad_sets(id),
  name         TEXT NOT NULL,
  status       TEXT NOT NULL,
  creative_url TEXT,                   -- URL da thumbnail/imagem do criativo
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Métricas diárias (série temporal)
CREATE TABLE metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id    TEXT NOT NULL,          -- campaign_id | adset_id | ad_id
  entity_type  TEXT NOT NULL,          -- 'campaign' | 'ad_set' | 'ad'
  date         DATE NOT NULL,
  spend        NUMERIC(10,2) DEFAULT 0,
  impressions  INTEGER DEFAULT 0,
  clicks       INTEGER DEFAULT 0,
  reach        INTEGER DEFAULT 0,
  ctr          NUMERIC(6,4) DEFAULT 0, -- percentual (ex: 1.2345)
  cpm          NUMERIC(10,2) DEFAULT 0,
  cpa          NUMERIC(10,2) DEFAULT 0,
  roas         NUMERIC(8,4) DEFAULT 0,
  UNIQUE(entity_id, entity_type, date)
);

-- Log de sincronizações
CREATE TABLE sync_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running', -- running | success | partial | failed
  accounts_synced INTEGER DEFAULT 0,
  records_upserted INTEGER DEFAULT 0,
  error_message   TEXT,
  triggered_by    TEXT NOT NULL DEFAULT 'cron'     -- 'cron' | 'manual'
);
```

### Indexes Críticos

```sql
-- Métricas: consultas por entidade + período (query mais frequente do dashboard)
CREATE INDEX idx_metrics_entity_date ON metrics(entity_id, entity_type, date DESC);

-- Campanhas por conta (filtro principal do dashboard)
CREATE INDEX idx_campaigns_account ON campaigns(account_id, status);

-- Conjuntos por campanha
CREATE INDEX idx_ad_sets_campaign ON ad_sets(campaign_id, status);

-- Anúncios por conjunto
CREATE INDEX idx_ads_ad_set ON ads(ad_set_id, status);

-- Último sync (consultado a cada carregamento do dashboard)
CREATE INDEX idx_sync_logs_started ON sync_logs(started_at DESC);
```

### RLS (Row Level Security)

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_sets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs    ENABLE ROW LEVEL SECURITY;

-- Apenas usuários autenticados podem ler (produto interno, usuário único)
CREATE POLICY "Authenticated users can read all"
  ON ad_accounts FOR SELECT
  TO authenticated
  USING (true);

-- Aplicar padrão similar para todas as demais tabelas
-- Escrita somente via service_role (API Routes no servidor)
```

---

## 5. Sistema de Providers (Extensível para Google Ads)

A camada de integração usa o padrão **Strategy/Provider** — cada plataforma de ads implementa a mesma interface:

```typescript
// src/lib/providers/base.ts
export interface AdProvider {
  name: string;
  getAccounts(): Promise<AdAccount[]>;
  getCampaigns(accountId: string): Promise<Campaign[]>;
  getAdSets(campaignId: string): Promise<AdSet[]>;
  getAds(adSetId: string): Promise<Ad[]>;
  getMetrics(entityId: string, entityType: EntityType, dateRange: DateRange): Promise<Metrics[]>;
}

// src/lib/providers/meta.ts
export class MetaProvider implements AdProvider {
  name = 'meta';
  // implementação usando Facebook Business SDK
}

// FUTURO: src/lib/providers/google.ts
// export class GoogleProvider implements AdProvider { ... }

// src/lib/providers/index.ts
export const providers: Record<string, AdProvider> = {
  meta: new MetaProvider(),
  // google: new GoogleProvider(),  ← adicionar sem tocar no resto
};
```

O sync engine itera sobre `providers` — adicionar Google Ads é incluir uma linha no registry e implementar a interface.

---

## 6. Fluxo de Sincronização

```
Vercel Cron (00:00 BRT)
        │
        ▼
GET /api/cron/daily-sync
        │  valida CRON_SECRET header
        ▼
POST /api/sync (lógica central)
        │
        ├── Cria sync_log (status: running)
        │
        ├── Para cada provider em providers{}:
        │     ├── getAccounts()
        │     └── Para cada account:
        │           ├── getCampaigns()
        │           ├── getAdSets() por campanha
        │           ├── getAds() por adset
        │           └── getMetrics() (últimos 30 dias)
        │
        ├── Upsert tudo no Supabase
        │   (INSERT ... ON CONFLICT DO UPDATE)
        │
        └── Atualiza sync_log (status: success | partial | failed)
```

**Rate limit Meta API:**
- Delay de 500ms entre chamadas de contas diferentes
- Batch de métricas em uma única chamada por entidade (não múltiplos requests)
- Se erro 17 (rate limit), retry com exponential backoff (1s → 2s → 4s, max 3x)

---

## 7. Autenticação e Segurança

### Fluxo de Auth

```
Browser → POST /api/auth/login (Supabase Auth)
       ← JWT (httpOnly cookie via @supabase/ssr)
       
Browser → GET /dashboard (protected route)
       → middleware.ts verifica JWT
       → Se inválido: redirect para /login
```

### Variáveis de Ambiente

```bash
# .env.local.example

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...          # Segura: somente leitura com RLS
SUPABASE_SERVICE_ROLE_KEY=eyJ...              # NUNCA exposta ao cliente

# Meta Ads API
META_APP_ID=123456789
META_APP_SECRET=abc123...                     # NUNCA exposta ao cliente
META_SYSTEM_USER_TOKEN=EAA...                 # NUNCA exposta ao cliente
META_API_VERSION=v21.0

# Vercel Cron
CRON_SECRET=um-segredo-longo-aleatorio       # Valida chamadas do cron

# App
NEXT_PUBLIC_APP_URL=https://ng-hub.vercel.app
```

**Regra de ouro:** Variáveis sem prefixo `NEXT_PUBLIC_` nunca chegam ao browser.

---

## 8. Configuração do Vercel Cron

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-sync",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Executa às **06:00 UTC (03:00 BRT)** — após Meta finalizar os dados do dia anterior.

---

## 9. Estratégia de Cache e Performance

| Situação | Estratégia |
|----------|-----------|
| Dashboard principal | Lê do Supabase (cache local) — sem chamada à Meta |
| Drill-down campanha | Lê do Supabase — instantâneo |
| "Atualizar Agora" | Dispara `/api/sync` → Supabase atualizado → UI re-fetch |
| Gráficos históricos | Query `metrics` por `entity_id + date range` com index |
| Dados da sessão | Supabase Auth JWT em cookie httpOnly (sem localStorage) |

**Next.js Cache:** Pages do dashboard usam `revalidate = 0` (sem cache estático) — dados sempre frescos do Supabase.

---

## 10. Decisões Arquiteturais

| Decisão | Escolha | Alternativa Rejeitada | Motivo |
|---------|---------|----------------------|--------|
| Cron engine | Vercel Cron | Supabase pg_cron | Simples, sem infra extra, integrado ao deploy |
| ORM | Supabase JS Client | Prisma / Drizzle | Menos abstração, tipos gerados automaticamente |
| Gráficos | Recharts | Chart.js / Victory | Menor bundle, melhor integração React |
| UI Base | shadcn/ui | Chakra / MUI | Sem runtime de CSS-in-JS, copy-paste, sem dependência |
| Sync trigger | API Route | Supabase Edge Function | Mais simples de debugar e deployar junto com o app |

---

## 11. Próximos Passos

| Etapa | Responsável | Input |
|-------|-------------|-------|
| Implementar Epic 1 (Foundation & Auth) | `@dev` | Este documento + PRD |
| Criar migrations SQL | `@data-engineer` | Schema seção 4 deste doc |
| Criar stories detalhadas do Epic 1 | `@sm` | PRD + este documento |
