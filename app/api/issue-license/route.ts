import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import { signToken, rfc3339, daysFromNow, type Edition } from '@/lib/license'
import { insertLicense } from '@/lib/db'

interface Body {
  machine_id: string
  restaurant_id: string
  restaurant_name?: string
  edition?: Edition
  days?: number
  notes?: string
  account_id?: string  // Phase 1 multi-branch — владелец сети
}

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const priv = process.env.LICENSE_PRIVATE_KEY
  if (!priv) {
    return NextResponse.json({ error: 'LICENSE_PRIVATE_KEY not set' }, { status: 500 })
  }

  const b: Body = await req.json().catch(() => ({} as Body))
  if (!b.machine_id?.trim() || !b.restaurant_id?.trim()) {
    return NextResponse.json({ error: 'machine_id + restaurant_id required' }, { status: 400 })
  }

  const edition = (b.edition ?? 'pro') as Edition
  if (!['start', 'business', 'pro'].includes(edition)) {
    return NextResponse.json({ error: 'edition must be start|business|pro' }, { status: 400 })
  }

  const days = Math.max(1, Math.min(3650, Number(b.days ?? 365)))
  const now = new Date()
  const expires = daysFromNow(days)

  let token: string
  try {
    token = signToken(priv, {
      rid: b.restaurant_id.trim(),
      iat: rfc3339(now),
      exp: rfc3339(expires),
      ed: edition,
      mid: b.machine_id.trim(),
      aid: b.account_id?.trim() || undefined,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'sign failed: ' + (e?.message ?? e) }, { status: 500 })
  }

  // Persist for audit/search.
  try {
    await insertLicense({
      machine_id: b.machine_id.trim(),
      restaurant_id: b.restaurant_id.trim(),
      restaurant_name: b.restaurant_name?.trim() || null,
      edition,
      expires_at: expires.toISOString(),
      issued_at: now.toISOString(),
      token,
      notes: b.notes?.trim() || null,
      issued_by: 'admin',
      account_id: b.account_id?.trim() || null,
    })
  } catch (e: any) {
    // Если БД упала — токен всё равно валиден, просто без audit-записи.
    // Возвращаем warning в response.
    return NextResponse.json({
      token, edition, expires_at: expires.toISOString(),
      warning: 'license issued but audit save failed: ' + (e?.message ?? e),
    })
  }

  return NextResponse.json({
    token,
    edition,
    expires_at: expires.toISOString(),
  })
}
