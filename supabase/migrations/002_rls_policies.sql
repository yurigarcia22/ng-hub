-- NG Hub — Migration 002: RLS Policies
-- Data: 2026-04-14

-- Habilitar RLS em todas as tabelas
ALTER TABLE ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_sets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads          ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs    ENABLE ROW LEVEL SECURITY;

-- Leitura: somente usuários autenticados
CREATE POLICY "Authenticated read ad_accounts"
  ON ad_accounts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read campaigns"
  ON campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read ad_sets"
  ON ad_sets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read ads"
  ON ads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read metrics"
  ON metrics FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read sync_logs"
  ON sync_logs FOR SELECT TO authenticated USING (true);

-- Escrita: somente via service_role (API Routes no servidor)
-- O service_role bypassa RLS automaticamente no Supabase
