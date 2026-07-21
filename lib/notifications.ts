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
