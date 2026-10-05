import { createBrowserClient } from "@supabase/ssr"

const CONFIG_ELEMENT_ID = "records-supabase-config"

function readConfig(): { url: string; key: string } {
  if (typeof document !== "undefined") {
    const node = document.getElementById(CONFIG_ELEMENT_ID)
    const raw = node?.textContent?.trim()
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { url?: unknown; key?: unknown }
        const url = typeof parsed.url === "string" ? parsed.url.trim() : ""
        const key = typeof parsed.key === "string" ? parsed.key.trim() : ""
        if (url && key) return { url, key }
      } catch {
        // A broken config tag falls through to the build-time values.
      }
    }
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    key:
      (
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )?.trim() ?? "",
  }
}

export function getSupabaseConfigError(): string | null {
  const { url, key } = readConfig()
  if (!url || !key) {
    return "Missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env, then restart the dev server."
  }
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
    return "NEXT_PUBLIC_SUPABASE_URL looks wrong. It should look like https://your-project-id.supabase.co"
  }
  return null
}

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
      { status: 400, headers: { "content-type": "application/json" } }
    )
  }
}

const { url, key } = readConfig()
const configError = getSupabaseConfigError()

/**
 * Browser Supabase client.
 * Config is read from the page before this module is used.
 * A missing config does not log or throw, so the dev overlay cannot open on import.
 */
export const supabase = createBrowserClient(
  configError ? "https://placeholder.supabase.co" : url,
  configError ? "placeholder-anon-key" : key,
  configError ? { isSingleton: false } : { global: { fetch: browserFetch } }
)
