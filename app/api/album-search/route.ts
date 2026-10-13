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
    return Response.json({ error: "Missing album search query" })
  }

  if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

  try {
    const token = await getSpotifyToken()
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=1`,
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

    const album = data?.albums?.items?.[0]
    if (!album) {
      return Response.json({ error: "No album found" })
    }

    return Response.json({
      name: album.name,
      artist: album.artists?.[0]?.name || "Unknown artist",
      image: album.images?.[0]?.url || "",
      spotify: album.external_urls?.spotify || "",
      release_date: album.release_date || "",
      total_tracks: album.total_tracks || 0,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    const message = error instanceof Error ? error.message : "Spotify request failed"
    return Response.json({ error: message }, { status: 502 })
  }
}
