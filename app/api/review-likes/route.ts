import { getReviewOwner, type ReviewType } from "../../../lib/db"
import { createNotification, getActorUsername } from "../../../lib/notifications"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    if (!url || !key) {
      return Response.json({ error: "Missing Supabase keys" }, { status: 500 })
    }

    const res = await fetch(
      `${url}/rest/v1/review_likes?select=*&order=created_at.desc`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      }
    )

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
      return Response.json({ error: "Missing Supabase keys" }, { status: 500 })
    }

    const body = await request.json()

    if (!body.review_type || !body.review_id || !body.user_id) {
      return Response.json(
        { error: "Missing review_type, review_id, or user_id" },
        { status: 400 }
      )
    }

    const res = await fetch(`${url}/rest/v1/review_likes`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        review_type: body.review_type,
        review_id: body.review_id,
        user_id: body.user_id,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return Response.json({ error: JSON.stringify(data) }, { status: 500 })
    }

    const owner = await getReviewOwner(body.review_type as ReviewType, Number(body.review_id))

    if (owner?.user_id) {
      const actorName = await getActorUsername(body.user_id, "Someone")
      await createNotification({
        userId: owner.user_id,
        actorId: body.user_id,
        actorUsername: actorName,
        type: "like",
        message: `${actorName} liked your review`,
        reviewType: body.review_type,
        reviewId: Number(body.review_id),
        link: owner.link,
      })
    }

    return Response.json({
      success: true,
      data: data,
    })
  } catch (error: any) {
    return Response.json(
      {
        error: "Like failed",
        message: error?.message,
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    if (!url || !key) {
      return Response.json({ error: "Missing Supabase keys" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const reviewType = searchParams.get("review_type")
    const reviewId = searchParams.get("review_id")
    const userId = searchParams.get("user_id")

    if (!reviewType || !reviewId || !userId) {
      return Response.json(
        { error: "Missing review_type, review_id, or user_id" },
        { status: 400 }
      )
    }

    const res = await fetch(
      `${url}/rest/v1/review_likes?review_type=eq.${reviewType}&review_id=eq.${reviewId}&user_id=eq.${userId}`,
      {
        method: "DELETE",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Prefer: "return=representation",
        },
      }
    )

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
        error: "Unlike failed",
        message: error?.message,
      },
      { status: 500 }
    )
  }
}