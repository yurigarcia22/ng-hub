-- Adiciona colunas de ações à tabela metrics
-- Para suportar templates de WPP (mensagens) e Leads

ALTER TABLE metrics
  ADD COLUMN IF NOT EXISTS conversations integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_sent integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS page_views integer DEFAULT 0;
