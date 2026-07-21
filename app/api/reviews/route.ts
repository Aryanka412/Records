const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET(request: Request) {
  try {
    if (!url || !key) {
      return Response.json({
        error: "Missing Supabase keys",
        hasUrl: !!url,
        hasKey: !!key,
      })
    }

    const { searchParams } = new URL(request.url)
    const song = searchParams.get("song")

    let query = `${url}/rest/v1/reviews?select=*&order=created_at.desc`

    if (song) {
      query += `&song_name=eq.${encodeURIComponent(song)}`
    }

    const res = await fetch(query, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })

    const data = await res.json()

    if (!res.ok) {
      return Response.json({ error: JSON.stringify(data) }, { status: 500 })
    }

    return Response.json(data)
  } catch (error: any) {
    return Response.json(
      {
        error: "Fetch failed",
        message: error?.message,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    if (!url || !key) {
      return Response.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      )
    }

    const body = await request.json()

    const res = await fetch(`${url}/rest/v1/reviews`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        song_name: body.song_name,
        artist: body.artist,
        album: body.album,
        image: body.image,
        spotify: body.spotify,
        rating: body.rating,
        review: body.review,
        username: body.username || "Anonymous",
        user_id: body.user_id || null,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return Response.json({ error: JSON.stringify(data) }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: data,
    })
  } catch (error: any) {
    return Response.json(
      {
        error: "Fetch failed",
        message: error?.message,
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    if (!url || !key) {
      return Response.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return Response.json(
        { error: "Missing review id" },
        { status: 400 }
      )
    }

    const res = await fetch(`${url}/rest/v1/reviews?id=eq.${id}`, {
      method: "DELETE",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=representation",
      },
    })

    const data = await res.json()

    if (!res.ok) {
      return Response.json({ error: JSON.stringify(data) }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: data,
    })
  } catch (error: any) {
    return Response.json(
      {
        error: "Delete failed",
        message: error?.message,
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    if (!url || !key) {
      return Response.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      )
    }

    const body = await request.json()

    if (!body.id) {
      return Response.json(
        { error: "Missing review id" },
        { status: 400 }
      )
    }

    const res = await fetch(`${url}/rest/v1/reviews?id=eq.${body.id}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        rating: body.rating,
        review: body.review,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return Response.json({ error: JSON.stringify(data) }, { status: 500 })
    }

    return Response.json({
      success: true,
      data: data,
    })
  } catch (error: any) {
    return Response.json(
      {
        error: "Update failed",
        message: error?.message,
      },
      { status: 500 }
    )
  }
}