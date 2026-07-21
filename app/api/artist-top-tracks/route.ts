export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const artist = searchParams.get("artist")

  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET

  if (!artist) {
    return Response.json({ error: "Missing artist" })
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

  const artistRes = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  )

  const artistData = await artistRes.json()
  const foundArtist = artistData.artists?.items?.[0]

  if (!foundArtist) {
    return Response.json([])
  }

  const tracksRes = await fetch(
    `https://api.spotify.com/v1/artists/${foundArtist.id}/top-tracks?market=CA`,
    {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    }
  )

  const tracksData = await tracksRes.json()

  let tracks =
    tracksData.tracks?.slice(0, 10).map((track: any) => ({
      name: track.name,
      artist: track.artists?.[0]?.name || foundArtist.name,
      album: track.album?.name || "",
      image: track.album?.images?.[0]?.url || "",
      spotify: track.external_urls?.spotify || "",
      duration_ms: track.duration_ms || 0,
    })) || []

  if (tracks.length === 0) {
    const backupRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        `artist:${foundArtist.name}`
      )}&type=track&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    )

    const backupData = await backupRes.json()

    tracks =
      backupData.tracks?.items?.map((track: any) => ({
        name: track.name,
        artist: track.artists?.[0]?.name || foundArtist.name,
        album: track.album?.name || "",
        image: track.album?.images?.[0]?.url || "",
        spotify: track.external_urls?.spotify || "",
        duration_ms: track.duration_ms || 0,
      })) || []
  }

  return Response.json(tracks)
}