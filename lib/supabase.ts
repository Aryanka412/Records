import { createClient } from "@supabase/supabase-js"
import { readSupabaseEnv } from "./supabaseEnv"

const { url, key } = readSupabaseEnv()

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder-anon-key"
)