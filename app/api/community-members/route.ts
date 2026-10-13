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

async function memberCount(communityId: string) {
  const result = await rest(
    `community_members?select=id&community_id=eq.${encodeURIComponent(communityId)}`
  )
  return result.ok && Array.isArray(result.data) ? result.data.length : 0
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get("community_id") || ""
    const userId = searchParams.get("user_id") || ""

    if (!isId(communityId)) {
      return Response.json({ error: "Missing community id" }, { status: 400 })
    }
    if (userId && !isUuid(userId)) {
      return Response.json({ error: "Invalid user id" }, { status: 400 })
    }

    const members = await rest(
      `community_members?select=user_id&community_id=eq.${encodeURIComponent(communityId)}`
    )
    if (!members.ok || !Array.isArray(members.data)) {
      return Response.json({ error: "Could not load members." }, { status: 500 })
    }

    const rows = members.data as { user_id?: string }[]
    return Response.json({
      member_count: rows.length,
      joined: userId ? rows.some((row) => row.user_id === userId) : false,
    })
  } catch {
    return Response.json({ error: "Could not load members." }, { status: 500 })
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

    if (!isId(communityId) || !isUuid(userId)) {
      return Response.json({ error: "Log in to join a community." }, { status: 401 })
    }

    const existing = await rest(
      `community_members?select=id&community_id=eq.${encodeURIComponent(communityId)}&user_id=eq.${encodeURIComponent(userId)}`
    )
    if (existing.ok && Array.isArray(existing.data) && existing.data.length > 0) {
      return Response.json({
        success: true,
        joined: true,
        member_count: await memberCount(communityId),
      })
    }

    const inserted = await rest("community_members", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        community_id: Number(communityId),
        user_id: userId,
        username,
      }),
    })

    if (!inserted.ok && inserted.status !== 409) {
      return Response.json({ error: "Could not join community." }, { status: 500 })
    }

    return Response.json({
      success: true,
      joined: true,
      member_count: await memberCount(communityId),
    })
  } catch {
    return Response.json({ error: "Could not join community." }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const communityId = searchParams.get("community_id") || ""
    const userId = searchParams.get("user_id") || ""

    if (!isId(communityId) || !isUuid(userId)) {
      return Response.json({ error: "Log in to leave a community." }, { status: 401 })
    }

    const removed = await rest(
      `community_members?community_id=eq.${encodeURIComponent(communityId)}&user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      }
    )

    if (!removed.ok) {
      return Response.json({ error: "Could not leave community." }, { status: 500 })
    }

    return Response.json({
      success: true,
      joined: false,
      member_count: await memberCount(communityId),
    })
  } catch {
    return Response.json({ error: "Could not leave community." }, { status: 500 })
  }
}
