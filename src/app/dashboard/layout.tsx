import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-6 h-14 flex items-center justify-end shrink-0">
          <span className="text-sm text-gray-600">{session.user.name}</span>
        </header>
        <main className="flex-1 overflow-y-auto min-h-0 [&:has([data-layout=fullpage])]:overflow-hidden [&:has([data-layout=fullpage])]:p-0 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
