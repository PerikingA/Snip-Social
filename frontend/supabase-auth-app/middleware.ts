import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getMiddlewareClient } from './lib/middlewareClient'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = getMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = req.nextUrl
  const isPublic = pathname === '/' || pathname === '/auth' || pathname === '/auth/confirm-email'
  const isDashboard = pathname.startsWith('/dashboard')

  if (!session && isDashboard) {
    return NextResponse.redirect(new URL('/auth', req.url))
  }

  if (session && isPublic) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/', '/auth', '/auth/confirm-email', '/dashboard/:path*'],
}
