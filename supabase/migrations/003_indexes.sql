-- NG Hub — Migration 003: Indexes de performance
-- Data: 2026-04-14

-- Métricas: query mais frequente do dashboard
CREATE INDEX idx_metrics_entity_date
  ON metrics(entity_id, entity_type, date DESC);

-- Campanhas por conta (filtro principal)
CREATE INDEX idx_campaigns_account
  ON campaigns(account_id, status);

-- Conjuntos por campanha
CREATE INDEX idx_ad_sets_campaign
  ON ad_sets(campaign_id, status);

-- Anúncios por conjunto
CREATE INDEX idx_ads_ad_set
  ON ads(ad_set_id, status);

-- Último sync (consultado a cada carregamento do dashboard)
CREATE INDEX idx_sync_logs_started
  ON sync_logs(started_at DESC);
