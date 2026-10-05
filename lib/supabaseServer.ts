import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { readSupabaseEnv } from "./supabaseEnv"

export const CONNECTION_MESSAGE =
  "Could not connect to Supabase. Check your Supabase URL/key and restart npm run dev."

export const CONFIG_MESSAGE = "Supabase is not configured. Check your .env.local file."

export function getSupabaseServerConfigError(): string | null {
  const { url, key } = readSupabaseEnv()
  if (!url || !key) return CONFIG_MESSAGE
  if (!url.startsWith("https://") || !url.includes(".supabase.co")) return CONFIG_MESSAGE
  return null
}

export function cleanSupabaseMessage(message: string, fallback: string) {
  if (message === "Failed to fetch" || message.includes("Failed to fetch")) {
    return CONNECTION_MESSAGE
  }
  return message || fallback
}

/** Server Supabase client. Login runs here so the browser does not call Supabase itself. */
export async function createAuthServerClient() {
  const { url, key } = readSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options)
        })
      },
    },
  })
}
