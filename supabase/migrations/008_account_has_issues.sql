-- Migration 008: has_issues em ad_accounts
-- has_issues = true quando a conta atingiu spend_cap (amount_spent >= spend_cap)
-- Campanhas dessa conta podem ter effective_status=ACTIVE mas estão travadas.

ALTER TABLE ad_accounts
  ADD COLUMN IF NOT EXISTS has_issues BOOLEAN DEFAULT false;

ALTER TABLE ad_accounts
  ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
