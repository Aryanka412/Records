import {
  getSpotifyToken,
  missingSpotifyCredentialsBody,
  spotifyCredentialsResponse,
  spotifyFailureMessage,
} from "../../../lib/spotify"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""

  if (!q) {
    return Response.json({ error: "Missing search query" })
  }

  if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

  try {
    const token = await getSpotifyToken()
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    )
    const data = await searchRes.json().catch(() => null)

    if (!searchRes.ok) {
      return Response.json(
        { error: spotifyFailureMessage(data, "Spotify search failed") },
        { status: searchRes.status }
      )
    }

    const track = data?.tracks?.items?.[0]
    if (!track) {
      return Response.json({ error: "No track found" })
    }

    return Response.json({
      name: track.name,
      artist: track.artists?.[0]?.name,
      album: track.album?.name,
      image: track.album?.images?.[0]?.url,
      spotify: track.external_urls?.spotify,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    const message = error instanceof Error ? error.message : "Spotify request failed"
    return Response.json({ error: message }, { status: 502 })
  }
}
