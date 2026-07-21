export async function GET() {
  return Response.json({
    hasLastfm: !!process.env.LASTFM_API_KEY,
    hasSpotifyId: !!process.env.SPOTIFY_CLIENT_ID,
    hasSpotifySecret: !!process.env.SPOTIFY_CLIENT_SECRET,
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabasePublishableKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })
}