'use client'

import { useEffect, useState } from 'react'
import { getClient } from '@/lib/browserClient'
import { toast } from 'sonner'

export default function ConfirmEmailPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)

  const supabase = getClient()

  useEffect(() => {
    const storedEmail = localStorage.getItem('recently_registered_email')
    setEmail(storedEmail)
  }, [])

  const handleResend = async () => {
    if (!email) {
      toast.error('No email found. Please register again.')
      return
    }

    setResending(true)

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

    setResending(false)

    if (error) {
      toast.error(`Failed to resend link: ${error.message}`)
    } else {
      toast.success('Confirmation email resent successfully.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-center p-6">
      <div className="max-w-md border rounded shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Confirm Your Email</h1>
        {email ? (
          <>
            <p className="text-gray-700 mb-4">
              A confirmation link was sent to <strong>{email}</strong>.
              <br />
              Please click the link in your inbox to activate your account.
            </p>
            <button
              onClick={handleResend}
              disabled={resending}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {resending ? 'Resending...' : 'Resend Confirmation Email'}
            </button>
          </>
        ) : (
          <p className="text-gray-700">No email found. Please register again.</p>
        )}
      </div>
    </div>
  )
}
