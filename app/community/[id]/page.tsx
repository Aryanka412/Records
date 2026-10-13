"use client"

import { useEffect, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import AppShell from "../../components/AppShell"
import { supabase } from "../../lib/supabaseClient"

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

type Community = {
  id: number
  name: string
  description: string
  category: string
  genre: string | null
  image_url: string | null
  rules: string | null
  username: string
  user_id: string | null
  created_at: string | null
  member_count: number
  post_count: number
  joined: boolean
}

type Post = {
  id: number
  community_id: number
  title: string
  body: string
  post_type: string
  rating: number | null
  related_artist: string | null
  related_album: string | null
  related_song: string | null
  username: string
  user_id: string | null
  created_at: string | null
  comment_count: number
}

type Comment = {
  id: number
  post_id: number
  username: string
  user_id: string | null
  comment: string
  created_at: string | null
}

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 [color-scheme:dark]"

function formatDate(dateStr: string | null) {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`
}

function formatRating(rating: number) {
  return Number.isInteger(rating) ? String(rating) : rating.toFixed(1)
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-200">
      {children}
    </span>
  )
}

function relatedHref(kind: "artist" | "album" | "song", name: string, artist: string | null) {
  if (kind === "artist") return `/artist/${encodeURIComponent(name)}`
  const label = artist ? `${name} ${artist}` : name
  return kind === "album"
    ? `/album/${encodeURIComponent(label)}`
    : `/song/${encodeURIComponent(label)}`
}

export default function CommunityDetailPage() {
  const params = useParams()
  const communityId = Array.isArray(params.id) ? params.id[0] : String(params.id || "")

  const [community, setCommunity] = useState<Community | null>(null)
  const [missing, setMissing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState("")
  const [userId, setUserId] = useState("")
  const [username, setUsername] = useState("")
  const [joining, setJoining] = useState(false)
  const [openPostId, setOpenPostId] = useState<number | null>(null)
  const [commentsByPost, setCommentsByPost] = useState<Record<number, Comment[]>>({})
  const [commentStatus, setCommentStatus] = useState<Record<number, "loading" | "error" | "ready">>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({})
  const [commentError, setCommentError] = useState("")
  const [postingComment, setPostingComment] = useState(false)
  const [postError, setPostError] = useState("")
  const [submittingPost, setSubmittingPost] = useState(false)
  const [draft, setDraft] = useState({
    title: "",
    body: "",
    post_type: "Discussion",
    rating: "",
    related_artist: "",
    related_album: "",
    related_song: "",
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")
      setMissing(false)
      setPostsLoading(true)
      setPostsError("")

      const { data } = await supabase.auth.getSession()
      const user = data.session?.user
      let nextUserId = ""
      let nextUsername = ""

      if (user) {
        nextUserId = user.id
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle()
        nextUsername =
          profile?.username ||
          (typeof user.user_metadata?.username === "string" ? user.user_metadata.username : "") ||
          user.email?.split("@")[0] ||
          "Anonymous"
      }

      if (cancelled) return
      setUserId(nextUserId)
      setUsername(nextUsername)

      const communityQuery = new URLSearchParams({ id: communityId })
      if (nextUserId) communityQuery.set("user_id", nextUserId)

      const [communityRes, postsRes] = await Promise.all([
        fetch(`/api/communities?${communityQuery.toString()}`),
        fetch(`/api/community-posts?community_id=${encodeURIComponent(communityId)}`),
      ])
      const communityPayload = await communityRes.json().catch(() => null)
      const postsPayload = await postsRes.json().catch(() => null)

      if (cancelled) return

      if (!communityRes.ok || !Array.isArray(communityPayload)) {
        setCommunity(null)
        setError("Could not load communities.")
      } else if (!communityPayload[0]) {
        setCommunity(null)
        setMissing(true)
      } else {
        setCommunity(communityPayload[0])
      }

      if (!postsRes.ok || !Array.isArray(postsPayload)) {
        setPosts([])
        setPostsError("Could not load posts.")
      } else {
        setPosts(postsPayload)
      }

      setLoading(false)
      setPostsLoading(false)
    }

    if (communityId) load()
    return () => {
      cancelled = true
    }
  }, [communityId])

  async function toggleJoin() {
    if (!community || !userId || joining) return
    setJoining(true)

    const res = community.joined
      ? await fetch(
          `/api/community-members?community_id=${community.id}&user_id=${encodeURIComponent(userId)}`,
          { method: "DELETE" }
        )
      : await fetch("/api/community-members", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            community_id: community.id,
            user_id: userId,
            username,
          }),
        })
    const payload = await res.json().catch(() => null)

    if (res.ok) {
      setCommunity({
        ...community,
        joined: Boolean(payload?.joined),
        member_count:
          typeof payload?.member_count === "number" ? payload.member_count : community.member_count,
      })
    }
    setJoining(false)
  }

  async function publishPost(event: FormEvent) {
    event.preventDefault()
    if (!community || !userId || submittingPost) return
    setPostError("")
    setSubmittingPost(true)

    const res = await fetch("/api/community-posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        community_id: community.id,
        user_id: userId,
        username,
        title: draft.title,
        body: draft.body,
        post_type: draft.post_type,
        rating: draft.rating,
        related_artist: draft.related_artist,
        related_album: draft.related_album,
        related_song: draft.related_song,
      }),
    })
    const payload = await res.json().catch(() => null)
    setSubmittingPost(false)

    if (!res.ok || !payload?.data) {
      setPostError(payload?.error || "Could not create post.")
      return
    }

    setPosts((current) => [payload.data, ...current])
    setCommunity({ ...community, post_count: community.post_count + 1 })
    setDraft({
      title: "",
      body: "",
      post_type: draft.post_type,
      rating: "",
      related_artist: "",
      related_album: "",
      related_song: "",
    })
  }

  async function openComments(postId: number) {
    if (openPostId === postId) {
      setOpenPostId(null)
      return
    }
    setOpenPostId(postId)
    setCommentError("")
    if (commentStatus[postId] === "ready") return

    setCommentStatus((current) => ({ ...current, [postId]: "loading" }))
    const res = await fetch(`/api/community-comments?post_id=${postId}`)
    const payload = await res.json().catch(() => null)
    if (!res.ok || !Array.isArray(payload)) {
      setCommentStatus((current) => ({ ...current, [postId]: "error" }))
      return
    }
    setCommentsByPost((current) => ({ ...current, [postId]: payload }))
    setCommentStatus((current) => ({ ...current, [postId]: "ready" }))
  }

  async function publishComment(postId: number) {
    const text = (commentDrafts[postId] || "").trim()
    if (!text || !userId || postingComment) return
    setCommentError("")
    setPostingComment(true)

    const res = await fetch("/api/community-comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        post_id: postId,
        user_id: userId,
        username,
        comment: text,
      }),
    })
    const payload = await res.json().catch(() => null)
    setPostingComment(false)

    if (!res.ok || !payload?.data) {
      setCommentError(payload?.error || "Could not post comment.")
      return
    }

    setCommentsByPost((current) => ({
      ...current,
      [postId]: [...(current[postId] || []), payload.data],
    }))
    setCommentDrafts((current) => ({ ...current, [postId]: "" }))
    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, comment_count: post.comment_count + 1 } : post
      )
    )
  }

  async function deleteComment(postId: number, commentId: number) {
    if (!userId) return
    const res = await fetch(
      `/api/community-comments?id=${commentId}&user_id=${encodeURIComponent(userId)}`,
      { method: "DELETE" }
    )
    if (!res.ok) return
    setCommentsByPost((current) => ({
      ...current,
      [postId]: (current[postId] || []).filter((comment) => comment.id !== commentId),
    }))
    setPosts((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, comment_count: Math.max(0, post.comment_count - 1) }
          : post
      )
    )
  }

  const joinButton = community ? (
    userId ? (
      <button
        type="button"
        onClick={toggleJoin}
        disabled={joining}
        className={`inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
          community.joined
            ? "border border-[#fa2d48]/40 bg-[#fa2d48]/10 text-[#fa2d48] hover:bg-[#fa2d48]/20"
            : "bg-[#fa2d48] text-white hover:bg-[#ff3d56]"
        }`}
      >
        {joining ? "Saving..." : community.joined ? "Leave" : "Join"}
      </button>
    ) : (
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-full bg-[#fa2d48] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff3d56]"
      >
        Log in to join
      </Link>
    )
  ) : null

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <Link
          href="/community"
          className="text-sm font-medium text-zinc-500 transition hover:text-white"
        >
          Communities
        </Link>

        {loading && <p className="mt-8 text-sm text-zinc-400">Loading communities...</p>}
        {!loading && error && <p className="mt-8 text-sm text-zinc-300">{error}</p>}
        {!loading && missing && (
          <div className="mt-8 rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
            <p className="text-sm text-zinc-300">This community does not exist.</p>
          </div>
        )}

        {!loading && community && (
          <div className="mt-5 flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_18.5rem] lg:items-start lg:gap-8">
            <header className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] lg:col-start-1">
              <div className="relative h-48 sm:h-60">
                {community.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={community.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none"
                    }}
                  />
                ) : (
                  <div className="h-full bg-[radial-gradient(ellipse_at_top_left,rgba(250,45,72,0.28),transparent_52%),linear-gradient(165deg,#18181b,#050505)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/20" />
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                  <div className="flex flex-wrap gap-2">
                    <Badge>{community.category}</Badge>
                    {community.genre && <Badge>{community.genre}</Badge>}
                  </div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    {community.name}
                  </h1>
                  {community.description && (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                      {community.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                  <span>{countLabel(community.member_count, "member", "members")}</span>
                  <span>{countLabel(community.post_count, "post", "posts")}</span>
                  <span>
                    Started by{" "}
                    {community.user_id ? (
                      <Link href={`/user/${community.user_id}`} className="text-zinc-200 hover:text-white">
                        {community.username}
                      </Link>
                    ) : (
                      <span className="text-zinc-200">{community.username}</span>
                    )}
                    {community.created_at ? ` · ${formatDate(community.created_at)}` : ""}
                  </span>
                </div>
                {joinButton}
              </div>
              {!userId && (
                <p className="border-t border-white/[0.06] px-5 py-3 text-sm text-zinc-400 sm:px-7">
                  Log in to create or join communities
                </p>
              )}
            </header>

            <aside className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">
                About
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                {community.description || "No description yet."}
              </p>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">Members</dt>
                  <dd className="font-medium text-white">{community.member_count.toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">Posts</dt>
                  <dd className="font-medium text-white">{community.post_count.toLocaleString()}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-zinc-500">Category</dt>
                  <dd className="font-medium text-white">{community.category}</dd>
                </div>
                {community.genre && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-zinc-500">Genre</dt>
                    <dd className="font-medium text-white">{community.genre}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-5 border-t border-white/[0.06] pt-5">
                <h3 className="text-sm font-semibold text-white">Rules</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                  {community.rules || "No rules posted yet. Keep it about the music."}
                </p>
              </div>
            </aside>

            <section className="lg:col-start-1">
              {userId && community.joined ? (
                <form
                  onSubmit={publishPost}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5"
                >
                  <h2 className="text-base font-semibold text-white">New post</h2>
                  <div className="mt-4 space-y-3">
                    <input
                      className={fieldClass}
                      placeholder="Title"
                      value={draft.title}
                      maxLength={140}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      required
                    />
                    <textarea
                      className={`${fieldClass} min-h-28 resize-y`}
                      placeholder="Body"
                      value={draft.body}
                      maxLength={4000}
                      onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                      required
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        className={fieldClass}
                        value={draft.post_type}
                        onChange={(event) => setDraft({ ...draft, post_type: event.target.value })}
                        aria-label="Post type"
                      >
                        {POST_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <input
                        className={fieldClass}
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        placeholder="Rating, optional"
                        value={draft.rating}
                        onChange={(event) => setDraft({ ...draft, rating: event.target.value })}
                        aria-label="Rating"
                      />
                      <input
                        className={fieldClass}
                        placeholder="Related artist, optional"
                        value={draft.related_artist}
                        onChange={(event) =>
                          setDraft({ ...draft, related_artist: event.target.value })
                        }
                      />
                      <input
                        className={fieldClass}
                        placeholder="Related album, optional"
                        value={draft.related_album}
                        onChange={(event) =>
                          setDraft({ ...draft, related_album: event.target.value })
                        }
                      />
                      <input
                        className={`${fieldClass} sm:col-span-2`}
                        placeholder="Related song, optional"
                        value={draft.related_song}
                        onChange={(event) =>
                          setDraft({ ...draft, related_song: event.target.value })
                        }
                      />
                    </div>
                    {postError && <p className="text-sm text-[#fa2d48]">{postError}</p>}
                    <button
                      type="submit"
                      disabled={submittingPost}
                      className="inline-flex items-center justify-center rounded-full bg-[#fa2d48] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff3d56] disabled:opacity-50"
                    >
                      {submittingPost ? "Posting..." : "Post"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-4 text-sm text-zinc-400">
                  {userId ? "Join this community to post." : "Log in to post in this community."}
                </div>
              )}
            </section>

            <section className="space-y-4 lg:col-start-1" aria-live="polite">
              {postsLoading && <p className="text-sm text-zinc-400">Loading posts...</p>}
              {!postsLoading && postsError && (
                <p className="text-sm text-zinc-300">Could not load posts.</p>
              )}
              {!postsLoading && !postsError && posts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
                  <p className="text-sm text-zinc-300">No posts yet. Start the first discussion.</p>
                </div>
              )}

              {posts.map((post) => {
                const open = openPostId === post.id
                const status = commentStatus[post.id]
                const comments = commentsByPost[post.id] || []
                return (
                  <article
                    key={post.id}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition hover:border-white/10"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{post.post_type}</Badge>
                      {post.rating != null && (
                        <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-black">
                          {formatRating(post.rating)} / 10
                        </span>
                      )}
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">
                      {post.title}
                    </h2>
                    <p
                      className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300 ${
                        open ? "" : "line-clamp-4"
                      }`}
                    >
                      {post.body}
                    </p>

                    {(post.related_artist || post.related_album || post.related_song) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {post.related_artist && (
                          <Link
                            href={relatedHref("artist", post.related_artist, null)}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white"
                          >
                            Artist · {post.related_artist}
                          </Link>
                        )}
                        {post.related_album && (
                          <Link
                            href={relatedHref("album", post.related_album, post.related_artist)}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white"
                          >
                            Album · {post.related_album}
                          </Link>
                        )}
                        {post.related_song && (
                          <Link
                            href={relatedHref("song", post.related_song, post.related_artist)}
                            className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300 transition hover:border-white/20 hover:text-white"
                          >
                            Song · {post.related_song}
                          </Link>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                      <p>
                        {post.user_id ? (
                          <Link href={`/user/${post.user_id}`} className="text-zinc-300 hover:text-white">
                            {post.username}
                          </Link>
                        ) : (
                          <span className="text-zinc-300">{post.username}</span>
                        )}
                        {post.created_at ? ` · ${formatDate(post.created_at)}` : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => openComments(post.id)}
                        className="rounded-full border border-white/10 px-3 py-1.5 font-medium text-zinc-300 transition hover:border-white/20 hover:text-white"
                      >
                        {open ? "Hide comments" : `Comments · ${post.comment_count}`}
                      </button>
                    </div>

                    {open && (
                      <div className="mt-4 border-t border-white/[0.06] pt-4">
                        {status === "loading" && (
                          <p className="text-sm text-zinc-500">Loading comments...</p>
                        )}
                        {status === "error" && (
                          <p className="text-sm text-zinc-300">Could not load comments.</p>
                        )}
                        {status === "ready" && comments.length === 0 && (
                          <p className="text-sm text-zinc-500">No comments yet.</p>
                        )}
                        {status === "ready" && comments.length > 0 && (
                          <ul className="space-y-3">
                            {comments.map((comment) => (
                              <li
                                key={comment.id}
                                className="rounded-xl border border-white/[0.05] bg-black/30 px-3.5 py-3"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm text-zinc-200">
                                    {comment.user_id ? (
                                      <Link
                                        href={`/user/${comment.user_id}`}
                                        className="font-medium text-white hover:text-[#fa2d48]"
                                      >
                                        {comment.username}
                                      </Link>
                                    ) : (
                                      <span className="font-medium text-white">{comment.username}</span>
                                    )}
                                    {comment.created_at && (
                                      <span className="ml-2 text-xs font-normal text-zinc-500">
                                        {formatDate(comment.created_at)}
                                      </span>
                                    )}
                                  </p>
                                  {userId && comment.user_id === userId && (
                                    <button
                                      type="button"
                                      onClick={() => deleteComment(post.id, comment.id)}
                                      className="text-xs text-zinc-500 transition hover:text-[#fa2d48]"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                                  {comment.comment}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}

                        {userId ? (
                          <form
                            className="mt-4"
                            onSubmit={(event) => {
                              event.preventDefault()
                              publishComment(post.id)
                            }}
                          >
                            <textarea
                              className={`${fieldClass} min-h-20 resize-y`}
                              placeholder="Write a comment"
                              value={commentDrafts[post.id] || ""}
                              maxLength={1000}
                              onChange={(event) =>
                                setCommentDrafts((current) => ({
                                  ...current,
                                  [post.id]: event.target.value,
                                }))
                              }
                            />
                            {commentError && (
                              <p className="mt-2 text-sm text-[#fa2d48]">{commentError}</p>
                            )}
                            <button
                              type="submit"
                              disabled={postingComment}
                              className="mt-3 inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                            >
                              {postingComment ? "Posting..." : "Comment"}
                            </button>
                          </form>
                        ) : (
                          <p className="mt-4 text-sm text-zinc-400">Log in to comment</p>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  )
}
