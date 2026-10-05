import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Browser Supabase client.
 *
 * Put `.env.local` in the project root, beside package.json, then restart `npm run dev`.
 * Next.js only reads env files at startup.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_KEY
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_KEY
 *   SPOTIFY_CLIENT_ID=YOUR_SPOTIFY_ID
 *   SPOTIFY_CLIENT_SECRET=YOUR_SPOTIFY_SECRET
 *   LASTFM_API_KEY=YOUR_LASTFM_KEY
 *
 * The anon key is used when it is set. The publishable key is the fallback.
 * Direct `process.env.NEXT_PUBLIC_*` reads are inlined when the client bundle is
 * compiled. The root layout also prints the live server values into
 * `#records-supabase-config`, so a bundle compiled before `.env.local` existed
 * can still reach Supabase. A missing config is logged once after this module
 * finishes loading, so the import itself does not crash the page.
 */

type PublicConfig = { url: string; key: string }

function inlineConfig(): PublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ""
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? ""
  return { url, key: anonKey || publishableKey }
}

function scriptConfig(): PublicConfig | null {
  if (typeof document === "undefined") return null
  const node = document.getElementById("records-supabase-config")
  if (!node?.textContent) return null
  try {
    const parsed = JSON.parse(node.textContent) as { url?: unknown; key?: unknown }
    const url = typeof parsed.url === "string" ? parsed.url.trim() : ""
    const key = typeof parsed.key === "string" ? parsed.key.trim() : ""
    if (!url && !key) return null
    return { url, key }
  } catch {
    return null
  }
}

export function readBrowserSupabaseConfig(): PublicConfig {
  const inline = inlineConfig()
  const fromScript = scriptConfig()
  return {
    url: inline.url || fromScript?.url || "",
    key: inline.key || fromScript?.key || "",
  }
}

export function getSupabaseConfigError(): string | null {
  const { url, key } = readBrowserSupabaseConfig()
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

/**
 * Null when the browser client can reach Supabase. Otherwise a short config problem.
 * Call getSupabaseConfigError() after the page has mounted so the layout script is available.
 */
export const supabaseConfigError: string | null = getSupabaseConfigError()

let reportedSupabaseConfigError = false

if (typeof setTimeout === "function") {
  setTimeout(() => {
    if (reportedSupabaseConfigError) return
    const message = getSupabaseConfigError()
    if (!message) return
    reportedSupabaseConfigError = true
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

let browserClient: SupabaseClient | undefined

function getBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const { url, key } = readBrowserSupabaseConfig()
  const configError = getSupabaseConfigError()
  browserClient = configError
    ? createBrowserClient("https://placeholder.supabase.co", "placeholder-anon-key", {
        isSingleton: false,
      })
    : createBrowserClient(url, key, { global: { fetch: browserFetch } })

  return browserClient
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getBrowserClient()
    const value = Reflect.get(client, prop, client)
    return typeof value === "function" ? value.bind(client) : value
  },
})
