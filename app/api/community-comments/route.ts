import { readSupabaseEnv } from "../../../lib/supabaseEnv"

export const dynamic = "force-dynamic"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

function isId(value: string) {
  return /^[0-9]{1,18}$/.test(value)
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return ""
  return value.trim().slice(0, max)
}

function readableError(data: unknown) {
  if (!data || typeof data !== "object") return ""
  const record = data as { message?: string; details?: string; error?: string }
  return record.message || record.details || record.error || ""
}

async function rest(path: string, init?: RequestInit) {
  const { url, key } = readSupabaseEnv()
  if (!url || !key) {
    return {
      ok: false,
      status: 500,
      data: { error: "Missing Supabase environment variables" },
    }
  }

  const headers = new Headers(init?.headers)
  headers.set("apikey", key)
  headers.set("Authorization", `Bearer ${key}`)
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers,
    cache: "no-store",
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, status: res.status, data }
}

function shapeComment(row: Record<string, unknown>) {
  return {
    id: Number(row.id),
    post_id: Number(row.post_id),
    username: typeof row.username === "string" && row.username ? row.username : "Anonymous",
    user_id: typeof row.user_id === "string" ? row.user_id : null,
    comment: typeof row.comment === "string" ? row.comment : "",
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  }
}

export async function GET(request: Request) {
  try {
    const postId = new URL(request.url).searchParams.get("post_id") || ""
    if (!isId(postId)) {
      return Response.json({ error: "Missing post id" }, { status: 400 })
    }

    const result = await rest(
      `community_comments?select=*&post_id=eq.${encodeURIComponent(postId)}&order=created_at.asc`
    )
    if (!result.ok || !Array.isArray(result.data)) {
      return Response.json({ error: "Could not load comments." }, { status: 500 })
    }

    return Response.json((result.data as Record<string, unknown>[]).map(shapeComment))
  } catch {
    return Response.json({ error: "Could not load comments." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request" }, { status: 400 })
    }

    const record = body as Record<string, unknown>
    const postId = String(record.post_id ?? "")
    const userId = cleanText(record.user_id, 80)
    const username = cleanText(record.username, 40) || "Anonymous"
    const comment = cleanText(record.comment, 1000)

    if (!isId(postId) || !isUuid(userId)) {
      return Response.json({ error: "Log in to comment" }, { status: 401 })
    }
    if (!comment) {
      return Response.json({ error: "Write a comment." }, { status: 400 })
    }

    const created = await rest("community_comments", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        post_id: Number(postId),
        user_id: userId,
        username,
        comment,
      }),
    })

    if (!created.ok || !Array.isArray(created.data) || !created.data[0]) {
      return Response.json(
        { error: readableError(created.data) || "Could not post comment." },
        { status: created.status || 500 }
      )
    }

    return Response.json({
      success: true,
      data: shapeComment(created.data[0] as Record<string, unknown>),
    })
  } catch {
    return Response.json({ error: "Could not post comment." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id") || ""
    const userId = searchParams.get("user_id") || ""

    if (!isId(id)) {
      return Response.json({ error: "Missing comment id" }, { status: 400 })
    }
    if (userId && !isUuid(userId)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 })
    }

    let path = `community_comments?id=eq.${encodeURIComponent(id)}`
    if (userId) path += `&user_id=eq.${encodeURIComponent(userId)}`

    const removed = await rest(path, {
      method: "DELETE",
      headers: { Prefer: "return=minimal" },
    })

    if (!removed.ok) {
      return Response.json({ error: "Could not delete comment." }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch {
    return Response.json({ error: "Could not delete comment." }, { status: 500 })
  }
}
