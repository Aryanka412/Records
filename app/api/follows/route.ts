import { supabaseRest } from "../../../lib/db"
import { createNotification, getActorUsername } from "../../../lib/notifications"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const followerId = searchParams.get("follower_id")
    const followingId = searchParams.get("following_id")

    if (followerId && followingId) {
      const result = await supabaseRest(
        `follows?select=*&follower_id=eq.${followerId}&following_id=eq.${followingId}&limit=1`
      )

      if (!result.ok) {
        return Response.json({ error: JSON.stringify(result.data) }, { status: 500 })
      }

      const rows = Array.isArray(result.data) ? result.data : []
      return Response.json({ following: rows.length > 0, follow: rows[0] || null })
    }

    if (userId) {
      const includeProfiles = searchParams.get("include_profiles") === "true"

      const [followersRes, followingRes] = await Promise.all([
        supabaseRest(`follows?select=*&following_id=eq.${userId}&order=created_at.desc`),
        supabaseRest(`follows?select=*&follower_id=eq.${userId}&order=created_at.desc`),
      ])

      if (!followersRes.ok || !followingRes.ok) {
        return Response.json({ error: "Failed to load follows" }, { status: 500 })
      }

      const followers = Array.isArray(followersRes.data) ? followersRes.data : []
      const following = Array.isArray(followingRes.data) ? followingRes.data : []

      const response: Record<string, unknown> = {
        followers,
        following,
        followerCount: followers.length,
        followingCount: following.length,
      }

      if (includeProfiles) {
        const followerIds = followers.map(
          (row: { follower_id: string }) => row.follower_id
        )
        const followingIds = following.map(
          (row: { following_id: string }) => row.following_id
        )
        const allIds = [...new Set([...followerIds, ...followingIds])]

        if (allIds.length > 0) {
          const profilesRes = await supabaseRest(
            `profiles?select=id,username,avatar_url&id=in.(${allIds.join(",")})`
          )
          const profiles = Array.isArray(profilesRes.data) ? profilesRes.data : []
          const profileMap = new Map(profiles.map((p: { id: string }) => [p.id, p]))

          response.followerProfiles = followerIds
            .map((id: string) => profileMap.get(id))
            .filter(Boolean)
          response.followingProfiles = followingIds
            .map((id: string) => profileMap.get(id))
            .filter(Boolean)
        } else {
          response.followerProfiles = []
          response.followingProfiles = []
        }
      }

      return Response.json(response)
    }

    const result = await supabaseRest("follows?select=*&order=created_at.desc")

    if (!result.ok) {
      return Response.json({ error: JSON.stringify(result.data) }, { status: 500 })
    }

    return Response.json(result.data)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fetch failed"
    return Response.json({ error: "Fetch failed", message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.follower_id || !body.following_id) {
      return Response.json(
        { error: "Missing follower_id or following_id" },
        { status: 400 }
      )
    }

    if (body.follower_id === body.following_id) {
      return Response.json({ error: "You cannot follow yourself" }, { status: 400 })
    }

    const result = await supabaseRest("follows", {
      method: "POST",
      prefer: "return=representation",
      body: {
        follower_id: body.follower_id,
        following_id: body.following_id,
      },
    })

    if (!result.ok) {
      return Response.json({ error: JSON.stringify(result.data) }, { status: 500 })
    }

    const actorName = await getActorUsername(body.follower_id, body.username || "Someone")

    await createNotification({
      userId: body.following_id,
      actorId: body.follower_id,
      actorUsername: actorName,
      type: "follow",
      message: `${actorName} started following you`,
      link: `/user/${body.follower_id}`,
    })

    return Response.json({ success: true, data: result.data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Follow failed"
    return Response.json({ error: "Follow failed", message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const followerId = searchParams.get("follower_id")
    const followingId = searchParams.get("following_id")

    if (!followerId || !followingId) {
      return Response.json(
        { error: "Missing follower_id or following_id" },
        { status: 400 }
      )
    }

    const result = await supabaseRest(
      `follows?follower_id=eq.${followerId}&following_id=eq.${followingId}`,
      { method: "DELETE", prefer: "return=representation" }
    )

    if (!result.ok) {
      return Response.json({ error: JSON.stringify(result.data) }, { status: 500 })
    }

    return Response.json({ success: true, data: result.data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unfollow failed"
    return Response.json({ error: "Unfollow failed", message }, { status: 500 })
  }
}
