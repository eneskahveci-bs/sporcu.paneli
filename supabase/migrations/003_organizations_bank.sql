-- Add bank details to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS bank_name text DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS account_name text DEFAULT '';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS iban text DEFAULT '';
