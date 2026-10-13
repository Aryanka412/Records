import {
  fetchArtistDiscography,
  resolveSpotifyArtist,
  type ArtistRelease,
} from "../../../lib/artistDiscography"
import { missingSpotifyCredentialsBody, spotifyCredentialsResponse } from "../../../lib/spotify"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function flatten(releases: ArtistRelease[]) {
  return releases.map((release) => ({
    id: release.id,
    name: release.name,
    artist: release.artist,
    image: release.image,
    spotify: release.spotify,
    release_date: release.release_date,
    year: release.year,
    total_tracks: release.total_tracks,
    album_type: release.album_type,
  }))
}

export async function GET(request: Request) {
  const artist = new URL(request.url).searchParams.get("artist")?.trim() ?? ""
  if (!artist) {
    return Response.json({ error: "Missing artist" }, { status: 400 })
  }
  if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

  try {
    const resolved = await resolveSpotifyArtist(artist)
    if (!resolved) return Response.json([])

    const discography = await fetchArtistDiscography(resolved)
    return Response.json(
      flatten([
        ...discography.albums,
        ...discography.singles,
        ...discography.appearsOn,
        ...discography.compilations,
      ])
    )
  } catch (error) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    return Response.json({ error: "Could not load discography." }, { status: 502 })
  }
}
