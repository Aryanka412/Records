import {
  getSpotifyToken,
  missingSpotifyCredentialsBody,
  spotifyCredentialsResponse,
  spotifyFailureMessage,
} from "../../../lib/spotify"

export const runtime = "nodejs"

type SpotifyTrack = {
  name: string
  artists?: { name: string }[]
  album?: { name?: string; images?: { url: string }[] }
  external_urls?: { spotify?: string }
  duration_ms?: number
}

function mapTrack(track: SpotifyTrack, fallbackArtist: string) {
  return {
    name: track.name,
    artist: track.artists?.[0]?.name || fallbackArtist,
    album: track.album?.name || "",
    image: track.album?.images?.[0]?.url || "",
    spotify: track.external_urls?.spotify || "",
    duration_ms: track.duration_ms || 0,
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const artist = searchParams.get("artist")?.trim() ?? ""

  if (!artist) {
    return Response.json({ error: "Missing artist" })
  }

  if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

  try {
    const token = await getSpotifyToken()
    const artistRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    )
    const artistData = await artistRes.json().catch(() => null)

    if (!artistRes.ok) {
      return Response.json(
        { error: spotifyFailureMessage(artistData, "Spotify search failed") },
        { status: artistRes.status }
      )
    }

    const foundArtist = artistData?.artists?.items?.[0]
    if (!foundArtist) {
      return Response.json([])
    }

    const tracksRes = await fetch(
      `https://api.spotify.com/v1/artists/${foundArtist.id}/top-tracks?market=CA`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    )
    const tracksData = await tracksRes.json().catch(() => null)

    if (!tracksRes.ok) {
      return Response.json(
        { error: spotifyFailureMessage(tracksData, "Spotify search failed") },
        { status: tracksRes.status }
      )
    }

    let tracks = (tracksData?.tracks?.slice(0, 10) || []).map((track: SpotifyTrack) =>
      mapTrack(track, foundArtist.name)
    )

    if (tracks.length === 0) {
      const backupRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(
          `artist:${foundArtist.name}`
        )}&type=track&limit=10`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      )
      const backupData = await backupRes.json().catch(() => null)

      if (!backupRes.ok) {
        return Response.json(
          { error: spotifyFailureMessage(backupData, "Spotify search failed") },
          { status: backupRes.status }
        )
      }

      tracks = (backupData?.tracks?.items || []).map((track: SpotifyTrack) =>
        mapTrack(track, foundArtist.name)
      )
    }

    return Response.json(tracks)
  } catch (error) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    const message = error instanceof Error ? error.message : "Spotify request failed"
    return Response.json({ error: message }, { status: 502 })
  }
}
