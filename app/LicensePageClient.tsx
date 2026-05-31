'use client'

import { useRef, useState } from 'react'
import IssueForm from './IssueForm'
import LicenseList from './LicenseList'

export interface PrefillData {
  machine_id: string
  restaurant_id: string
  restaurant_name: string
  account_id: string
  edition: 'start' | 'business' | 'pro'
  nonce: number
}

export default function LicensePageClient() {
  const [prefill, setPrefill] = useState<PrefillData | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  function handleExtend(data: Omit<PrefillData, 'nonce'>) {
    setPrefill({ ...data, nonce: Date.now() })
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <>
      <div ref={formRef}>
        <IssueForm prefill={prefill} onConsumePrefill={() => setPrefill(null)} />
      </div>
      <LicenseList onExtend={handleExtend} />
    </>
  )
}
