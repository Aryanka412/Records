import { getArtistCatalog, getArtistCatalogById } from "../../../lib/spotify"

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
    const message = error instanceof Error ? error.message : "Catalog fetch failed"
    return Response.json({ error: "Catalog fetch failed", message }, { status: 500 })
  }
}
