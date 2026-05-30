'use client'

import { useEffect, useState } from 'react'

interface Item {
  id: string
  machine_id: string
  restaurant_id: string
  restaurant_name: string | null
  edition: string
  expires_at: string
  issued_at: string
  notes: string | null
}

export default function LicenseList() {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')

  async function load() {
    setError('')
    try {
      const res = await fetch('/api/licenses')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'load failed')
      setItems(data.items ?? [])
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
                <th className="text-left py-2 pr-3">Машина</th>
                <th className="text-left py-2 pr-3">Тариф</th>
                <th className="text-left py-2">До</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-b last:border-0">
                  <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                    {new Date(it.issued_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="text-gray-900">{it.restaurant_name ?? '—'}</div>
                    <div className="text-xs text-gray-400 font-mono">{it.restaurant_id.slice(0, 8)}…</div>
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-gray-600">{it.machine_id}</td>
                  <td className="py-2 pr-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold uppercase">
                      {it.edition}
                    </span>
                  </td>
                  <td className="py-2 text-gray-600 whitespace-nowrap">
                    {new Date(it.expires_at).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
