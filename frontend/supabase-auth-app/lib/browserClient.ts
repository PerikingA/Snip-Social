import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const getClient = () => createClientComponentClient()
