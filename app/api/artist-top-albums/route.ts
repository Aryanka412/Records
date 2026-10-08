import { getSpotifyToken, missingSpotifyCredentialsBody, spotifyCredentialsResponse, spotifyFailureMessage } from "../../../lib/spotify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const artist = searchParams.get("artist")?.trim()

  if (!artist) {
    return Response.json({ error: "Missing artist" }, { status: 400 })
  }

  if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

  try {
    const token = await getSpotifyToken()

    const artistRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    )
    const artistData = await safeJson(artistRes)
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

    const albumRes = await fetch(
      `https://api.spotify.com/v1/artists/${foundArtist.id}/albums?include_groups=album,single&market=CA&limit=50`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    )
    const albumData = await safeJson(albumRes)
    if (!albumRes.ok) {
      return Response.json(
        { error: spotifyFailureMessage(albumData, "Spotify search failed") },
        { status: albumRes.status }
      )
    }

    let albums =
      albumData?.items?.map((album: {
        name: string
        artists?: { name: string }[]
        images?: { url: string }[]
        external_urls?: { spotify: string }
        release_date?: string
        total_tracks?: number
        album_type?: string
      }) => ({
        name: album.name,
        artist: album.artists?.[0]?.name || foundArtist.name,
        image: album.images?.[0]?.url || "",
        spotify: album.external_urls?.spotify || "",
        release_date: album.release_date || "",
        total_tracks: album.total_tracks || 0,
        album_type: album.album_type || "album",
      })) || []

    if (albums.length === 0) {
      const backupRes = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(`artist:${foundArtist.name}`)}&type=album&limit=20&market=CA`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      )
      const backupData = await safeJson(backupRes)

      albums =
        backupData?.albums?.items?.map((album: {
          name: string
          artists?: { name: string }[]
          images?: { url: string }[]
          external_urls?: { spotify: string }
          release_date?: string
          total_tracks?: number
          album_type?: string
        }) => ({
          name: album.name,
          artist: album.artists?.[0]?.name || foundArtist.name,
          image: album.images?.[0]?.url || "",
          spotify: album.external_urls?.spotify || "",
          release_date: album.release_date || "",
          total_tracks: album.total_tracks || 0,
          album_type: album.album_type || "album",
        })) || []
    }

    const seen = new Set<string>()
    const uniqueAlbums = albums.filter((album: { name: string }) => {
      const key = album.name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return Response.json(uniqueAlbums)
  } catch (error) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    const message = error instanceof Error ? error.message : "Spotify request failed"
    return Response.json({ error: message }, { status: 502 })
  }
}
