export type SupabasePublicConfig = {
  url: string
  key: string
}

/**
 * Read Supabase settings from the running server process.
 * Computed access stays live in dev, so a client bundle compiled before `.env`
 * existed can still receive the keys from the layout.
 */
export function readSupabaseEnv(): SupabasePublicConfig {
  const env = process.env
  const url = env["NEXT_PUBLIC_SUPABASE_URL"]?.trim() ?? ""
  const key = (
    env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||
    env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ||
    ""
  ).trim()

  return { url, key }
}
