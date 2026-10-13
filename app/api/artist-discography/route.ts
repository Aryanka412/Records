import {
  MAX_RELEASES_PER_GROUP,
  fetchArtistDiscography,
  resolveSpotifyArtist,
} from "../../../lib/artistDiscography"
import { missingSpotifyCredentialsBody, spotifyCredentialsResponse } from "../../../lib/spotify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  const artist = new URL(request.url).searchParams.get("artist")?.trim() ?? ""
  if (!artist) {
    return Response.json({ error: "Missing artist" }, { status: 400 })
  }
  if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

  try {
    const resolved = await resolveSpotifyArtist(artist)
    if (!resolved) {
      return Response.json({ error: "Could not load artist info." }, { status: 404 })
    }

    const discography = await fetchArtistDiscography(resolved)
    return Response.json({
      artist: resolved,
      ...discography,
      limitPerGroup: MAX_RELEASES_PER_GROUP,
      counts: {
        albums: discography.albums.length,
        singles: discography.singles.length,
        appearsOn: discography.appearsOn.length,
        compilations: discography.compilations.length,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    return Response.json({ error: "Could not load discography." }, { status: 502 })
  }
}
