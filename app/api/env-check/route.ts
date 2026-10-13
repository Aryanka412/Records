/**
 * Local debug only. Reports whether `.env.local` (beside package.json) has each
 * value. It never returns the values themselves.
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_KEY
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_KEY
 *   SPOTIFY_CLIENT_ID=YOUR_SPOTIFY_ID
 *   SPOTIFY_CLIENT_SECRET=YOUR_SPOTIFY_SECRET
 *   LASTFM_API_KEY=YOUR_LASTFM_KEY
 *
 * Restart `npm run dev` after changing the file.
 */
function has(name: string) {
  return Boolean(process.env[name]?.trim())
}

export async function GET() {
  return Response.json({
    hasSupabaseUrl: has("NEXT_PUBLIC_SUPABASE_URL"),
    hasSupabaseAnonKey: has("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    hasSupabasePublishableKey: has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    hasSpotifyClientId: has("SPOTIFY_CLIENT_ID"),
    hasSpotifyClientSecret: has("SPOTIFY_CLIENT_SECRET"),
    hasLastfmKey: has("LASTFM_API_KEY"),
  })
}
