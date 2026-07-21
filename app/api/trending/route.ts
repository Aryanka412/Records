export async function GET() {
  const key = process.env.LASTFM_API_KEY?.trim()

  if (!key) {
    return Response.json({ error: "Missing API key" })
  }

  const url =
    `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${key}&format=json&limit=12`

  const res = await fetch(url)
  const data = await res.json()

  return Response.json(data)
}
