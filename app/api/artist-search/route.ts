export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")

  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  const lastfmKey = process.env.LASTFM_API_KEY

  if (!q) {
    return Response.json({ error: "Missing artist search query" })
  }

  if (!id || !secret || !lastfmKey) {
    return Response.json({ error: "Missing API keys" })
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

  const spotifyRes = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=artist&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  )

  const spotifyData = await spotifyRes.json()
  const artist = spotifyData.artists?.items?.[0]

  if (!artist) {
    return Response.json({ error: "No artist found" })
  }

  const infoRes = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
      artist.name
    )}&api_key=${lastfmKey}&format=json`
  )

  const infoData = await infoRes.json()

  const bio = infoData.artist?.bio?.summary || ""
  const cleanBio = bio.replace(/<a[^>]*>.*?<\/a>/g, "").trim()

  const tags =
    infoData.artist?.tags?.tag
      ?.map((tag: { name: string }) => tag.name)
      .slice(0, 5) || []

  return Response.json({
    name: artist.name,
    spotifyId: artist.id,
    image: artist.images?.[0]?.url || "",
    spotify: artist.external_urls?.spotify || "",
    followers: artist.followers?.total || 0,
    popularity: artist.popularity || 0,
    bio: cleanBio || "No artist bio available yet.",
    listeners: infoData.artist?.stats?.listeners || "0",
    playcount: infoData.artist?.stats?.playcount || "0",
    tags,
  })
}