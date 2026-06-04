// Ed25519 license token — TS-порт Go-функции (server/internal/pkg/license/token.go).
// Подпись MUST совпадать byte-в-byte с Go: одинаковый JSON-порядок ключей,
// одинаковая base64url-кодировка, одинаковый payload-формат.
//
// Используется Node.js crypto.sign('ed25519', ...) — нативная поддержка с Node 12.
//
// SECURITY: PRIVATE_KEY НИКОГДА не уходит в response — только server-side в API route.

import { createPrivateKey, sign } from 'node:crypto'

export type Edition = 'start' | 'business' | 'pro'

export interface Payload {
  v: number                   // version (всегда 1)
  rid: string                 // restaurant_id (UUID)
  iat: string                 // issued_at (RFC3339)
  exp: string                 // expires_at (RFC3339)
  ed?: Edition                // edition
  mid?: string                // machine_id (fingerprint железа)
  aid?: string                // account_id (сеть владельца, Phase 1 multi-branch)
  grace_days?: number         // v2.1.3: warning-период после exp. 0 = hard lock.
  warning_days?: number       // v2.1.3: lock-период после grace. 0 = lock сразу.
}

export const CURRENT_VERSION = 1

/**
 * Sign — выпускает signed token: base64url(payloadJSON).base64url(signature).
 *
 * Кладём ключи в payload в ТОМ ЖЕ порядке как Go-структура (это влияет на
 * JSON-байты → подпись). Поле omitempty: skip если пусто.
 */
export function signToken(privBase64Std: string, p: Omit<Payload, 'v'> & { v?: number }): string {
  const priv = decodePrivateKey(privBase64Std)
  const payload: Record<string, unknown> = {
    v: p.v ?? CURRENT_VERSION,
    rid: p.rid,
    iat: p.iat,
    exp: p.exp,
  }
  if (p.ed) payload.ed = p.ed
  if (p.mid) payload.mid = p.mid
  if (p.aid) payload.aid = p.aid
  // omitempty parity с Go: пропускаем когда 0.
  if (p.grace_days && p.grace_days > 0) payload.grace_days = p.grace_days
  if (p.warning_days && p.warning_days > 0) payload.warning_days = p.warning_days

  const body = JSON.stringify(payload)
  const bodyEnc = base64UrlEncode(Buffer.from(body, 'utf-8'))
  const sigBytes = sign(null, Buffer.from(bodyEnc, 'utf-8'), priv)
  const sigEnc = base64UrlEncode(sigBytes)
  return bodyEnc + '.' + sigEnc
}

// Helpers ─────────────────────────────────────────────────────────────────────

function base64UrlEncode(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Go ed25519.PrivateKey = 64 bytes (32 seed + 32 pub). Node для импорта Ed25519
 * хочет PKCS#8 DER или JWK. Конвертируем: берём первые 32 байта (seed) и
 * заворачиваем в PKCS#8 prefix (фиксированные 16 байт для Ed25519).
 */
function decodePrivateKey(base64Std: string) {
  const raw = Buffer.from(base64Std, 'base64')
  if (raw.length !== 64) {
    throw new Error(`bad private key length ${raw.length}, want 64 (Go ed25519.PrivateKey)`)
  }
  const seed = raw.subarray(0, 32)
  // PKCS#8 prefix for Ed25519 private key (32-byte seed):
  // SEQUENCE(48 LEN) → INTEGER(0) → SEQUENCE(OID 1.3.101.112) → OCTET STRING(34 → OCTET STRING(32 seed))
  const prefix = Buffer.from('302e020100300506032b657004220420', 'hex')
  const pkcs8 = Buffer.concat([prefix, seed])
  return createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' })
}

/** ISO date в формате который Go time.Time.MarshalJSON выдаёт (RFC3339Nano). */
export function rfc3339(d: Date): string {
  return d.toISOString().replace(/\.\d+Z$/, 'Z')
}

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86_400_000)
}
