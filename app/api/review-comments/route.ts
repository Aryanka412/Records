import { getReviewOwner, supabaseRest, type ReviewType } from "../../../lib/db"
import { createNotification, getActorUsername } from "../../../lib/notifications"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reviewType = searchParams.get("review_type")
    const reviewId = searchParams.get("review_id")

    let path = "review_comments?select=*&order=created_at.asc"

    if (reviewType && reviewId) {
      path += `&review_type=eq.${reviewType}&review_id=eq.${reviewId}`
    }

    const result = await supabaseRest(path)

    if (!result.ok) {
      return Response.json({ error: JSON.stringify(result.data) }, { status: 500 })
    }

    return Response.json(result.data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fetch failed"
    return Response.json({ error: "Fetch failed", message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.review_type || !body.review_id || !body.comment?.trim()) {
      return Response.json(
        { error: "Missing review_type, review_id, or comment" },
        { status: 400 }
      )
    }

    const result = await supabaseRest("review_comments", {
      method: "POST",
      prefer: "return=representation",
      body: {
        review_type: body.review_type,
        review_id: body.review_id,
        user_id: body.user_id || null,
        username: body.username || "Anonymous",
        comment: body.comment.trim(),
      },
    })

    if (!result.ok) {
      return Response.json({ error: JSON.stringify(result.data) }, { status: 500 })
    }

    const owner = await getReviewOwner(body.review_type as ReviewType, Number(body.review_id))

    if (owner?.user_id) {
      const actorName = await getActorUsername(body.user_id || null, body.username || "Someone")
      await createNotification({
        userId: owner.user_id,
        actorId: body.user_id || null,
        actorUsername: actorName,
        type: "comment",
        message: `${actorName} commented on your review`,
        reviewType: body.review_type,
        reviewId: Number(body.review_id),
        link: owner.link,
      })
    }

    return Response.json({ success: true, data: result.data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Comment failed"
    return Response.json({ error: "Comment failed", message }, { status: 500 })
  }
}
