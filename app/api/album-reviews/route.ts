import { createdReviewId, notifyFollowersOfReview } from "../../../lib/notifications"

import { readSupabaseEnv } from "../../../lib/supabaseEnv"

export async function GET(request: Request) {
  try {
    const { url, key } = readSupabaseEnv()
    if (!url || !key) {
      return Response.json({ error: "Missing Supabase keys" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const album = searchParams.get("album")

    let query = `${url}/rest/v1/album_reviews?select=*&order=created_at.desc`

    if (album) {
      query += `&album_name=eq.${encodeURIComponent(album)}`
    }

    const res = await fetch(query, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    })

    const data = await res.json().catch(() => null)

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
    const { url, key } = readSupabaseEnv()
    if (!url || !key) {
      return Response.json({ error: "Missing Supabase keys" }, { status: 500 })
    }

    const body = await request.json()

    const res = await fetch(`${url}/rest/v1/album_reviews`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        album_name: body.album_name,
        artist: body.artist,
        image: body.image,
        spotify: body.spotify,
        rating: body.rating,
        review: body.review,
        username: body.username || "Anonymous",
        user_id: body.user_id || null,
      }),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return Response.json({ error: JSON.stringify(data) }, { status: 500 })
    }

    const reviewId = createdReviewId(data)
    if (reviewId) {
      await notifyFollowersOfReview({
        authorId: body.user_id || null,
        authorUsername: body.username || "Anonymous",
        reviewType: "album",
        reviewId,
        title: body.album_name || "",
        artist: body.artist || "",
      })
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
    const { url, key } = readSupabaseEnv()
    if (!url || !key) {
      return Response.json({ error: "Missing Supabase keys" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return Response.json(
        { error: "Missing review id" },
        { status: 400 }
      )
    }

    const res = await fetch(`${url}/rest/v1/album_reviews?id=eq.${id}`, {
      method: "DELETE",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=representation",
      },
    })

    const data = await res.json().catch(() => null)

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
    const { url, key } = readSupabaseEnv()
    if (!url || !key) {
      return Response.json({ error: "Missing Supabase keys" }, { status: 500 })
    }

    const body = await request.json()

    if (!body.id) {
      return Response.json(
        { error: "Missing review id" },
        { status: 400 }
      )
    }

    const res = await fetch(`${url}/rest/v1/album_reviews?id=eq.${body.id}`, {
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

    const data = await res.json().catch(() => null)

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