// Supabase client (Service Role key, server-side only).
// Storage для истории выданных лицензий: search, audit, продление.

import { createClient } from '@supabase/supabase-js'

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
}

let _client: ReturnType<typeof createClient> | null = null

function client() {
  if (_client) return _client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL + SUPABASE_SERVICE_KEY env required')
  _client = createClient(url, key, { auth: { persistSession: false } })
  return _client
}

export async function insertLicense(row: Omit<IssuedLicense, 'id'>): Promise<void> {
  // Supabase v2 generic types требуют Database codegen, у нас его нет —
  // используем `any`-каст таблицы. Шейп закреплён в supabase-schema.sql.
  const tbl = client().from('issued_licenses') as any
  const { error } = await tbl.insert([row])
  if (error) throw error
}

export async function listRecentLicenses(limit = 20): Promise<IssuedLicense[]> {
  const { data, error } = await client()
    .from('issued_licenses')
    .select('*')
    .order('issued_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as unknown as IssuedLicense[]
}

export async function listLicensesByRestaurant(restaurantId: string): Promise<IssuedLicense[]> {
  const { data, error } = await client()
    .from('issued_licenses')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as IssuedLicense[]
}
