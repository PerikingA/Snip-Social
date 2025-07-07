import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export const getMiddlewareClient = ({ req, res }: { req: any; res: any }) =>
  createMiddlewareClient({ req, res })
