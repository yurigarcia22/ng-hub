-- NG Hub — Migration 004: BM columns + account_settings
-- Data: 2026-04-15

-- Adiciona colunas de Business Manager em ad_accounts
ALTER TABLE ad_accounts
  ADD COLUMN IF NOT EXISTS business_id   TEXT,
  ADD COLUMN IF NOT EXISTS business_name TEXT;

-- Tabela de configurações de visibilidade por usuário
CREATE TABLE IF NOT EXISTS account_settings (
  user_id    UUID NOT NULL,
  account_id TEXT NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  visible    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, account_id)
);

-- RLS para account_settings: cada usuário só vê/edita seus próprios
ALTER TABLE account_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own account_settings"
  ON account_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
