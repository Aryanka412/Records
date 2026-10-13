import { missingSpotifyCredentialsBody, searchSpotify, spotifyCredentialsResponse } from "../../../lib/spotify"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.trim()
    const rawLimit = Number(searchParams.get("limit") || 10)
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(1, rawLimit), 10)
      : 10

    if (!q) {
      return Response.json({ error: "Missing search query" }, { status: 400 })
    }

    if (q.length < 2) {
      return Response.json({
        query: q,
        results: [],
        groups: { tracks: [], albums: [], artists: [] },
        total: 0,
      })
    }

    if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

    const results = await searchSpotify(q, limit)

    const groups = {
      tracks: results.filter((item) => item.type === "track").slice(0, 8),
      albums: results.filter((item) => item.type === "album").slice(0, 8),
      artists: results.filter((item) => item.type === "artist").slice(0, 8),
    }

    return Response.json({
      query: q,
      results,
      groups,
      total: results.length,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    const message = error instanceof Error ? error.message : "Search failed"
    return Response.json({ error: message, message }, { status: 500 })
  }
}
