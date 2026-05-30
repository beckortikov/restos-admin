import { redirect } from 'next/navigation'
import { isAuthed } from '@/lib/auth'
import IssueForm from './IssueForm'
import LicenseList from './LicenseList'

export default async function HomePage() {
  if (!(await isAuthed())) redirect('/login')

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-gray-900">RestOS Admin</h1>
          <form action="/api/auth/logout" method="POST">
            <button className="text-sm text-gray-500 hover:text-gray-900">Sign out</button>
          </form>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <IssueForm />
        <LicenseList />
      </main>
    </div>
  )
}
