import { createClient } from '@supabase/supabase-js'

type RuntimeConfig = {
  SUPABASE_URL?: string
  SUPABASE_PUBLISHABLE_KEY?: string
}

const runtimeConfig = (globalThis as typeof globalThis & {
  __MADEROOM_CONFIG__?: RuntimeConfig
}).__MADEROOM_CONFIG__

const viteEnv = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>
}).env

const supabaseUrl = viteEnv?.VITE_SUPABASE_URL ?? runtimeConfig?.SUPABASE_URL
const supabasePublishableKey = viteEnv?.VITE_SUPABASE_PUBLISHABLE_KEY ?? runtimeConfig?.SUPABASE_PUBLISHABLE_KEY

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null

export const isSupabaseConfigured = Boolean(supabase)
