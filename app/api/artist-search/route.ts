import {
  getSpotifyToken,
  missingLastfmResponse,
  missingSpotifyCredentialsBody,
  readLastfmKey,
  spotifyCredentialsResponse,
  spotifyFailureMessage,
} from "../../../lib/spotify"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""

  if (!q) {
    return Response.json({ error: "Missing artist search query" })
  }

  if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

  const missingLastfm = missingLastfmResponse()
  if (missingLastfm) return missingLastfm

  try {
    const token = await getSpotifyToken()
    const lastfmKey = readLastfmKey()
    const spotifyRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }
    )
    const spotifyData = await spotifyRes.json().catch(() => null)

    if (!spotifyRes.ok) {
      return Response.json(
        { error: spotifyFailureMessage(spotifyData, "Spotify search failed") },
        { status: spotifyRes.status }
      )
    }

    const artist = spotifyData?.artists?.items?.[0]
    if (!artist) {
      return Response.json({ error: "No artist found" })
    }

    const infoRes = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
        artist.name
      )}&api_key=${lastfmKey}&format=json`,
      { cache: "no-store" }
    )
    const infoData = await infoRes.json().catch(() => null)

    if (!infoRes.ok || (infoData?.error && !infoData?.artist)) {
      return Response.json(
        { error: spotifyFailureMessage(infoData, "Last.fm request failed") },
        { status: infoRes.ok ? 502 : infoRes.status }
      )
    }

    const bio = infoData.artist?.bio?.summary || ""
    const cleanBio = bio.replace(/<a[^>]*>.*?<\/a>/g, "").trim()
    const tags =
      infoData.artist?.tags?.tag
        ?.map((tag: { name: string }) => tag.name)
        .slice(0, 5) || []

    return Response.json({
      name: artist.name,
      spotifyId: artist.id,
      image: artist.images?.[0]?.url || "",
      spotify: artist.external_urls?.spotify || "",
      followers: artist.followers?.total || 0,
      popularity: artist.popularity || 0,
      bio: cleanBio || "No artist bio available yet.",
      listeners: infoData.artist?.stats?.listeners || "0",
      playcount: infoData.artist?.stats?.playcount || "0",
      tags,
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    const message = error instanceof Error ? error.message : "Artist search failed"
    return Response.json({ error: message }, { status: 502 })
  }
}
