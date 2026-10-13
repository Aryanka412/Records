import { supabaseRest } from "../../../lib/db"

export const dynamic = "force-dynamic"

type ProfileRow = {
  id?: string
  username?: string | null
  avatar_url?: string | null
  bio?: string | null
  updated_at?: string | null
}

type ReviewRow = {
  user_id?: string | null
}

type FollowRow = {
  follower_id?: string | null
  following_id?: string | null
}

function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : []
}

function addCounts(map: Map<string, number>, ids: Array<string | null | undefined>) {
  for (const id of ids) {
    if (!id) continue
    map.set(id, (map.get(id) || 0) + 1)
  }
}

export async function GET() {
  try {
    const [profilesRes, songRes, albumRes, artistRes, followsRes] = await Promise.all([
      supabaseRest<ProfileRow[]>(
        "profiles?select=id,username,avatar_url,bio,updated_at&order=updated_at.desc&limit=500"
      ),
      supabaseRest<ReviewRow[]>("reviews?select=user_id&limit=1000"),
      supabaseRest<ReviewRow[]>("album_reviews?select=user_id&limit=1000"),
      supabaseRest<ReviewRow[]>("artist_reviews?select=user_id&limit=1000"),
      supabaseRest<FollowRow[]>("follows?select=follower_id,following_id&limit=1000"),
    ])

    if (!profilesRes.ok) {
      return Response.json({ error: "Could not load people." }, { status: 502 })
    }

    const reviewCounts = new Map<string, number>()
    if (songRes.ok) addCounts(reviewCounts, rows<ReviewRow>(songRes.data).map((row) => row.user_id))
    if (albumRes.ok) addCounts(reviewCounts, rows<ReviewRow>(albumRes.data).map((row) => row.user_id))
    if (artistRes.ok) addCounts(reviewCounts, rows<ReviewRow>(artistRes.data).map((row) => row.user_id))

    const followers = new Map<string, number>()
    const following = new Map<string, number>()
    if (followsRes.ok) {
      for (const row of rows<FollowRow>(followsRes.data)) {
        if (row.following_id) followers.set(row.following_id, (followers.get(row.following_id) || 0) + 1)
        if (row.follower_id) following.set(row.follower_id, (following.get(row.follower_id) || 0) + 1)
      }
    }

    const people = rows<ProfileRow>(profilesRes.data)
      .filter((profile) => Boolean(profile.id))
      .map((profile) => {
        const id = profile.id as string
        return {
          id,
          username: profile.username || "Anonymous",
          avatar_url: profile.avatar_url || "",
          bio: profile.bio || "",
          updated_at: profile.updated_at || "",
          review_count: reviewCounts.get(id) || 0,
          followers_count: followers.get(id) || 0,
          following_count: following.get(id) || 0,
        }
      })
      .sort((a, b) => {
        if (b.review_count !== a.review_count) return b.review_count - a.review_count
        return b.updated_at.localeCompare(a.updated_at)
      })

    return Response.json({ people })
  } catch {
    return Response.json({ error: "Could not load people." }, { status: 502 })
  }
}
