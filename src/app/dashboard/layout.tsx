import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar userName={session.user.name} />
      <main className="flex-1 overflow-y-auto min-h-0 [&:has([data-layout=fullpage])]:overflow-hidden [&:has([data-layout=fullpage])]:p-0 p-6">
        {children}
      </main>
    </div>
  )
}
