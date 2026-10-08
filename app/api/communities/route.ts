import { supabaseRest } from "../../../lib/db"

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

type CommunityRow = {
  id: number
  name: string
  description: string
  category: string
  genre: string | null
  image_url: string | null
  rules: string | null
  creator_username: string
  creator_user_id: string | null
  created_at: string
}

function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? data : []
}

function restMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback
  const record = data as { message?: unknown; error?: unknown; hint?: unknown }
  if (typeof record.message === "string" && record.message.trim()) return record.message
  if (typeof record.error === "string" && record.error.trim()) return record.error
  if (typeof record.hint === "string" && record.hint.trim()) return record.hint
  return fallback
}

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id")?.trim()
    const communitiesResult = await supabaseRest<CommunityRow[]>(
      "communities?select=*&order=created_at.desc"
    )
    if (!communitiesResult.ok) {
      return Response.json(
        { error: restMessage(communitiesResult.data, "Could not load communities.") },
        { status: 500 }
      )
    }

    const communities = asArray<CommunityRow>(communitiesResult.data)
    const [membersResult, postsResult] = await Promise.all([
      supabaseRest<Array<{ community_id: number }>>("community_members?select=community_id"),
      supabaseRest<Array<{ community_id: number }>>("community_posts?select=community_id"),
    ])

    const memberCounts = new Map<number, number>()
    for (const row of asArray<{ community_id: number }>(membersResult.data)) {
      memberCounts.set(row.community_id, (memberCounts.get(row.community_id) || 0) + 1)
    }
    const postCounts = new Map<number, number>()
    for (const row of asArray<{ community_id: number }>(postsResult.data)) {
      postCounts.set(row.community_id, (postCounts.get(row.community_id) || 0) + 1)
    }

    const withCounts = communities.map((community) => ({
      ...community,
      member_count: memberCounts.get(community.id) || 0,
      post_count: postCounts.get(community.id) || 0,
    }))

    if (id) {
      const community = withCounts.find((item) => String(item.id) === id)
      if (!community) {
        return Response.json({ error: "Community not found" }, { status: 404 })
      }
      return Response.json(community)
    }

    return Response.json(withCounts)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load communities."
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const description = typeof body?.description === "string" ? body.description.trim() : ""
    const category = CATEGORIES.includes(body?.category) ? body.category : "Other"
    const genre = typeof body?.genre === "string" ? body.genre.trim() : ""
    const imageUrl = typeof body?.image_url === "string" ? body.image_url.trim() : ""
    const rules = typeof body?.rules === "string" ? body.rules.trim() : ""
    const username = typeof body?.creator_username === "string" ? body.creator_username.trim() : ""
    const userId = typeof body?.creator_user_id === "string" ? body.creator_user_id.trim() : ""

    if (!name) {
      return Response.json({ error: "Community name is required." }, { status: 400 })
    }
    if (!userId) {
      return Response.json({ error: "Log in to create a community." }, { status: 401 })
    }

    const created = await supabaseRest<CommunityRow[]>("communities", {
      method: "POST",
      prefer: "return=representation",
      body: {
        name,
        description,
        category,
        genre: genre || null,
        image_url: imageUrl || null,
        rules: rules || null,
        creator_username: username || "Anonymous",
        creator_user_id: userId,
      },
    })

    if (!created.ok) {
      return Response.json(
        { error: restMessage(created.data, "Could not create community.") },
        { status: created.status || 500 }
      )
    }

    const community = asArray<CommunityRow>(created.data)[0]
    if (!community) {
      return Response.json({ error: "Could not create community." }, { status: 500 })
    }

    await supabaseRest("community_members", {
      method: "POST",
      prefer: "return=minimal",
      body: {
        community_id: community.id,
        user_id: userId,
        username: username || "Anonymous",
      },
    })

    return Response.json({ ...community, member_count: 1, post_count: 0 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create community."
    return Response.json({ error: message }, { status: 500 })
  }
}
