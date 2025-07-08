'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import axios from 'axios'
import LogoutButton from '../logout-button'
import { getClient } from '@/lib/browserClient'

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('id')

  const [result, setResult] = useState<null | {
    filename: string
    type: string
    summary: string
  }>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResult = async () => {
      if (!jobId) {
        setError('Missing job ID')
        return
      }

      const supabase = getClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const user_email = session?.user?.email
      if (!user_email) {
        setError('❌ No user email found')
        return
      }

      try {
        const res = await axios.get(
          `http://localhost:8000/results?job_id=${jobId}&user_email=${encodeURIComponent(user_email)}`
        )

        setResult(res.data)
      } catch (err) {
        console.error(err)
        setError('Failed to fetch results or unauthorized')
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [jobId])

  return (
    <div className="text-center mt-20 px-6">
      <h1 className="text-2xl font-bold mb-4">Processing Results</h1>
      <LogoutButton />

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {result && (
        <div className="mt-6 text-left max-w-xl mx-auto">
          <p><strong>📄 Filename:</strong> {result.filename}</p>
          <p className="mt-2"><strong>📦 Type:</strong> {result.type}</p>
          <p className="mt-4"><strong>🧠 Summary:</strong></p>
          <pre className="bg-gray-100 p-4 mt-1 rounded text-sm">{result.summary}</pre>
        </div>
      )}
    </div>
  )
}
