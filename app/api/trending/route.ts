export async function GET() {
  const key = process.env.LASTFM_API_KEY?.trim() ?? ""

  if (!key) {
    return Response.json({ error: "Missing Last.fm API key" }, { status: 500 })
  }

  const url =
    `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${key}&format=json&limit=12`

  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json().catch(() => null)

  if (!res.ok || (data?.error && !data?.tracks)) {
    const message =
      typeof data?.message === "string" && data.message.trim()
        ? data.message.trim()
        : "Last.fm request failed"
    return Response.json({ error: message }, { status: res.ok ? 502 : res.status })
  }

  return Response.json(data)
}
