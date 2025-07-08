'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/browserClient'
import LogoutButton from './logout-button'
import axios from 'axios'
import type { AxiosProgressEvent } from 'axios'

export default function DashboardPage() {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getClient()
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/auth')
      } else {
        setSession(session)
      }

      setSessionChecked(true)
    }

    checkSession()
  }, [router])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first')
      return
    }

    setUploading(true)
    setMessage('')

  const supabase = getClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const user_email = session?.user?.email
    if (!user_email) {
      setMessage('❌ No user email found')
      setUploading(false)
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('user_email', user_email)

    try {
      const res = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const loaded = progressEvent.loaded ?? 0
          const total = progressEvent.total ?? 1
          const percent = Math.round((loaded * 100) / total)
          setMessage(`Uploading... ${percent}%`)
        }
      })

      const { job_id } = res.data
      router.push(`/dashboard/results?id=${job_id}`)
    } catch (err: any) {
      console.error(err)
      setMessage('❌ Upload failed')
    } finally {
      setUploading(false)
    }
  }

  if (!sessionChecked) {
    return null
  }

  return (
    <div className="text-center mt-20 px-6">
      <h1 className="text-2xl font-bold mb-4">Welcome to your Dashboard</h1>
      <LogoutButton />

      <div className="mt-8">
        <input type="file" onChange={handleFileChange} />
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected file: {file.name}
          </p>
        )}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        {message && <p className="mt-2">{message}</p>}
      </div>
    </div>
  )
}
