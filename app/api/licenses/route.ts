import { NextResponse } from 'next/server'
import { isAuthed } from '@/lib/auth'
import { listRecentLicenses } from '@/lib/db'

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    const rows = await listRecentLicenses(50)
    return NextResponse.json({ items: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
