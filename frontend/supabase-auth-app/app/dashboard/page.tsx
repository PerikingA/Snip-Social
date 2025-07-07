import { redirect } from 'next/navigation'
import { getServerClient } from '@/lib/serverClient'
import LogoutButton from './logout-button'

export default async function DashboardPage() {
  const supabase = getServerClient()
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  return (
    <div className="text-center mt-20">
      <h1 className="text-2xl font-bold mb-4">Welcome to your Dashboard</h1>
      <LogoutButton />
    </div>
  )
}
