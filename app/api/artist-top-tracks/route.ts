import { fetchArtistTopTracks, resolveSpotifyArtist } from "../../../lib/artistDiscography"
import { missingSpotifyCredentialsBody, spotifyCredentialsResponse } from "../../../lib/spotify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const artist = new URL(request.url).searchParams.get("artist")?.trim() ?? ""
  if (!artist) {
    return Response.json({ error: "Missing artist" }, { status: 400 })
  }
  if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

  try {
    const resolved = await resolveSpotifyArtist(artist)
    if (!resolved) return Response.json([])

    const result = await fetchArtistTopTracks(resolved)
    return Response.json(result)
  } catch (error) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    return Response.json({ error: "Could not load popular songs." }, { status: 502 })
  }
}
