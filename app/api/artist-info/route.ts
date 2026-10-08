type LastTag = {
  name: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const artist = searchParams.get("artist")?.trim() ?? ""
  const key = process.env.LASTFM_API_KEY?.trim() ?? ""

  if (!artist) {
    return Response.json({ error: "Missing artist" })
  }

  if (!key) {
    return Response.json({ error: "Missing Last.fm API key" }, { status: 500 })
  }

  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(
      artist
    )}&api_key=${key}&format=json`,
    { cache: "no-store" }
  )

  const data = await res.json().catch(() => null)

  if (!res.ok || (data?.error && !data?.artist)) {
    const message =
      typeof data?.message === "string" && data.message.trim()
        ? data.message.trim()
        : "Last.fm request failed"
    return Response.json({ error: message }, { status: res.ok ? 502 : res.status })
  }

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
