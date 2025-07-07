'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/browserClient'
import Link from 'next/link'

export default function LandingPage() {
  const router = useRouter()
  const supabase = getClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/dashboard')
      }
    }

    checkUser()
  }, [router])

  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center p-6">
      <h1 className="text-4xl font-bold mb-4">Welcome to SnipSocial</h1>
      <p className="mb-6 text-gray-600 max-w-lg">
        Upload videos or podcast links. Our AI finds viral moments and writes captions for social media.
      </p>
      <Link href="/auth" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
        Get Started
      </Link>
    </div>
  )
}
