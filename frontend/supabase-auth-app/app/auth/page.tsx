'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getClient } from '@/lib/browserClient'
import { toast } from 'sonner'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLogin, setIsLogin] = useState(true)

  const router = useRouter()
  const supabase = getClient()

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session) {
        router.replace('/dashboard')
      }
    }

    checkSession()
  }, [router])

  const passwordIsValid = (pw: string) => {
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/
    return specialCharRegex.test(pw)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('Passwords do not match')
        setLoading(false)
        return
      }

      if (!passwordIsValid(password)) {
        setError('Password must include a special character (!@#$%^&*)')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`http://localhost:8000/check-email?email=${encodeURIComponent(email)}`)
        if (res.status === 409) {
          setError('This email is already registered. Please log in or use a different one.')
          setLoading(false)
          return
        }

        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.detail || 'Unexpected backend error')
        }

        const result = await res.json()
        if (!result.available) {
          setError('This email is already registered.')
          setLoading(false)
          return
        }
      } catch (err) {
        console.error('❌ Email check failed:', err)
        setError('Could not verify email. Please try again later.')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.signUp({ email, password })

      if (error) {
        if (error.message.toLowerCase().includes('invalid')) {
          setError('This email address is invalid. Try another one.')
        } else if (error.message.toLowerCase().includes('already')) {
          setError('This email is already registered. Please log in instead.')
        } else {
          setError(error.message)
        }
      } else {
        toast.success('Registration successful! Check your email to confirm.')
        localStorage.setItem('recently_registered_email', email)
        router.replace('/auth/confirm-email')
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

      if (signInError?.message.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect email or password.')
      } else if (signInError) {
        setError(signInError.message)
      } else {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          toast.success('Logged in successfully.')
          router.replace('/dashboard')
        } else {
          setError('Login failed. Please try again.')
        }
      }
    }

    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-4 border rounded shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {isLogin ? 'Login' : 'Register'}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          className="p-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className="p-2 border rounded w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-sm text-blue-600"
          >
            {showPassword ? 'Hide' : 'Show'}
          </span>
        </div>

        {!isLogin && (
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm Password"
              className="p-2 border rounded w-full"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <span
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 cursor-pointer text-sm text-blue-600"
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </span>
          </div>
        )}

        <button
          type="submit"
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
        </button>

        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      </form>

      <p
        className="mt-4 text-sm text-blue-600 cursor-pointer hover:underline text-center"
        onClick={() => {
          setError('')
          setEmail('')
          setPassword('')
          setConfirmPassword('')
          setShowPassword(false)
          setShowConfirmPassword(false)
          setIsLogin(!isLogin)
        }}
      >
        {isLogin ? 'Need an account? Register' : 'Already have an account? Login'}
      </p>
    </div>
  )
}
