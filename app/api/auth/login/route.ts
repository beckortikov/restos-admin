import { NextResponse } from 'next/server'
import { checkPassword, issueSession } from '@/lib/auth'

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}))
  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'password required' }, { status: 400 })
  }
  if (!checkPassword(password)) {
    return NextResponse.json({ error: 'invalid credentials' }, { status: 401 })
  }
  await issueSession()
  return NextResponse.json({ ok: true })
}
