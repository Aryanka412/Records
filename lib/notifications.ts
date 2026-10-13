import { supabaseRest } from "./db"

export type NotificationType = "like" | "comment" | "follow" | "review"

type CreateNotificationInput = {
  userId: string
  actorId: string | null
  actorUsername: string
  type: NotificationType
  message: string
  reviewType?: "song" | "album" | "artist"
  reviewId?: number
  link?: string
}

export async function createNotification(input: CreateNotificationInput) {
  if (!input.userId || input.actorId === input.userId) {
    return { ok: true, skipped: true }
  }

  return supabaseRest("notifications", {
    method: "POST",
    prefer: "return=representation",
    body: {
      user_id: input.userId,
      actor_id: input.actorId,
      actor_username: input.actorUsername,
      type: input.type,
      message: input.message,
      review_type: input.reviewType || null,
      review_id: input.reviewId || null,
      link: input.link || null,
      read: false,
    },
  })
}

export function createdReviewId(data: unknown): number | null {
  const row = Array.isArray(data) ? data[0] : data

  if (!row || typeof row !== "object" || !("id" in row)) return null

  const id = Number((row as { id: unknown }).id)
  return Number.isFinite(id) ? id : null
}

type ReviewNotice = {
  authorId: string | null
  authorUsername: string
  reviewType: "song" | "album" | "artist"
  reviewId: number
  title: string
  artist?: string
}

function reviewLink(input: ReviewNotice) {
  if (input.reviewType === "song") {
    return `/song/${encodeURIComponent(`${input.title} ${input.artist || ""}`.trim())}`
  }

  if (input.reviewType === "album") {
    return `/album/${encodeURIComponent(`${input.title} ${input.artist || ""}`.trim())}`
  }

  return `/artist/${encodeURIComponent(input.title)}`
}

export async function notifyFollowersOfReview(input: ReviewNotice) {
  if (!input.authorId || !Number.isFinite(input.reviewId)) return

  const followers = await supabaseRest<Array<{ follower_id: string }>>(
    `follows?select=follower_id&following_id=eq.${input.authorId}`
  )

  if (!followers.ok || !Array.isArray(followers.data) || followers.data.length === 0) {
    return
  }

  const actorName = await getActorUsername(input.authorId, input.authorUsername || "Someone")
  const subject = input.title?.trim() || "something new"
  const message = `${actorName} reviewed ${subject}`
  const link = reviewLink(input)

  const rows = followers.data
    .map((row) => row.follower_id)
    .filter((id) => id && id !== input.authorId)
    .map((id) => ({
      user_id: id,
      actor_id: input.authorId,
      actor_username: actorName,
      type: "review" as const,
      message,
      review_type: input.reviewType,
      review_id: input.reviewId,
      link,
      read: false,
    }))

  if (rows.length === 0) return

  await supabaseRest("notifications", {
    method: "POST",
    prefer: "return=minimal",
    body: rows,
  })
}

export async function getActorUsername(userId: string | null, fallback: string) {
  if (!userId) return fallback

  const result = await supabaseRest<Array<{ username: string }>>(
    `profiles?select=username&id=eq.${userId}&limit=1`
  )

  if (result.ok && Array.isArray(result.data) && result.data[0]?.username) {
    return result.data[0].username
  }

  return fallback
}
