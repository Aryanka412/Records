export async function GET() {
  try {
    const lastKey = process.env.LASTFM_API_KEY?.trim()
    const id = process.env.SPOTIFY_CLIENT_ID
    const secret = process.env.SPOTIFY_CLIENT_SECRET

    if (!lastKey || !id || !secret) {
      return Response.json({ error: "Missing keys" }, { status: 500 })
    }

    const lastRes = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=chart.gettoptracks&api_key=${lastKey}&format=json&limit=10`
    )

    let lastData: any = null
    try {
      lastData = await lastRes.json()
    } catch {
      return Response.json(
        { error: "Invalid Last.fm response" },
        { status: 502 }
      )
    }

    if (!lastRes.ok) {
      return Response.json(
        { error: "Last.fm request failed" },
        { status: 502 }
      )
    }

    const rawTracks = lastData?.tracks?.track
    const tracks = Array.isArray(rawTracks)
      ? rawTracks
      : rawTracks
        ? [rawTracks]
        : []

    if (tracks.length === 0) {
      return Response.json([])
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

    let tokenData: any = null
    try {
      tokenData = await tokenRes.json()
    } catch {
      return Response.json(
        { error: "Invalid Spotify token response" },
        { status: 502 }
      )
    }

    if (!tokenRes.ok || !tokenData?.access_token) {
      return Response.json(
        { error: "Spotify token request failed" },
        { status: 502 }
      )
    }

    const fullTracks = await Promise.all(
      tracks.map(async (track: any) => {
        const name = track?.name || ""
        const artistName = track?.artist?.name || ""
        const q = `${name} ${artistName}`.trim()

        if (!q) {
          return {
            name,
            artist: artistName,
            playcount: track?.playcount || "",
            album: "",
            image: "",
            spotify: "",
          }
        }

        try {
          const searchRes = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
              },
            }
          )

          const searchData = await searchRes.json().catch(() => null)
          const song = searchData?.tracks?.items?.[0]

          return {
            name,
            artist: artistName,
            playcount: track?.playcount || "",
            album: song?.album?.name || "",
            image: song?.album?.images?.[0]?.url || "",
            spotify: song?.external_urls?.spotify || "",
          }
        } catch {
          return {
            name,
            artist: artistName,
            playcount: track?.playcount || "",
            album: "",
            image: "",
            spotify: "",
          }
        }
      })
    )

    return Response.json(fullTracks)
  } catch (error: any) {
    return Response.json(
      {
        error: "Failed to load trending tracks",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    )
  }
}
