import { createBrowserClient } from "@supabase/ssr"

/**
 * Browser Supabase client.
 *
 * Put `.env.local` in the project root, beside package.json:
 *   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_KEY
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_KEY
 *
 * The anon key is used when it is set. The publishable key is the fallback.
 * Restart `npm run dev` after changing env vars. Next.js only reads them at startup.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ""
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ""
const key = anonKey || publishableKey

function readConfigError(): string | null {
  if (!url) {
    return "Missing NEXT_PUBLIC_SUPABASE_URL. Add it to .env.local in the project root, then restart npm run dev."
  }
  if (!key) {
    return "Missing Supabase key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local, then restart npm run dev."
  }
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    return "NEXT_PUBLIC_SUPABASE_URL is invalid. It should look like https://YOUR_PROJECT.supabase.co"
  }
  return null
}

/** Null when the browser client can reach Supabase. Otherwise a short config problem. */
export const supabaseConfigError = readConfigError()

// Log after import so a missing config cannot take down the app while this module loads.
if (typeof window !== "undefined" && supabaseConfigError) {
  const message = supabaseConfigError
  setTimeout(() => {
    console.error(`[Records] ${message}`)
  }, 0)
}

async function browserFetch(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch"
    return new Response(JSON.stringify({ message, code: "network_error" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    })
  }
}

export const supabase = createBrowserClient(
  supabaseConfigError ? "https://placeholder.supabase.co" : url,
  supabaseConfigError ? "placeholder-anon-key" : key,
  supabaseConfigError
    ? { isSingleton: false }
    : { global: { fetch: browserFetch } }
)
