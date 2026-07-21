type LastTag = {
  name: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const artist = searchParams.get("artist")
  const key = process.env.LASTFM_API_KEY?.trim()

  if (!artist) {
    return Response.json({ error: "Missing artist" })
  }

  if (!key) {
    return Response.json({ error: "Missing Last.fm key" })
  }

  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
      artist
    )}&api_key=${key}&format=json`
  )

  const data = await res.json()

  const bio = data.artist?.bio?.summary || ""
  const cleanBio = bio.replace(/<a[^>]*>.*?<\/a>/g, "").trim()

  const tags = data.artist?.tags?.tag
    ? data.artist.tags.tag.map((tag: LastTag) => tag.name).slice(0, 5)
    : []

  return Response.json({
    name: data.artist?.name || artist,
    bio: cleanBio || "No artist bio available yet.",
    listeners: data.artist?.stats?.listeners || "0",
    playcount: data.artist?.stats?.playcount || "0",
    tags,
  })
}