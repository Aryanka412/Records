import { supabaseRest } from "../../../lib/db"

type CommentRow = {
  id: number
  post_id: number
  user_id: string | null
  username: string
  comment: string
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

export async function GET(request: Request) {
  try {
    const postId = new URL(request.url).searchParams.get("post_id")?.trim() || ""
    if (!postId) {
      return Response.json({ error: "Missing post_id" }, { status: 400 })
    }

    const result = await supabaseRest<CommentRow[]>(
      `community_comments?select=*&post_id=eq.${encodeURIComponent(postId)}&order=created_at.asc`
    )
    if (!result.ok) {
      return Response.json(
        { error: restMessage(result.data, "Could not load comments.") },
        { status: 500 }
      )
    }

    return Response.json(asArray<CommentRow>(result.data))
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load comments."
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const postId = Number(body?.post_id)
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : ""
    const username = typeof body?.username === "string" ? body.username.trim() : "Anonymous"
    const comment = typeof body?.comment === "string" ? body.comment.trim() : ""

    if (!postId || !userId) {
      return Response.json({ error: "Log in to comment." }, { status: 401 })
    }
    if (!comment) {
      return Response.json({ error: "Write a comment first." }, { status: 400 })
    }

    const created = await supabaseRest<CommentRow[]>("community_comments", {
      method: "POST",
      prefer: "return=representation",
      body: {
        post_id: postId,
        user_id: userId,
        username: username || "Anonymous",
        comment,
      },
    })

    if (!created.ok) {
      return Response.json(
        { error: restMessage(created.data, "Could not add comment.") },
        { status: created.status || 500 }
      )
    }

    const row = asArray<CommentRow>(created.data)[0]
    if (!row) {
      return Response.json({ error: "Could not add comment." }, { status: 500 })
    }

    return Response.json(row)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not add comment."
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id")?.trim() || ""
    const userId = new URL(request.url).searchParams.get("user_id")?.trim() || ""
    if (!id) {
      return Response.json({ error: "Missing comment id" }, { status: 400 })
    }

    const filter = userId
      ? `community_comments?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`
      : `community_comments?id=eq.${encodeURIComponent(id)}`

    const removed = await supabaseRest(filter, {
      method: "DELETE",
      prefer: "return=representation",
    })

    if (!removed.ok) {
      return Response.json(
        { error: restMessage(removed.data, "Could not delete comment.") },
        { status: removed.status || 500 }
      )
    }

    if (asArray(removed.data).length === 0) {
      return Response.json({ error: "Comment not found" }, { status: 404 })
    }

    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete comment."
    return Response.json({ error: message }, { status: 500 })
  }
}
