// Session — JWT-less HMAC cookie.
//
// Login: пользователь шлёт пароль → bcrypt-сравниваем с ADMIN_PASSWORD_HASH →
// выдаём cookie sid=<HMAC(timestamp)>. Cookie httpOnly, SameSite=Strict, 7 дней.
//
// Не используем NextAuth/Lucia — для одного admin'а они оверхедно.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { compareSync } from 'bcryptjs'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'restos_admin_sid'
const TTL_MS = 7 * 86_400_000

function secret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 32) {
    throw new Error('SESSION_SECRET env required (>=32 chars)')
  }
  return s
}

function adminHash(): string {
  const h = process.env.ADMIN_PASSWORD_HASH
  if (!h) throw new Error('ADMIN_PASSWORD_HASH env required (bcrypt of admin password)')
  return h
}

/** Verify password (form input) against env hash. */
export function checkPassword(plain: string): boolean {
  try {
    return compareSync(plain, adminHash())
  } catch {
    return false
  }
}

/** Issue session cookie after successful login. */
export async function issueSession() {
  const issuedAt = Date.now()
  const payload = `1.${issuedAt}`
  const hmac = createHmac('sha256', secret()).update(payload).digest('hex')
  const value = `${payload}.${hmac}`
  ;(await cookies()).set(COOKIE_NAME, value, {
    httpOnly: true, sameSite: 'strict', secure: true,
    path: '/', maxAge: TTL_MS / 1000,
  })
}

export async function clearSession() {
  ;(await cookies()).delete(COOKIE_NAME)
}

/** Server-side guard. Returns true if cookie present + valid + not expired. */
export async function isAuthed(): Promise<boolean> {
  const c = (await cookies()).get(COOKIE_NAME)
  if (!c?.value) return false
  const parts = c.value.split('.')
  if (parts.length !== 3) return false
  const [v, ts, sig] = parts
  if (v !== '1') return false
  const expected = createHmac('sha256', secret()).update(`${v}.${ts}`).digest('hex')
  // timingSafeEqual нужен equal length.
  if (sig.length !== expected.length) return false
  if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return false
  const issuedAt = Number(ts)
  if (Number.isNaN(issuedAt)) return false
  if (Date.now() - issuedAt > TTL_MS) return false
  return true
}
