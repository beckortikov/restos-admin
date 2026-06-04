'use client'

import { useEffect, useMemo, useState } from 'react'
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

type LicStatus = 'active' | 'grace' | 'expiring' | 'expired'

interface StatusInfo {
  status: LicStatus
  cls: string
  label: string
}

function computeStatus(it: Item): StatusInfo {
  const expiresMs = new Date(it.expires_at).getTime()
  const now = Date.now()
  const diffDays = (expiresMs - now) / DAY_MS
  const graceDays = it.grace_days ?? 0
  const warningDays = it.warning_days ?? 7

  if (diffDays <= -graceDays) {
    return { status: 'expired', cls: 'bg-red-100 text-red-800', label: 'истекла' }
  }
  if (diffDays <= 0) {
    return { status: 'grace', cls: 'bg-orange-100 text-orange-800', label: `grace ${Math.max(1, Math.ceil(diffDays + graceDays))} дн.` }
  }
  if (diffDays <= warningDays) {
    return { status: 'expiring', cls: 'bg-amber-100 text-amber-800', label: `< ${Math.max(1, Math.ceil(diffDays))} дн.` }
  }
  return { status: 'active', cls: 'bg-green-100 text-green-800', label: 'активна' }
}

interface MachineGroup {
  machineId: string
  latest: Item
  history: Item[]
  latestStatus: StatusInfo
}

interface RestaurantGroup {
  restaurantId: string
  restaurantName: string
  machines: MachineGroup[]
  activeCount: number
  expiringSoonCount: number
  expiredCount: number
  urgency: number // lower = more urgent
  earliestExpiresMs: number
}

export function groupLicenses(items: Item[]): RestaurantGroup[] {
  const byRestaurant = new Map<string, Item[]>()
  for (const lic of items) {
    const arr = byRestaurant.get(lic.restaurant_id) ?? []
    arr.push(lic)
    byRestaurant.set(lic.restaurant_id, arr)
  }

  const groups: RestaurantGroup[] = []
  for (const [restaurantId, licenses] of byRestaurant) {
    const byMachine = new Map<string, Item[]>()
    for (const lic of licenses) {
      const arr = byMachine.get(lic.machine_id) ?? []
      arr.push(lic)
      byMachine.set(lic.machine_id, arr)
    }

    const machines: MachineGroup[] = []
    for (const [machineId, machineLics] of byMachine) {
      const sorted = [...machineLics].sort(
        (a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime(),
      )
      const latest = sorted[0]
      const history = sorted.slice(1)
      machines.push({
        machineId,
        latest,
        history,
        latestStatus: computeStatus(latest),
      })
    }

    machines.sort(
      (a, b) => new Date(a.latest.expires_at).getTime() - new Date(b.latest.expires_at).getTime(),
    )

    let activeCount = 0
    let expiringSoonCount = 0
    let expiredCount = 0
    for (const m of machines) {
      if (m.latestStatus.status === 'active') activeCount++
      else if (m.latestStatus.status === 'expiring' || m.latestStatus.status === 'grace') expiringSoonCount++
      else if (m.latestStatus.status === 'expired') expiredCount++
    }

    // urgency rank: rest with expiring/grace first, then active, then all-expired
    let urgency = 2
    if (expiringSoonCount > 0) urgency = 0
    else if (activeCount > 0) urgency = 1
    else urgency = 3

    const earliestExpiresMs = machines.length
      ? new Date(machines[0].latest.expires_at).getTime()
      : Number.POSITIVE_INFINITY

    groups.push({
      restaurantId,
      restaurantName: licenses.find(l => l.restaurant_name)?.restaurant_name ?? '—',
      machines,
      activeCount,
      expiringSoonCount,
      expiredCount,
      urgency,
      earliestExpiresMs,
    })
  }

  groups.sort((a, b) => {
    if (a.urgency !== b.urgency) return a.urgency - b.urgency
    return a.earliestExpiresMs - b.earliestExpiresMs
  })

  return groups
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('ru-RU')
}

interface MachineRowProps {
  m: MachineGroup
  onExtend?: Props['onExtend']
  restaurantName: string
}

function MachineRow({ m, onExtend, restaurantName }: MachineRowProps) {
  const st = m.latestStatus
  return (
    <div className="p-4 border-b last:border-b-0">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs">▢</span>
        <code className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-0.5 rounded">{m.machineId}</code>
        <span className="font-mono uppercase text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold">
          {m.latest.edition}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {(m.latest.grace_days ?? 0)}+{(m.latest.warning_days ?? 0)}д
        </span>
        {m.latest.account_id && (
          <button
            onClick={() => navigator.clipboard.writeText(m.latest.account_id!)}
            title={`Скопировать account: ${m.latest.account_id}`}
            className="text-xs font-mono text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded hover:bg-purple-100"
          >
            {m.latest.account_id.slice(0, 8)}…
          </button>
        )}
        <span className="text-xs text-gray-600 ml-auto whitespace-nowrap">
          до {fmt(m.latest.expires_at)}
        </span>
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${st.cls}`}>
          {st.label}
        </span>
        <button
          onClick={() => onExtend?.({
            machine_id: m.latest.machine_id,
            restaurant_id: m.latest.restaurant_id,
            restaurant_name: restaurantName,
            account_id: m.latest.account_id ?? '',
            edition: (m.latest.edition as 'start' | 'business' | 'pro'),
          })}
          className="text-xs px-2 py-1 rounded bg-gray-900 text-white hover:bg-gray-800"
        >
          + Продлить
        </button>
      </div>

      {m.history.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-900 select-none">
            ▶ История замен ({m.history.length})
          </summary>
          <div className="mt-2 pl-6 space-y-1">
            {m.history.map(h => (
              <div key={h.id} className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                <span className="whitespace-nowrap">{fmt(h.issued_at)}</span>
                <span className="font-mono uppercase">{h.edition}</span>
                <span className="font-mono">{(h.grace_days ?? 0)}+{(h.warning_days ?? 0)}д</span>
                <span className="whitespace-nowrap">до {fmt(h.expires_at)}</span>
                <span className="text-gray-400">— заменён</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

interface RestaurantCardProps {
  g: RestaurantGroup
  onExtend?: Props['onExtend']
  defaultCollapsed: boolean
}

function RestaurantCard({ g, onExtend, defaultCollapsed }: RestaurantCardProps) {
  const allExpired = g.activeCount === 0 && g.expiringSoonCount === 0
  return (
    <details
      open={!defaultCollapsed}
      className={`rounded-xl border ${allExpired ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'} overflow-hidden`}
    >
      <summary className="flex items-center gap-3 p-4 border-b cursor-pointer select-none">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-gray-600 text-xs">▤</span>
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${allExpired ? 'text-gray-500' : 'text-gray-900'}`}>{g.restaurantName}</p>
          <p className="text-xs text-gray-400 font-mono truncate">{g.restaurantId}</p>
        </div>
        <div className="flex gap-2 text-xs items-center flex-wrap">
          <span className="text-gray-500">{g.machines.length} {g.machines.length === 1 ? 'машина' : 'машин'}</span>
          {g.activeCount > 0 && (
            <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded">✓ {g.activeCount} активн.</span>
          )}
          {g.expiringSoonCount > 0 && (
            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">⚠ {g.expiringSoonCount} истекает</span>
          )}
          {g.expiredCount > 0 && (
            <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded">{g.expiredCount} истёкших</span>
          )}
        </div>
      </summary>
      <div>
        {g.machines.map(m => (
          <MachineRow key={m.machineId} m={m} onExtend={onExtend} restaurantName={g.restaurantName} />
        ))}
      </div>
    </details>
  )
}

export default function LicenseList({ onExtend }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [onlyActive, setOnlyActive] = useState(false)
  const [hideExpired, setHideExpired] = useState(false)

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

  const groups = useMemo(() => groupLicenses(items), [items])

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups.filter(g => {
      if (q) {
        const hay = `${g.restaurantName} ${g.restaurantId}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (onlyActive && g.activeCount === 0 && g.expiringSoonCount === 0) return false
      if (hideExpired && g.activeCount === 0 && g.expiringSoonCount === 0) return false
      return true
    })
  }, [groups, search, onlyActive, hideExpired])

  return (
    <section className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="font-bold text-gray-900">История выданных лицензий</h2>
        <button onClick={load} className="text-sm text-blue-600 hover:underline">Обновить</button>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию или ID ресторана…"
          className="flex-1 min-w-[200px] text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={e => setOnlyActive(e.target.checked)}
            className="rounded"
          />
          Только активные
        </label>
        <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={hideExpired}
            onChange={e => setHideExpired(e.target.checked)}
            className="rounded"
          />
          Скрыть истёкшие
        </label>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 mb-3">{error}</div>}

      {filteredGroups.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-8">
          {items.length === 0 ? 'Пока пусто' : 'Ничего не найдено'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map(g => (
            <RestaurantCard
              key={g.restaurantId}
              g={g}
              onExtend={onExtend}
              defaultCollapsed={g.activeCount === 0 && g.expiringSoonCount === 0}
            />
          ))}
        </div>
      )}
    </section>
  )
}
