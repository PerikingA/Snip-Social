'use client'

import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { getClient } from '@/lib/browserClient'

export default function ClientSessionProvider({ children }: { children: React.ReactNode }) {
  const supabase = getClient()

  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  )
}
