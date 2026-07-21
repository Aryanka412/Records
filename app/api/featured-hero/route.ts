import { getFeaturedHeroArtists } from "../../../lib/spotify"

export async function GET() {
  try {
    const artists = await getFeaturedHeroArtists(6)
    return Response.json(artists)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Hero fetch failed"
    return Response.json({ error: "Hero fetch failed", message }, { status: 500 })
  }
}
