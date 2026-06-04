-- Применить один раз в Neon SQL Editor (console.neon.tech → SQL Editor).
-- Таблица для аудита выданных лицензий.

CREATE TABLE IF NOT EXISTS issued_licenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id      TEXT NOT NULL,
  restaurant_id   TEXT NOT NULL,
  restaurant_name TEXT,
  edition         TEXT NOT NULL CHECK (edition IN ('start', 'business', 'pro')),
  expires_at      TIMESTAMPTZ NOT NULL,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  token           TEXT NOT NULL,
  notes           TEXT,
  issued_by       TEXT,
  account_id      TEXT  -- Phase 1 multi-branch: владелец сети, NULL для одиночных
);

CREATE INDEX IF NOT EXISTS idx_issued_licenses_restaurant ON issued_licenses(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_issued_licenses_machine ON issued_licenses(machine_id);
CREATE INDEX IF NOT EXISTS idx_issued_licenses_issued_at ON issued_licenses(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_issued_licenses_account_id ON issued_licenses(account_id) WHERE account_id IS NOT NULL;

-- Idempotent ALTER чтобы накатить на уже созданную БД (Phase 1 add).
ALTER TABLE issued_licenses ADD COLUMN IF NOT EXISTS account_id TEXT;

-- v2.1.3 — per-key grace/warning periods (sync с restos-v4 LicenseToken payload).
-- grace_days  — сколько дней после exp софт работает с warning. 0 = hard lock сразу.
-- warning_days — после grace ещё N дней с red banner. Потом lock.
ALTER TABLE issued_licenses ADD COLUMN IF NOT EXISTS grace_days   INT NOT NULL DEFAULT 0;
ALTER TABLE issued_licenses ADD COLUMN IF NOT EXISTS warning_days INT NOT NULL DEFAULT 0;

-- Neon не использует Supabase RLS — доступ контролируется connection string.
-- В Vercel живёт только DATABASE_URL, никаких anonymous-ключей нет.
