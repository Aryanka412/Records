import { createBrowserClient } from "@supabase/ssr"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const key = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
)?.trim()

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

if (supabaseConfigError) {
  console.error(`[Records] ${supabaseConfigError}`)
}

/**
 * Browser Supabase client.
 * Does not throw at import/build time when env is missing (avoids opaque build crashes).
 * Misconfiguration is reported via `supabaseConfigError` / console.error instead.
 */
export const supabase = createBrowserClient(
  supabaseConfigError ? "https://placeholder.supabase.co" : url!,
  supabaseConfigError ? "placeholder-anon-key" : key!
)
