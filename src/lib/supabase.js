import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isServiceRoleKey(key) {
  if (!key || typeof key !== 'string') return false
  if (key.startsWith('sb_secret_')) return true
  const parts = key.split('.')
  if (parts.length !== 3) return false
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

export const supabaseConfigError = !supabaseUrl || !supabaseAnonKey
  ? 'Missing Supabase configuration. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  : isServiceRoleKey(supabaseAnonKey)
    ? 'Security error: Do not expose a Supabase service_role or secret key in VITE_SUPABASE_ANON_KEY. Use the public anon key only.'
    : null

export const isSupabaseConfigured = !supabaseConfigError

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
