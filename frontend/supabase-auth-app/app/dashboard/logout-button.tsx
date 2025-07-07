'use client'

import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/browserClient'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = getClient()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      localStorage.removeItem('recently_registered_email')
      router.replace('/auth')
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Logout
    </button>
  )
}
