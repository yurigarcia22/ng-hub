-- Migration 007: effective_status em campanhas e conjuntos
-- effective_status = status real do Meta (ACTIVE, PAUSED, COMPLETED, WITH_ISSUES, etc.)
-- Diferente de status = o que o usuário configurou
-- Uma campanha pode ter status=ACTIVE mas effective_status=COMPLETED (período encerrado)
-- ou effective_status=WITH_ISSUES (saldo insuficiente, etc.)

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS effective_status TEXT;

ALTER TABLE ad_sets
  ADD COLUMN IF NOT EXISTS effective_status TEXT;

-- Index para filtrar campanhas realmente ativas
CREATE INDEX IF NOT EXISTS idx_campaigns_effective_status
  ON campaigns (effective_status);
