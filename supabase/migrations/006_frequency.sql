-- Migration 006: frequência de exibição por entidade
ALTER TABLE metrics
  ADD COLUMN IF NOT EXISTS frequency numeric DEFAULT 0;
