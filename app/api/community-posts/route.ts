import { supabaseRest } from "../../../lib/db"

const POST_TYPES = [
  "Discussion",
  "Review",
  "Rating",
  "Ranking",
  "Debate",
  "Recommendation",
  "News",
  "Question",
  "Hot Take",
]

type PostRow = {
  id: number
  community_id: number
  user_id: string | null
  username: string
  title: string
  body: string
  post_type: string
  rating: number | null
  related_artist: string | null
  related_album: string | null
  related_song: string | null
  created_at: string
}

function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? data : []
}

function restMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback
  const record = data as { message?: unknown; error?: unknown }
  if (typeof record.message === "string" && record.message.trim()) return record.message
  if (typeof record.error === "string" && record.error.trim()) return record.error
  return fallback
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

export async function GET(request: Request) {
  try {
    const communityId = new URL(request.url).searchParams.get("community_id")?.trim() || ""
    if (!communityId) {
      return Response.json({ error: "Missing community_id" }, { status: 400 })
    }

    const postsResult = await supabaseRest<PostRow[]>(
      `community_posts?select=*&community_id=eq.${encodeURIComponent(communityId)}&order=created_at.desc`
    )
    if (!postsResult.ok) {
      return Response.json(
        { error: restMessage(postsResult.data, "Could not load posts.") },
        { status: 500 }
      )
    }

    const posts = asArray<PostRow>(postsResult.data)
    const ids = posts.map((post) => post.id).join(",")
    const commentCounts = new Map<number, number>()

    if (ids) {
      const commentsResult = await supabaseRest<Array<{ post_id: number }>>(
        `community_comments?select=post_id&post_id=in.(${ids})`
      )
      for (const row of asArray<{ post_id: number }>(commentsResult.data)) {
        commentCounts.set(row.post_id, (commentCounts.get(row.post_id) || 0) + 1)
      }
    }

    return Response.json(
      posts.map((post) => ({
        ...post,
        comment_count: commentCounts.get(post.id) || 0,
      }))
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load posts."
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const communityId = Number(body?.community_id)
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : ""
    const username = typeof body?.username === "string" ? body.username.trim() : "Anonymous"
    const title = typeof body?.title === "string" ? body.title.trim() : ""
    const text = typeof body?.body === "string" ? body.body.trim() : ""
    const postType = POST_TYPES.includes(body?.post_type) ? body.post_type : "Discussion"
    const ratingValue = body?.rating === "" || body?.rating == null ? null : Number(body.rating)
    const rating =
      ratingValue != null && Number.isFinite(ratingValue) && ratingValue >= 0 && ratingValue <= 10
        ? ratingValue
        : null

    if (!communityId || !userId) {
      return Response.json({ error: "Log in to post in a community." }, { status: 401 })
    }
    if (!title) {
      return Response.json({ error: "A title is required." }, { status: 400 })
    }

    const membership = await supabaseRest<Array<{ id: number }>>(
      `community_members?select=id&community_id=eq.${communityId}&user_id=eq.${encodeURIComponent(userId)}&limit=1`
    )
    if (asArray(membership.data).length === 0) {
      return Response.json({ error: "Join this community before posting." }, { status: 403 })
    }

    const created = await supabaseRest<PostRow[]>("community_posts", {
      method: "POST",
      prefer: "return=representation",
      body: {
        community_id: communityId,
        user_id: userId,
        username: username || "Anonymous",
        title,
        body: text,
        post_type: postType,
        rating,
        related_artist: optionalText(body?.related_artist),
        related_album: optionalText(body?.related_album),
        related_song: optionalText(body?.related_song),
      },
    })

    if (!created.ok) {
      return Response.json(
        { error: restMessage(created.data, "Could not create post.") },
        { status: created.status || 500 }
      )
    }

    const post = asArray<PostRow>(created.data)[0]
    if (!post) {
      return Response.json({ error: "Could not create post." }, { status: 500 })
    }

    return Response.json({ ...post, comment_count: 0 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create post."
    return Response.json({ error: message }, { status: 500 })
  }
}
