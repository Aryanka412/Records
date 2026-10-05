import { getFeaturedHeroArtists, missingSpotifyCredentialsBody, spotifyCredentialsResponse } from "../../../lib/spotify"

export const runtime = "nodejs"

export async function GET() {
  if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

  try {
    const artists = await getFeaturedHeroArtists(6)
    return Response.json(artists)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    const message = error instanceof Error ? error.message : "Hero fetch failed"
    return Response.json({ error: message, message }, { status: 500 })
  }
}
