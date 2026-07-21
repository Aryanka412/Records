export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")

  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET

  if (!q) {
    return Response.json({ error: "Missing album search query" })
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
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=album&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  )

  const data = await searchRes.json()
  const album = data.albums?.items?.[0]

  if (!album) {
    return Response.json({ error: "No album found" })
  }

  return Response.json({
    name: album.name,
    artist: album.artists?.[0]?.name || "Unknown artist",
    image: album.images?.[0]?.url || "",
    spotify: album.external_urls?.spotify || "",
    release_date: album.release_date || "",
    total_tracks: album.total_tracks || 0,
  })
}