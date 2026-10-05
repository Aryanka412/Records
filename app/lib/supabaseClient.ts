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

async function browserFetch(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch"
    return new Response(
      JSON.stringify({
        message:
          message === "Failed to fetch"
            ? "Could not reach Supabase. Check your connection and try again."
            : message,
        code: "network_error",
      }),
      { status: 503, headers: { "content-type": "application/json" } }
    )
  }
}

/**
 * Browser Supabase client.
 * isSingleton is off so a client created before env vars loaded is not reused.
 * Network failures become a normal auth error instead of a Next.js crash overlay.
 */
export const supabase = createBrowserClient(
  supabaseConfigError ? "https://placeholder.supabase.co" : url!,
  supabaseConfigError ? "placeholder-anon-key" : key!,
  {
    isSingleton: false,
    global: { fetch: browserFetch },
  }
)
