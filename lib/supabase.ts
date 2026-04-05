import { createClient } from '@supabase/supabase-js'

// Client za browser (read-only)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Client za server (admin operacije - ingestija, brisanje)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Document = {
  id: string
  content: string
  metadata: {
    source: string
    title: string
    folder: string
    tags?: string[]
    created_at?: string
    url?: string
  }
  embedding?: number[]
}
