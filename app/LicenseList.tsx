'use client'

import { useEffect, useState } from 'react'
import type { PrefillData } from './LicensePageClient'

interface Item {
  id: string
  machine_id: string
  restaurant_id: string
  restaurant_name: string | null
  edition: string
  expires_at: string
  issued_at: string
  notes: string | null
  account_id: string | null
  grace_days: number | null
  warning_days: number | null
}

interface Props {
  onExtend?: (data: Omit<PrefillData, 'nonce'>) => void
}

const DAY_MS = 86400000

function statusBadge(expiresAt: string) {
  const diffDays = (new Date(expiresAt).getTime() - Date.now()) / DAY_MS
  if (diffDays <= 0) {
    return { cls: 'bg-red-100 text-red-800', label: 'истекла' }
  }
  if (diffDays <= 7) {
    return { cls: 'bg-amber-100 text-amber-800', label: `< ${Math.max(1, Math.ceil(diffDays))} дн.` }
  }
  return { cls: 'bg-green-100 text-green-800', label: 'активна' }
}

export default function LicenseList({ onExtend }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const res = await fetch('/api/licenses')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'load failed')
      const sorted = [...(data.items ?? [])].sort((a: Item, b: Item) => {
        const eb = new Date(b.expires_at).getTime() - new Date(a.expires_at).getTime()
        if (eb !== 0) return eb
        return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
      })
      setItems(sorted)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900">История выданных лицензий</h2>
        <button onClick={load} className="text-sm text-blue-600 hover:underline">Обновить</button>
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 mb-3">{error}</div>}
      {items.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8">Пока пусто</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b">
                <th className="text-left py-2 pr-3">Когда</th>
                <th className="text-left py-2 pr-3">Ресторан</th>
                <th className="text-left py-2 pr-3">Сеть</th>
                <th className="text-left py-2 pr-3">Машина</th>
                <th className="text-left py-2 pr-3">Тариф</th>
                <th className="text-left py-2 pr-3">Grace+Warn</th>
                <th className="text-left py-2 pr-3">До</th>
                <th className="text-left py-2 pr-3">Статус</th>
                <th className="text-right py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const st = statusBadge(it.expires_at)
                return (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                      {new Date(it.issued_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="text-gray-900">{it.restaurant_name ?? '—'}</div>
                      <div className="text-xs text-gray-400 font-mono">{it.restaurant_id.slice(0, 8)}…</div>
                    </td>
                    <td className="py-2 pr-3">
                      {it.account_id ? (
                        <button
                          onClick={() => navigator.clipboard.writeText(it.account_id!)}
                          title={`Скопировать: ${it.account_id}`}
                          className="text-xs font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded hover:bg-purple-100"
                        >
                          {it.account_id.slice(0, 8)}…
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-gray-600">{it.machine_id}</td>
                    <td className="py-2 pr-3">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold uppercase">
                        {it.edition}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-600 whitespace-nowrap font-mono">
                      {(it.grace_days ?? 0)}+{(it.warning_days ?? 0)}д
                    </td>
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                      {new Date(it.expires_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => onExtend?.({
                          machine_id: it.machine_id,
                          restaurant_id: it.restaurant_id,
                          restaurant_name: it.restaurant_name ?? '',
                          account_id: it.account_id ?? '',
                          edition: (it.edition as 'start' | 'business' | 'pro'),
                        })}
                        className="text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-800"
                      >
                        + Продлить
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
