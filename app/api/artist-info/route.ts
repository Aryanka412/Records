import { resolveSpotifyArtist } from "../../../lib/artistDiscography"
import { readLastfmKey } from "../../../lib/spotify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const INFO_ERROR = "Could not load artist info."

type LastTag = {
  name: string
}

export async function GET(request: Request) {
  const artist = new URL(request.url).searchParams.get("artist")?.trim() ?? ""
  if (!artist) {
    return Response.json({ error: INFO_ERROR }, { status: 400 })
  }

  const lastfmKey = readLastfmKey()
  let spotify: Awaited<ReturnType<typeof resolveSpotifyArtist>> = null
  let spotifyFailed = false

  try {
    spotify = await resolveSpotifyArtist(artist)
  } catch {
    spotifyFailed = true
  }

  let bio = ""
  let listeners = "0"
  let playcount = "0"
  let tags: string[] = []
  let lastfmName = ""

  if (lastfmKey) {
    try {
      const res = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
          spotify?.name || artist
        )}&api_key=${lastfmKey}&format=json`,
        { cache: "no-store" }
      )
      const data = await res.json().catch(() => null)
      if (res.ok && data?.artist && !data.error) {
        const summary = typeof data.artist.bio?.summary === "string" ? data.artist.bio.summary : ""
        bio = summary.replace(/<a[^>]*>.*?<\/a>/g, "").trim()
        listeners = data.artist.stats?.listeners || "0"
        playcount = data.artist.stats?.playcount || "0"
        lastfmName = data.artist.name || ""
        tags = Array.isArray(data.artist.tags?.tag)
          ? data.artist.tags.tag.map((tag: LastTag) => tag.name).slice(0, 5)
          : []
      }
    } catch {
      // Bio is optional when Spotify artist data is available.
    }
  }

  if (!spotify && !bio && !lastfmName) {
    return Response.json({ error: INFO_ERROR }, { status: spotifyFailed ? 502 : 404 })
  }

  return Response.json({
    name: spotify?.name || lastfmName || artist,
    bio: bio || "No artist bio available yet.",
    listeners,
    playcount,
    tags,
    spotifyId: spotify?.id || "",
    image: spotify?.image || "",
    spotify: spotify?.spotify || "",
    followers: spotify?.followers || 0,
    popularity: spotify?.popularity || 0,
    genres: spotify?.genres || [],
  })
}
