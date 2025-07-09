'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import axios from 'axios'
import LogoutButton from '../logout-button'
import { getClient } from '@/lib/browserClient'

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('id')
  const router = useRouter()

  const [result, setResult] = useState<null | {
    filename: string
    type: string
    summary: string
    clips?: string[]
    texts?: string[]
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
      <h1 className="text-2xl font-bold mb-4">Results</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {result && (
        <div className="mt-6 text-left max-w-xl mx-auto">
          <p><strong>📄 Filename:</strong> {result.filename}</p>
          <p className="mt-2"><strong>📦 Type:</strong> {result.type}</p>

          <div className="mt-4">
            <strong>🧠 Summary:</strong>
            <pre className="bg-gray-100 p-4 mt-1 rounded text-sm">{result.summary}</pre>
          </div>

          {result.clips && (
            <>
              <h2 className="mt-6 text-xl font-semibold">🔥 Top Viral Clips</h2>
              <ul className="list-disc pl-6 mt-2 space-y-2">
                {result.clips.map((clip, i) => (
                  <li key={i}>
                    <a
                      href={`http://localhost:8000/${clip}`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      🎬 Download Clip {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          {result.texts && (
            <>
              <h2 className="mt-6 text-xl font-semibold">📝 Suggested Captions</h2>
              <ul className="list-disc pl-6 mt-2">
                {result.texts.map((text, i) => (
                  <li key={i} className="flex justify-between items-center">
                    <span>{text}</span>
                    <button
                      className="ml-2 text-blue-600 underline"
                      onClick={() => navigator.clipboard.writeText(text)}
                    >
                      Copy
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => router.push('/dashboard')}
        className="mt-6 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        ← Back to Dashboard
      </button>

      <div className="mt-4">
        <LogoutButton />
      </div>
    </div>
  )
}
