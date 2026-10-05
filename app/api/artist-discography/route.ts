import { getArtistDiscographyQuick, missingSpotifyCredentialsBody, spotifyCredentialsResponse } from "../../../lib/spotify"

export const runtime = "nodejs"
export const maxDuration = 60
export const dynamic = "force-dynamic"

/** Fast: top tracks + all albums (~3-8s) */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const artist = searchParams.get("artist")?.trim()
    const id = searchParams.get("id")?.trim()

    if (!artist || !id) {
      return Response.json({ error: "Missing artist or id" }, { status: 400 })
    }

    if (missingSpotifyCredentialsBody()) return spotifyCredentialsResponse()

    const discography = await getArtistDiscographyQuick(id, artist)
    return Response.json(discography)
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Missing Spotify credentials") {
      return spotifyCredentialsResponse()
    }
    const message = error instanceof Error ? error.message : "Discography fetch failed"
    return Response.json({ error: message, message }, { status: 500 })
  }
}
