import { supabaseRest } from "../../../lib/db"

type MemberRow = {
  id: number
  community_id: number
  user_id: string
  username: string
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
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get("community_id")?.trim() || ""
    const userId = searchParams.get("user_id")?.trim() || ""

    if (!communityId && userId) {
      const result = await supabaseRest<Array<{ community_id: number }>>(
        `community_members?select=community_id&user_id=eq.${encodeURIComponent(userId)}`
      )
      if (!result.ok) {
        return Response.json(
          { error: restMessage(result.data, "Could not load memberships.") },
          { status: 500 }
        )
      }
      return Response.json({
        member_count: null,
        joined: false,
        joined_ids: asArray<{ community_id: number }>(result.data).map((row) => row.community_id),
      })
    }

    if (!communityId) {
      return Response.json({ error: "Missing community_id" }, { status: 400 })
    }

    const result = await supabaseRest<MemberRow[]>(
      `community_members?select=id,community_id,user_id,username,created_at&community_id=eq.${encodeURIComponent(communityId)}`
    )
    if (!result.ok) {
      return Response.json(
        { error: restMessage(result.data, "Could not load members.") },
        { status: 500 }
      )
    }

    const members = asArray<MemberRow>(result.data)
    return Response.json({
      member_count: members.length,
      joined: userId ? members.some((member) => member.user_id === userId) : false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load members."
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const communityId = Number(body?.community_id)
    const userId = typeof body?.user_id === "string" ? body.user_id.trim() : ""
    const username = typeof body?.username === "string" ? body.username.trim() : "Anonymous"

    if (!communityId || !userId) {
      return Response.json({ error: "Log in to join a community." }, { status: 401 })
    }

    const existing = await supabaseRest<MemberRow[]>(
      `community_members?select=id&community_id=eq.${communityId}&user_id=eq.${encodeURIComponent(userId)}&limit=1`
    )
    if (asArray<MemberRow>(existing.data).length > 0) {
      return Response.json({ error: "Already joined", joined: true }, { status: 409 })
    }

    const created = await supabaseRest<MemberRow[]>("community_members", {
      method: "POST",
      prefer: "return=representation",
      body: {
        community_id: communityId,
        user_id: userId,
        username: username || "Anonymous",
      },
    })

    if (!created.ok) {
      const message = restMessage(created.data, "Could not join community.")
      const duplicate = created.status === 409 || /duplicate|unique/i.test(message)
      return Response.json(
        { error: duplicate ? "Already joined" : message, joined: duplicate },
        { status: duplicate ? 409 : created.status || 500 }
      )
    }

    return Response.json({ joined: true, member: asArray<MemberRow>(created.data)[0] || null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join community."
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get("community_id")?.trim() || ""
    const userId = searchParams.get("user_id")?.trim() || ""

    if (!communityId || !userId) {
      return Response.json({ error: "Log in to leave a community." }, { status: 401 })
    }

    const removed = await supabaseRest(
      `community_members?community_id=eq.${encodeURIComponent(communityId)}&user_id=eq.${encodeURIComponent(userId)}`,
      { method: "DELETE", prefer: "return=representation" }
    )

    if (!removed.ok) {
      return Response.json(
        { error: restMessage(removed.data, "Could not leave community.") },
        { status: removed.status || 500 }
      )
    }

    const rows = asArray(removed.data)
    if (rows.length === 0) {
      return Response.json({ error: "Not a member", joined: false }, { status: 404 })
    }

    return Response.json({ joined: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not leave community."
    return Response.json({ error: message }, { status: 500 })
  }
}
