import {
  getSpotifyToken,
  missingLastfmResponse,
  missingSpotifyCredentialsBody,
  readLastfmKey,
  spotifyCredentialsResponse,
  spotifyFailureMessage,
} from "../../../lib/spotify"

export const runtime = "nodejs"

export async function GET() {
  try {
    const missingLastfm = missingLastfmResponse()
    if (missingLastfm) return missingLastfm

    if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

    const lastKey = readLastfmKey()
    const lastRes = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${lastKey}&format=json&limit=10`,
      { cache: "no-store" }
    )

    const lastData = await lastRes.json().catch(() => null)
    if (!lastRes.ok || (lastData?.error && !lastData?.tracks)) {
      return Response.json(
        { error: spotifyFailureMessage(lastData, "Last.fm request failed") },
        { status: lastRes.ok ? 502 : lastRes.status }
      )
    }

    const rawTracks = lastData?.tracks?.track
    const tracks = Array.isArray(rawTracks)
      ? rawTracks
      : rawTracks
        ? [rawTracks]
        : []

    if (tracks.length === 0) {
      return Response.json([])
    }

    const token = await getSpotifyToken()

    const fullTracks = await Promise.all(
      tracks.map(async (track: {
        name?: string
        artist?: { name?: string }
        playcount?: string
      }) => {
        const name = track?.name || ""
        const artistName = track?.artist?.name || ""
        const q = `${name} ${artistName}`.trim()

        if (!q) {
          return {
            name,
            artist: artistName,
            playcount: track?.playcount || "",
            album: "",
            image: "",
            spotify: "",
          }
        }

        try {
          const searchRes = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
            {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            }
          )

          const searchData = await searchRes.json().catch(() => null)
          const song = searchRes.ok ? searchData?.tracks?.items?.[0] : null

          return {
            name,
            artist: artistName,
            playcount: track?.playcount || "",
            album: song?.album?.name || "",
            image: song?.album?.images?.[0]?.url || "",
            spotify: song?.external_urls?.spotify || "",
          }
        } catch {
          return {
            name,
            artist: artistName,
            playcount: track?.playcount || "",
            album: "",
            image: "",
            spotify: "",
          }
        }
      })
    )

    return Response.json(fullTracks)
  } catch (error) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json(
      {
        error: message || "Failed to load trending tracks",
        message,
      },
      { status: 500 }
    )
  }
}
