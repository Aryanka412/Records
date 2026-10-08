import { getArtistCatalog, getArtistCatalogById, missingSpotifyCredentialsBody, spotifyCredentialsResponse } from "../../../lib/spotify"

export const runtime = "nodejs"
export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const artist = searchParams.get("artist")?.trim()
    const id = searchParams.get("id")?.trim()

    if (!artist && !id) {
      return Response.json({ error: "Missing artist" }, { status: 400 })
    }

    if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

    const catalog =
      id && artist
        ? await getArtistCatalogById(id, artist)
        : artist
          ? await getArtistCatalog(artist)
          : null

    if (!catalog) {
      return Response.json({ error: "Artist not found on Spotify" }, { status: 404 })
    }

    return Response.json(catalog)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    const message = error instanceof Error ? error.message : "Catalog fetch failed"
    return Response.json({ error: message, message }, { status: 500 })
  }
}
