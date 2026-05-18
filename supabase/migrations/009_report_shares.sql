-- Tabela para links compartilháveis de relatórios
-- Slug curto (8 chars) gerado aleatoriamente, mapeia para account + período
CREATE TABLE IF NOT EXISTS report_shares (
  slug TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  since DATE NOT NULL,
  until DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_report_shares_account ON report_shares(account_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_created ON report_shares(created_at DESC);
