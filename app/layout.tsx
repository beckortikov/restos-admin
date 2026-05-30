import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RestOS Admin',
  description: 'License issuance & restaurant management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
