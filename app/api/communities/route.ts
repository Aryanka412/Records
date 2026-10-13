import { readSupabaseEnv } from "../../../lib/supabaseEnv"

export const dynamic = "force-dynamic"

const CATEGORIES = [
  "Genre",
  "Artist",
  "Album",
  "Song",
  "Reviews",
  "Rankings",
  "Debate",
  "Recommendations",
  "News",
  "Local Scene",
  "Other",
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
  const record = data as { message?: string; error?: string; details?: string }
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

function embeddedCount(value: unknown) {
  if (!Array.isArray(value)) return 0
  const first = value[0] as { count?: unknown } | undefined
  if (first && (typeof first.count === "number" || typeof first.count === "string")) {
    const count = Number(first.count)
    return Number.isFinite(count) ? count : 0
  }
  return value.length
}

function shapeCommunity(row: Record<string, unknown>, joinedIds: Set<string>) {
  const id = Number(row.id)
  return {
    id,
    name: typeof row.name === "string" ? row.name : "",
    description: typeof row.description === "string" ? row.description : "",
    category: typeof row.category === "string" ? row.category : "Other",
    genre: typeof row.genre === "string" && row.genre ? row.genre : null,
    image_url: typeof row.image_url === "string" && row.image_url ? row.image_url : null,
    rules: typeof row.rules === "string" && row.rules ? row.rules : null,
    username:
      typeof row.creator_username === "string" && row.creator_username
        ? row.creator_username
        : "Anonymous",
    user_id: typeof row.creator_user_id === "string" ? row.creator_user_id : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    member_count: embeddedCount(row.community_members),
    post_count: embeddedCount(row.community_posts),
    joined: joinedIds.has(String(id)),
  }
}

async function joinedIdsFor(userId: string | null) {
  const ids = new Set<string>()
  if (!userId) return ids

  const result = await rest(
    `community_members?select=community_id&user_id=eq.${encodeURIComponent(userId)}`
  )
  if (!result.ok || !Array.isArray(result.data)) return ids

  for (const row of result.data as { community_id?: number | string }[]) {
    if (row.community_id != null) ids.add(String(row.community_id))
  }
  return ids
}

async function loadRows(id: string | null) {
  const filter = id ? `&id=eq.${encodeURIComponent(id)}` : ""
  const embedded = await rest(
    `communities?select=*,community_members(count),community_posts(count)&order=created_at.desc${filter}`
  )
  if (embedded.ok && Array.isArray(embedded.data)) {
    return embedded.data as Record<string, unknown>[]
  }

  const plain = await rest(`communities?select=*&order=created_at.desc${filter}`)
  if (!plain.ok || !Array.isArray(plain.data)) return null

  return Promise.all(
    (plain.data as Record<string, unknown>[]).map(async (row) => {
      const communityId = encodeURIComponent(String(row.id))
      const [members, posts] = await Promise.all([
        rest(`community_members?select=id&community_id=eq.${communityId}`),
        rest(`community_posts?select=id&community_id=eq.${communityId}`),
      ])
      return {
        ...row,
        community_members: Array.isArray(members.data) ? members.data : [],
        community_posts: Array.isArray(posts.data) ? posts.data : [],
      }
    })
  )
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const userId = searchParams.get("user_id")

    if (id && !isId(id)) {
      return Response.json({ error: "Invalid community id" }, { status: 400 })
    }
    if (userId && !isUuid(userId)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 })
    }

    const rows = await loadRows(id)
    if (!rows) {
      return Response.json({ error: "Could not load communities." }, { status: 500 })
    }

    const joinedIds = await joinedIdsFor(userId)
    return Response.json(rows.map((row) => shapeCommunity(row, joinedIds)))
  } catch {
    return Response.json({ error: "Could not load communities." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid request" }, { status: 400 })
    }

    const record = body as Record<string, unknown>
    const name = cleanText(record.name, 80)
    const description = cleanText(record.description, 600)
    const category = cleanText(record.category, 40)
    const genre = cleanText(record.genre, 40)
    const rules = cleanText(record.rules, 1200)
    const username = cleanText(record.username, 40) || "Anonymous"
    const userId = cleanText(record.user_id, 80)
    const image = cleanText(record.image_url, 500)

    if (name.length < 2) {
      return Response.json({ error: "Name must be at least 2 characters." }, { status: 400 })
    }
    if (!CATEGORIES.includes(category)) {
      return Response.json({ error: "Choose a category." }, { status: 400 })
    }
    if (!isUuid(userId)) {
      return Response.json({ error: "Log in to create a community." }, { status: 401 })
    }
    if (image && !/^https?:\/\//i.test(image)) {
      return Response.json(
        { error: "Banner URL must start with http:// or https://." },
        { status: 400 }
      )
    }

    const created = await rest("communities", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name,
        description,
        category,
        genre: genre || null,
        image_url: image || null,
        rules: rules || null,
        creator_username: username,
        creator_user_id: userId,
      }),
    })

    if (!created.ok || !Array.isArray(created.data) || !created.data[0]) {
      return Response.json(
        { error: readableError(created.data) || "Could not create community." },
        { status: created.status || 500 }
      )
    }

    const row = created.data[0] as Record<string, unknown>
    await rest("community_members", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        community_id: row.id,
        user_id: userId,
        username,
      }),
    })

    return Response.json({
      success: true,
      data: shapeCommunity(
        {
          ...row,
          community_members: [{ count: 1 }],
          community_posts: [{ count: 0 }],
        },
        new Set([String(row.id)])
      ),
    })
  } catch {
    return Response.json({ error: "Could not create community." }, { status: 500 })
  }
}
