import { readSupabaseEnv } from "../../../lib/supabaseEnv"

export const dynamic = "force-dynamic"

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

function parseRating(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return { ok: true as const, rating: null }
  }
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number) || number < 0 || number > 10) {
    return { ok: false as const, rating: null }
  }
  return { ok: true as const, rating: Math.round(number * 10) / 10 }
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

function embeddedCount(value: unknown) {
  if (!Array.isArray(value)) return 0
  const first = value[0] as { count?: unknown } | undefined
  if (first && (typeof first.count === "number" || typeof first.count === "string")) {
    const count = Number(first.count)
    return Number.isFinite(count) ? count : 0
  }
  return value.length
}

function shapePost(row: Record<string, unknown>) {
  const rating = row.rating == null || row.rating === "" ? null : Number(row.rating)
  return {
    id: Number(row.id),
    community_id: Number(row.community_id),
    title: typeof row.title === "string" ? row.title : "",
    body: typeof row.body === "string" ? row.body : "",
    post_type: typeof row.post_type === "string" ? row.post_type : "Discussion",
    rating: rating != null && Number.isFinite(rating) ? rating : null,
    related_artist:
      typeof row.related_artist === "string" && row.related_artist ? row.related_artist : null,
    related_album:
      typeof row.related_album === "string" && row.related_album ? row.related_album : null,
    related_song:
      typeof row.related_song === "string" && row.related_song ? row.related_song : null,
    username: typeof row.username === "string" && row.username ? row.username : "Anonymous",
    user_id: typeof row.user_id === "string" ? row.user_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    comment_count: embeddedCount(row.community_comments),
  }
}

async function loadPosts(communityId: string) {
  const embedded = await rest(
    `community_posts?select=*,community_comments(count)&community_id=eq.${encodeURIComponent(communityId)}&order=created_at.desc`
  )
  if (embedded.ok && Array.isArray(embedded.data)) {
    return embedded.data as Record<string, unknown>[]
  }

  const plain = await rest(
    `community_posts?select=*&community_id=eq.${encodeURIComponent(communityId)}&order=created_at.desc`
  )
  if (!plain.ok || !Array.isArray(plain.data)) return null

  return Promise.all(
    (plain.data as Record<string, unknown>[]).map(async (row) => {
      const comments = await rest(
        `community_comments?select=id&post_id=eq.${encodeURIComponent(String(row.id))}`
      )
      return {
        ...row,
        community_comments: Array.isArray(comments.data) ? comments.data : [],
      }
    })
  )
}

export async function GET(request: Request) {
  try {
    const communityId = new URL(request.url).searchParams.get("community_id") || ""
    if (!isId(communityId)) {
      return Response.json({ error: "Missing community id" }, { status: 400 })
    }

    const rows = await loadPosts(communityId)
    if (!rows) {
      return Response.json({ error: "Could not load posts." }, { status: 500 })
    }

    return Response.json(rows.map(shapePost))
  } catch {
    return Response.json({ error: "Could not load posts." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request" }, { status: 400 })
    }

    const record = body as Record<string, unknown>
    const communityId = String(record.community_id ?? "")
    const userId = cleanText(record.user_id, 80)
    const username = cleanText(record.username, 40) || "Anonymous"
    const title = cleanText(record.title, 140)
    const text = cleanText(record.body, 4000)
    const postType = cleanText(record.post_type, 40)
    const relatedArtist = cleanText(record.related_artist, 120)
    const relatedAlbum = cleanText(record.related_album, 120)
    const relatedSong = cleanText(record.related_song, 120)
    const rating = parseRating(record.rating)

    if (!isId(communityId) || !isUuid(userId)) {
      return Response.json({ error: "Join this community to post." }, { status: 401 })
    }
    if (title.length < 2) {
      return Response.json({ error: "Title must be at least 2 characters." }, { status: 400 })
    }
    if (!text) {
      return Response.json({ error: "Write something to post." }, { status: 400 })
    }
    if (!POST_TYPES.includes(postType)) {
      return Response.json({ error: "Choose a post type." }, { status: 400 })
    }
    if (!rating.ok) {
      return Response.json({ error: "Rating must be between 0 and 10." }, { status: 400 })
    }

    const membership = await rest(
      `community_members?select=id&community_id=eq.${encodeURIComponent(communityId)}&user_id=eq.${encodeURIComponent(userId)}`
    )
    if (!membership.ok || !Array.isArray(membership.data) || membership.data.length === 0) {
      return Response.json({ error: "Join this community to post." }, { status: 403 })
    }

    const created = await rest("community_posts", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        community_id: Number(communityId),
        title,
        body: text,
        post_type: postType,
        rating: rating.rating,
        related_artist: relatedArtist || null,
        related_album: relatedAlbum || null,
        related_song: relatedSong || null,
        username,
        user_id: userId,
      }),
    })

    if (!created.ok || !Array.isArray(created.data) || !created.data[0]) {
      return Response.json(
        { error: readableError(created.data) || "Could not create post." },
        { status: created.status || 500 }
      )
    }

    return Response.json({
      success: true,
      data: shapePost({
        ...(created.data[0] as Record<string, unknown>),
        community_comments: [{ count: 0 }],
      }),
    })
  } catch {
    return Response.json({ error: "Could not create post." }, { status: 500 })
  }
}
