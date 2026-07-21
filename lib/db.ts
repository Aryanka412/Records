const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabaseConfig() {
  if (!url || !key) {
    return null
  }

  return { url, key }
}

type FetchOptions = {
  method?: string
  body?: unknown
  prefer?: string
}

export async function supabaseRest<T = unknown>(
  path: string,
  options: FetchOptions = {}
) {
  const config = getSupabaseConfig()

  if (!config) {
    return { ok: false as const, status: 500, data: { error: "Missing Supabase keys" } }
  }

  const headers: Record<string, string> = {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  if (options.prefer) {
    headers.Prefer = options.prefer
  }

  const res = await fetch(`${config.url}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  return {
    ok: res.ok,
    status: res.status,
    data: data as T,
  }
}

export type ReviewType = "song" | "album" | "artist"

const reviewTable: Record<ReviewType, string> = {
  song: "reviews",
  album: "album_reviews",
  artist: "artist_reviews",
}

export async function getReviewOwner(reviewType: ReviewType, reviewId: number) {
  const table = reviewTable[reviewType]
  const fields =
    reviewType === "song"
      ? "user_id,username,song_name,artist"
      : reviewType === "album"
        ? "user_id,username,album_name,artist"
        : "user_id,username,artist_name"

  const result = await supabaseRest<
    Array<{
      user_id: string | null
      username: string | null
      song_name?: string
      album_name?: string
      artist_name?: string
      artist?: string
    }>
  >(`${table}?select=${fields}&id=eq.${reviewId}&limit=1`)

  if (!result.ok || !Array.isArray(result.data) || result.data.length === 0) {
    return null
  }

  const row = result.data[0]
  let link = "/"

  if (reviewType === "song" && row.song_name) {
    link = `/song/${encodeURIComponent(`${row.song_name} ${row.artist || ""}`.trim())}`
  } else if (reviewType === "album" && row.album_name) {
    link = `/album/${encodeURIComponent(`${row.album_name} ${row.artist || ""}`.trim())}`
  } else if (reviewType === "artist" && row.artist_name) {
    link = `/artist/${encodeURIComponent(row.artist_name)}`
  }

  return { ...row, link }
}
