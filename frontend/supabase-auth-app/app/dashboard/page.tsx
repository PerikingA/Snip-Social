'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/browserClient'
import LogoutButton from './logout-button'
import axios from 'axios'
import { useDropzone } from 'react-dropzone'
import type { AxiosProgressEvent } from 'axios'

export default function DashboardPage() {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [platform, setPlatform] = useState('linkedin')
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = getClient()
      const {
        data: { session },
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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
      setMessage(`Selected: ${acceptedFiles[0].name}`)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a'], 'video/*': ['.mp4'] }
  })

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file first')
      return
    }

    const mimeType = file.type
    if (!mimeType.startsWith('audio/') && !mimeType.startsWith('video/')) {
      setMessage('❌ Only audio or video files are allowed')
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
    formData.append('platform', platform)

    try {
      const res = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent: AxiosProgressEvent) => {
          const loaded = progressEvent.loaded ?? 0
          const total = progressEvent.total ?? 1
          const percent = Math.round((loaded * 100) / total)
          setMessage(`Uploading... ${percent}%`)
        },
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
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded p-6 cursor-pointer transition ${
            isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
          }`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the file here...</p>
          ) : (
            <p>Drag and drop a file here, or click to select</p>
          )}
        </div>

        {file && (
          <p className="mt-2 text-sm text-gray-600">Selected file: {file.name}</p>
        )}

        <select
          className="mt-4 p-2 border rounded"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="linkedin">LinkedIn</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="twitter">Twitter</option>
        </select>

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
