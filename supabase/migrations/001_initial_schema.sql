-- NG Hub — Migration 001: Schema inicial
-- Data: 2026-04-14

-- Contas de anúncio vinculadas à BM
CREATE TABLE IF NOT EXISTS ad_accounts (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'BRL',
  timezone     TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  status       TEXT NOT NULL DEFAULT 'ACTIVE',
  synced_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Campanhas
CREATE TABLE IF NOT EXISTS campaigns (
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'ACTIVE',
  objective    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Conjuntos de anúncios
CREATE TABLE IF NOT EXISTS ad_sets (
  id           TEXT PRIMARY KEY,
  campaign_id  TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'ACTIVE',
  daily_budget BIGINT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Anúncios individuais
CREATE TABLE IF NOT EXISTS ads (
  id           TEXT PRIMARY KEY,
  ad_set_id    TEXT NOT NULL REFERENCES ad_sets(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'ACTIVE',
  creative_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Métricas diárias (série temporal)
CREATE TABLE IF NOT EXISTS metrics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id    TEXT NOT NULL,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('campaign', 'ad_set', 'ad')),
  date         DATE NOT NULL,
  spend        NUMERIC(10,2) DEFAULT 0,
  impressions  INTEGER DEFAULT 0,
  clicks       INTEGER DEFAULT 0,
  reach        INTEGER DEFAULT 0,
  ctr          NUMERIC(6,4) DEFAULT 0,
  cpm          NUMERIC(10,2) DEFAULT 0,
  cpa          NUMERIC(10,2) DEFAULT 0,
  roas         NUMERIC(8,4) DEFAULT 0,
  UNIQUE(entity_id, entity_type, date)
);

-- Log de sincronizações
CREATE TABLE IF NOT EXISTS sync_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at       TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'running'
                    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  accounts_synced   INTEGER DEFAULT 0,
  records_upserted  INTEGER DEFAULT 0,
  error_message     TEXT,
  triggered_by      TEXT NOT NULL DEFAULT 'cron'
                    CHECK (triggered_by IN ('cron', 'manual'))
);
