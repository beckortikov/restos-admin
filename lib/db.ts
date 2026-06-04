// Neon Postgres client (Vercel-friendly serverless).
//
// @neondatabase/serverless использует WebSocket к Neon Pooler — работает
// в Vercel Edge/Node без issue'ев с connection-limits классического pg.

import { neon } from '@neondatabase/serverless'

export interface IssuedLicense {
  id: string
  machine_id: string
  restaurant_id: string
  restaurant_name?: string | null
  edition: string
  expires_at: string
  issued_at: string
  token: string
  notes?: string | null
  issued_by?: string | null
  account_id?: string | null  // Phase 1 multi-branch
  grace_days?: number | null  // v2.1.3 — warning-период после exp
  warning_days?: number | null // v2.1.3 — lock-период после grace
}

function sql() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL env required (Neon Postgres connection string)')
  return neon(url)
}

export async function insertLicense(row: Omit<IssuedLicense, 'id'>): Promise<void> {
  const q = sql()
  await q`
    INSERT INTO issued_licenses
      (machine_id, restaurant_id, restaurant_name, edition,
       expires_at, issued_at, token, notes, issued_by, account_id,
       grace_days, warning_days)
    VALUES
      (${row.machine_id}, ${row.restaurant_id}, ${row.restaurant_name ?? null},
       ${row.edition}, ${row.expires_at}, ${row.issued_at}, ${row.token},
       ${row.notes ?? null}, ${row.issued_by ?? null}, ${row.account_id ?? null},
       ${row.grace_days ?? 0}, ${row.warning_days ?? 0})
  `
}

export async function listRecentLicenses(limit = 50): Promise<IssuedLicense[]> {
  const q = sql()
  const rows = await q`
    SELECT id, machine_id, restaurant_id, restaurant_name, edition,
           expires_at, issued_at, token, notes, issued_by, account_id,
           grace_days, warning_days
    FROM issued_licenses
    ORDER BY issued_at DESC
    LIMIT ${limit}
  ` as unknown as IssuedLicense[]
  return rows
}

export async function listLicensesByRestaurant(restaurantId: string): Promise<IssuedLicense[]> {
  const q = sql()
  const rows = await q`
    SELECT id, machine_id, restaurant_id, restaurant_name, edition,
           expires_at, issued_at, token, notes, issued_by, account_id,
           grace_days, warning_days
    FROM issued_licenses
    WHERE restaurant_id = ${restaurantId}
    ORDER BY issued_at DESC
  ` as unknown as IssuedLicense[]
  return rows
}

/**
 * listLicensesByAccount — все рестораны одного владельца сети (Phase 1).
 * Используется будущим Owner Dashboard для drill-down.
 */
export async function listLicensesByAccount(accountId: string): Promise<IssuedLicense[]> {
  const q = sql()
  const rows = await q`
    SELECT id, machine_id, restaurant_id, restaurant_name, edition,
           expires_at, issued_at, token, notes, issued_by, account_id,
           grace_days, warning_days
    FROM issued_licenses
    WHERE account_id = ${accountId}
    ORDER BY issued_at DESC
  ` as unknown as IssuedLicense[]
  return rows
}
