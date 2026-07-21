import { supabaseRest } from "../../../lib/db"

type ReviewRow = {
  id: number
  user_id: string | null
  username: string | null
  rating: number
  review: string
  image: string
  created_at: string
  song_name?: string
  album_name?: string
  artist_name?: string
  artist?: string
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")

    if (!userId) {
      return Response.json({ error: "Missing user_id" }, { status: 400 })
    }

    const followsResult = await supabaseRest<Array<{ following_id: string }>>(
      `follows?select=following_id&follower_id=eq.${userId}`
    )

    if (!followsResult.ok) {
      return Response.json({ error: JSON.stringify(followsResult.data) }, { status: 500 })
    }

    const followingIds = (followsResult.data || []).map((row) => row.following_id)

    if (followingIds.length === 0) {
      return Response.json([])
    }

    const filter = followingIds.map((id) => `user_id.eq.${id}`).join(",")

    const [songRes, albumRes, artistRes] = await Promise.all([
      supabaseRest<ReviewRow[]>(`reviews?select=*&or=(${filter})&order=created_at.desc&limit=30`),
      supabaseRest<ReviewRow[]>(
        `album_reviews?select=*&or=(${filter})&order=created_at.desc&limit=30`
      ),
      supabaseRest<ReviewRow[]>(
        `artist_reviews?select=*&or=(${filter})&order=created_at.desc&limit=30`
      ),
    ])

    const songRows = Array.isArray(songRes.data) ? songRes.data : []
    const albumRows = Array.isArray(albumRes.data) ? albumRes.data : []
    const artistRows = Array.isArray(artistRes.data) ? artistRes.data : []

    const songReviews = songRows.map((item) => ({
      id: item.id,
      type: "song" as const,
      title: item.song_name || "",
      artist: item.artist || "",
      image: item.image,
      username: item.username || "Anonymous",
      user_id: item.user_id,
      rating: item.rating,
      review: item.review,
      created_at: item.created_at,
    }))

    const albumReviews = albumRows.map((item) => ({
      id: item.id,
      type: "album" as const,
      title: item.album_name || "",
      artist: item.artist || "",
      image: item.image,
      username: item.username || "Anonymous",
      user_id: item.user_id,
      rating: item.rating,
      review: item.review,
      created_at: item.created_at,
    }))

    const artistReviews = artistRows.map((item) => ({
      id: item.id,
      type: "artist" as const,
      title: item.artist_name || "",
      artist: "Artist",
      image: item.image,
      username: item.username || "Anonymous",
      user_id: item.user_id,
      rating: item.rating,
      review: item.review,
      created_at: item.created_at,
    }))

    const feed = [...songReviews, ...albumReviews, ...artistReviews]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 40)

    return Response.json(feed)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Feed failed"
    return Response.json({ error: "Feed failed", message }, { status: 500 })
  }
}
