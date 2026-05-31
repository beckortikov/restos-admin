'use client'

import { useEffect, useState } from 'react'
import type { PrefillData } from './LicensePageClient'

interface Props {
  prefill?: PrefillData | null
  onConsumePrefill?: () => void
}

type ExpiryMode = 'days' | 'date'

export default function IssueForm({ prefill, onConsumePrefill }: Props) {
  const [machineId, setMachineId] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [accountId, setAccountId] = useState('')
  const [edition, setEdition] = useState<'start' | 'business' | 'pro'>('pro')
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>('days')
  const [days, setDays] = useState(365)
  const [expiryDate, setExpiryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isExtending, setIsExtending] = useState(false)

  useEffect(() => {
    if (!prefill) return
    setMachineId(prefill.machine_id)
    setRestaurantId(prefill.restaurant_id)
    setRestaurantName(prefill.restaurant_name)
    setAccountId(prefill.account_id)
    setEdition(prefill.edition as any)
    setNotes('')
    setToken('')
    setError('')
    setIsExtending(true)
    onConsumePrefill?.()
  }, [prefill, onConsumePrefill])

  function resetExtend() {
    setIsExtending(false)
    setMachineId('')
    setRestaurantId('')
    setRestaurantName('')
    setAccountId('')
    setNotes('')
    setToken('')
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setToken('')

    let effectiveDays = days
    if (expiryMode === 'date') {
      if (!expiryDate) {
        setError('Укажите дату истечения')
        return
      }
      const target = new Date(expiryDate + 'T23:59:59')
      const diff = Math.ceil((target.getTime() - Date.now()) / 86400000)
      if (diff < 1) {
        setError('Дата должна быть в будущем (минимум +1 день)')
        return
      }
      effectiveDays = diff
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/issue-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          machine_id: machineId.trim(),
          restaurant_id: restaurantId.trim(),
          restaurant_name: restaurantName.trim() || undefined,
          edition,
          days: effectiveDays,
          notes: notes.trim() || undefined,
          account_id: accountId.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? 'Issue failed')
      setToken(data.token)
      if (data.warning) setError('⚠ ' + data.warning)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setSubmitting(false)
    }
  }

  function copyToken() {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold text-gray-900">
          {isExtending ? 'Продлить лицензию' : 'Выдать лицензию'}
        </h2>
        {isExtending && (
          <button
            type="button"
            onClick={resetExtend}
            className="text-xs text-gray-500 hover:text-gray-900 underline"
          >
            Сбросить (новая лицензия)
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {isExtending
          ? 'Поля заполнены из существующей лицензии. Выбери новый срок и выдай.'
          : 'Введите данные от клиента (machine_id + restaurant_id из его экрана активации).'}
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-600 uppercase block mb-1">Код машины *</label>
          <input
            required value={machineId} onChange={e => setMachineId(e.target.value.toUpperCase())}
            placeholder="A1B2-7K3M-9XQA"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-600 uppercase block mb-1">ID ресторана (UUID) *</label>
          <input
            required value={restaurantId} onChange={e => setRestaurantId(e.target.value)}
            placeholder="7c4e3b2a-..."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-600 uppercase block mb-1">Название ресторана</label>
          <input
            value={restaurantName} onChange={e => setRestaurantName(e.target.value)}
            placeholder="My Cafe, Душанбе"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-600 uppercase block mb-1">
            Account ID (опц.) — для сети
          </label>
          <input
            value={accountId} onChange={e => setAccountId(e.target.value)}
            placeholder="Оставь пустым для одиночного ресторана. Или UUID владельца сети."
            className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Если выписываешь второй+ ресторан тому же владельцу — скопируй account_id из его предыдущей лицензии (видна в истории ниже). Будущий Owner Dashboard сгруппирует.
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase block mb-1">Тариф</label>
          <select
            value={edition} onChange={e => setEdition(e.target.value as 'start' | 'business' | 'pro')}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="start">Start</option>
            <option value="business">Business</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 uppercase block mb-1">Срок</label>
          <div className="flex gap-2">
            <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setExpiryMode('days')}
                className={`px-3 py-2 text-xs font-semibold ${expiryMode === 'days' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Дней
              </button>
              <button
                type="button"
                onClick={() => setExpiryMode('date')}
                className={`px-3 py-2 text-xs font-semibold border-l border-gray-300 ${expiryMode === 'date' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                До даты
              </button>
            </div>
            {expiryMode === 'days' ? (
              <input
                type="number" min={1} max={3650} value={days} onChange={e => setDays(Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs font-medium text-gray-600 uppercase block mb-1">Заметка (опц.)</label>
          <input
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Alif транзакция #1234, 3600 SMN"
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit" disabled={submitting}
            className="w-full py-2.5 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Подписываю…' : isExtending ? 'Продлить' : 'Выдать ключ'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</div>
      )}

      {token && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-medium text-gray-600 uppercase">Ключ лицензии — отправь клиенту</div>
          <div className="flex gap-2">
            <textarea
              readOnly value={token} rows={4}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 font-mono text-xs"
            />
            <button
              type="button" onClick={copyToken}
              className="shrink-0 px-4 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
