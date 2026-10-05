import { createBrowserClient } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
const key = publishableKey || anonKey

function getConfigError(): string | null {
  if (!url || !key) {
    return "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY before running the app."
  }
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    return "NEXT_PUBLIC_SUPABASE_URL looks wrong. It should look like https://your-project-id.supabase.co"
  }
  return null
}

/** Human-readable config problem, or null when the client is ready. */
export const supabaseConfigError = getConfigError()

/**
 * Browser Supabase client.
 * Missing env must not log or throw here. Next.js treats console.error during
 * module evaluation as a page crash.
 */
export const supabase = createBrowserClient(
  supabaseConfigError ? "https://placeholder.supabase.co" : url!,
  supabaseConfigError ? "placeholder-anon-key" : key!
)
