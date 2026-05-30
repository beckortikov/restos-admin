-- Применить один раз в Supabase SQL Editor.
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
  issued_by       TEXT
);

CREATE INDEX IF NOT EXISTS idx_issued_licenses_restaurant ON issued_licenses(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_issued_licenses_machine ON issued_licenses(machine_id);
CREATE INDEX IF NOT EXISTS idx_issued_licenses_issued_at ON issued_licenses(issued_at DESC);

-- Service Role обходит RLS, но включим для безопасности.
ALTER TABLE issued_licenses ENABLE ROW LEVEL SECURITY;
-- Никаких policies → только service-key может читать/писать.
