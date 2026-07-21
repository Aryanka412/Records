export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")

  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET

  if (!q) {
    return Response.json({ error: "Missing search query" })
  }

  if (!id || !secret) {
    return Response.json({ error: "Missing Spotify keys" })
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(id + ":" + secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  const tokenData = await tokenRes.json()

  const searchRes = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  )

  const data = await searchRes.json()
  const track = data.tracks?.items?.[0]

  if (!track) {
    return Response.json({ error: "No track found" })
  }

  return Response.json({
    name: track.name,
    artist: track.artists?.[0]?.name,
    album: track.album?.name,
    image: track.album?.images?.[0]?.url,
    spotify: track.external_urls?.spotify,
  })
}
