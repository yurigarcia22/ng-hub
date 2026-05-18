-- Tipo de funding source (pré-pago vs cartão de crédito vs boleto)
-- Permite distinguir contas que pagam por saldo (PREPAID) de contas que pagam
-- por cartão (CREDIT_CARD) — onde o conceito de "saldo disponível" não se aplica.
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS funding_type TEXT;
ALTER TABLE ad_accounts ADD COLUMN IF NOT EXISTS funding_display TEXT;

-- Index para filtros
CREATE INDEX IF NOT EXISTS idx_ad_accounts_funding_type ON ad_accounts(funding_type);
