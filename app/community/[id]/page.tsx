"use client"

import { useEffect, useState } from "react"
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
  creator_username: string
  created_at: string
  member_count: number
  post_count: number
}

type Post = {
  id: number
  title: string
  body: string
  post_type: string
  rating: number | null
  username: string
  user_id: string | null
  created_at: string
  comment_count: number
  related_artist: string | null
  related_album: string | null
  related_song: string | null
}

type Comment = {
  id: number
  post_id: number
  user_id: string | null
  username: string
  comment: string
  created_at: string
}

type SessionUser = {
  id: string
  username: string
}

function bannerImage(value: string | null) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol === "https:" || url.protocol === "http:") return url.href
  } catch {
    return null
  }
  return null
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default function CommunityDetailPage() {
  const params = useParams<{ id: string }>()
  const communityId = String(params.id || "")
  const [user, setUser] = useState<SessionUser | null>(null)
  const [community, setCommunity] = useState<Community | null>(null)
  const [joined, setJoined] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [postsError, setPostsError] = useState("")
  const [pageError, setPageError] = useState("")
  const [joining, setJoining] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [postType, setPostType] = useState("Discussion")
  const [rating, setRating] = useState("")
  const [relatedArtist, setRelatedArtist] = useState("")
  const [relatedAlbum, setRelatedAlbum] = useState("")
  const [relatedSong, setRelatedSong] = useState("")
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState("")
  const [openPostId, setOpenPostId] = useState<number | null>(null)
  const [comments, setComments] = useState<Record<number, Comment[]>>({})
  const [commentError, setCommentError] = useState("")
  const [drafts, setDrafts] = useState<Record<number, string>>({})
  const [commenting, setCommenting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user
      setUser(
        sessionUser
          ? {
              id: sessionUser.id,
              username: sessionUser.user_metadata?.username || sessionUser.email || "Anonymous",
            }
          : null
      )
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(
        session?.user
          ? {
              id: session.user.id,
              username: session.user.user_metadata?.username || session.user.email || "Anonymous",
            }
          : null
      )
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!communityId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setPageError("")
      setPostsError("")
      try {
        const [communityRes, postsRes] = await Promise.all([
          fetch(`/api/communities?id=${encodeURIComponent(communityId)}`),
          fetch(`/api/community-posts?community_id=${encodeURIComponent(communityId)}`),
        ])
        const communityData = await communityRes.json().catch(() => null)
        const postsData = await postsRes.json().catch(() => null)
        if (cancelled) return
        if (!communityRes.ok || !communityData?.id) {
          setPageError(typeof communityData?.error === "string" ? communityData.error : "Could not load communities.")
          setCommunity(null)
        } else {
          setCommunity(communityData)
        }
        if (!postsRes.ok || !Array.isArray(postsData)) {
          setPostsError("Could not load posts.")
          setPosts([])
        } else {
          setPosts(postsData)
        }
      } catch {
        if (!cancelled) {
          setPageError("Could not load communities.")
          setPostsError("Could not load posts.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [communityId])

  useEffect(() => {
    if (!user || !communityId) {
      setJoined(false)
      return
    }
    let cancelled = false
    fetch(
      `/api/community-members?community_id=${encodeURIComponent(communityId)}&user_id=${encodeURIComponent(user.id)}`
    )
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (!cancelled) setJoined(Boolean(data?.joined))
      })
      .catch(() => {
        if (!cancelled) setJoined(false)
      })
    return () => {
      cancelled = true
    }
  }, [user, communityId])

  async function toggleJoin() {
    if (!user || !community) return
    setJoining(true)
    try {
      const response = joined
        ? await fetch(
            `/api/community-members?community_id=${community.id}&user_id=${encodeURIComponent(user.id)}`,
            { method: "DELETE" }
          )
        : await fetch("/api/community-members", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              community_id: community.id,
              user_id: user.id,
              username: user.username,
            }),
          })
      if (!response.ok && response.status !== 409) return
      const nextJoined = !joined || response.status === 409
      setJoined(nextJoined)
      setCommunity((current) =>
        current
          ? {
              ...current,
              member_count: Math.max(0, current.member_count + (joined && response.ok ? -1 : nextJoined && !joined ? 1 : 0)),
            }
          : current
      )
    } finally {
      setJoining(false)
    }
  }

  async function createPost(event: React.FormEvent) {
    event.preventDefault()
    if (!user || !community) return
    setPosting(true)
    setPostError("")
    try {
      const response = await fetch("/api/community-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community_id: community.id,
          user_id: user.id,
          username: user.username,
          title,
          body,
          post_type: postType,
          rating,
          related_artist: relatedArtist,
          related_album: relatedAlbum,
          related_song: relatedSong,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.id) {
        setPostError(typeof data?.error === "string" ? data.error : "Could not load posts.")
        return
      }
      setPosts((current) => [data, ...current])
      setCommunity((current) => (current ? { ...current, post_count: current.post_count + 1 } : current))
      setTitle("")
      setBody("")
      setRating("")
      setRelatedArtist("")
      setRelatedAlbum("")
      setRelatedSong("")
    } catch {
      setPostError("Could not load posts.")
    } finally {
      setPosting(false)
    }
  }

  async function toggleComments(postId: number) {
    if (openPostId === postId) {
      setOpenPostId(null)
      return
    }
    setOpenPostId(postId)
    setCommentError("")
    if (comments[postId]) return
    try {
      const response = await fetch(`/api/community-comments?post_id=${postId}`)
      const data = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(data)) {
        setCommentError("Could not load comments.")
        setComments((current) => ({ ...current, [postId]: [] }))
        return
      }
      setComments((current) => ({ ...current, [postId]: data }))
    } catch {
      setCommentError("Could not load comments.")
    }
  }

  async function addComment(postId: number) {
    if (!user) return
    const text = (drafts[postId] || "").trim()
    if (!text) return
    setCommenting(true)
    setCommentError("")
    try {
      const response = await fetch("/api/community-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          user_id: user.id,
          username: user.username,
          comment: text,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.id) {
        setCommentError("Could not load comments.")
        return
      }
      setComments((current) => ({ ...current, [postId]: [...(current[postId] || []), data] }))
      setPosts((current) =>
        current.map((post) => (post.id === postId ? { ...post, comment_count: post.comment_count + 1 } : post))
      )
      setDrafts((current) => ({ ...current, [postId]: "" }))
    } catch {
      setCommentError("Could not load comments.")
    } finally {
      setCommenting(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <p className="px-6 py-16 text-sm text-zinc-400">Loading communities...</p>
      </AppShell>
    )
  }

  if (!community) {
    return (
      <AppShell>
        <p className="px-6 py-16 text-sm text-white">{pageError || "Could not load communities."}</p>
      </AppShell>
    )
  }

  const banner = bannerImage(community.image_url)
  const bannerStyle = banner
    ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.82)), url("${banner.replace(/"/g, "")}")` }
    : undefined

  return (
    <AppShell>
      <div className="mx-auto grid max-w-[88rem] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-12">
        <div>
          <header
            className="overflow-hidden rounded-3xl border border-white/[0.06] bg-[#141414] bg-cover bg-center p-6 sm:p-8"
            style={bannerStyle}
          >
            <a href="/community" className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              Communities
            </a>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-white">
                {community.category}
              </span>
              {community.genre && (
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-white">
                  {community.genre}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">{community.name}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">{community.description}</p>
            <p className="mt-4 text-sm text-zinc-400">
              {community.member_count} members · {community.post_count} posts
            </p>
            <div className="mt-5">
              {user ? (
                <button type="button" disabled={joining} onClick={toggleJoin} className={joined ? "btn btn-secondary" : "btn btn-primary"}>
                  {joining ? "Saving..." : joined ? "Leave" : "Join"}
                </button>
              ) : (
                <a href="/login" className="btn btn-secondary">Log in to join</a>
              )}
            </div>
          </header>

          {user && joined && (
            <form onSubmit={createPost} className="glass-panel mt-6 space-y-3 p-5">
              <h2 className="text-lg font-semibold text-white">Start a discussion</h2>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="Title" className="input-field" />
              <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Body" className="input-field min-h-28" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={postType} onChange={(event) => setPostType(event.target.value)} className="input-field">
                  {POST_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <input value={rating} onChange={(event) => setRating(event.target.value)} type="number" min="0" max="10" step="0.1" placeholder="Rating, optional" className="input-field" />
                <input value={relatedArtist} onChange={(event) => setRelatedArtist(event.target.value)} placeholder="Related artist" className="input-field" />
                <input value={relatedAlbum} onChange={(event) => setRelatedAlbum(event.target.value)} placeholder="Related album" className="input-field" />
                <input value={relatedSong} onChange={(event) => setRelatedSong(event.target.value)} placeholder="Related song" className="input-field sm:col-span-2" />
              </div>
              {postError && <p className="text-sm text-white">{postError}</p>}
              <button type="submit" disabled={posting} className="btn btn-primary">
                {posting ? "Posting..." : "Post"}
              </button>
            </form>
          )}

          {user && !joined && (
            <p className="mt-6 text-sm text-zinc-400">Join this community to start a discussion.</p>
          )}

          <section className="mt-6 space-y-4">
            {postsError && <p className="text-sm text-white">{postsError}</p>}
            {!postsError && posts.length === 0 && (
              <p className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-sm text-zinc-400">
                No posts yet.
              </p>
            )}
            {posts.map((post) => {
              const related = [post.related_artist, post.related_album, post.related_song].filter(Boolean)
              const open = openPostId === post.id
              const postComments = comments[post.id]
              return (
                <article key={post.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#fa2d48]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fa2d48]">
                      {post.post_type}
                    </span>
                    {post.rating != null && (
                      <span className="text-sm font-semibold text-white">{post.rating}/10</span>
                    )}
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-white">{post.title}</h3>
                  {post.body && <p className="mt-2 line-clamp-4 text-sm leading-6 text-zinc-400">{post.body}</p>}
                  {related.length > 0 && (
                    <p className="mt-3 text-xs text-zinc-500">{related.join(" · ")}</p>
                  )}
                  <p className="mt-4 text-xs text-zinc-500">
                    {post.username} · {formatDate(post.created_at)} · {post.comment_count} comments
                  </p>
                  <button type="button" onClick={() => toggleComments(post.id)} className="btn btn-ghost mt-3 !px-0">
                    {open ? "Hide comments" : "Comments"}
                  </button>
                  {open && (
                    <div className="mt-3 space-y-3 border-t border-white/[0.06] pt-3">
                      {commentError && <p className="text-sm text-white">{commentError}</p>}
                      {!postComments && !commentError && <p className="text-sm text-zinc-500">Loading comments...</p>}
                      {postComments?.length === 0 && !commentError && <p className="text-sm text-zinc-500">No comments yet.</p>}
                      {postComments?.map((comment) => (
                        <div key={comment.id} className="rounded-xl bg-black/25 px-3 py-3">
                          <p className="text-sm text-zinc-200">{comment.comment}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {comment.username} · {formatDate(comment.created_at)}
                          </p>
                        </div>
                      ))}
                      {user ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault()
                            void addComment(post.id)
                          }}
                          className="flex flex-col gap-2 sm:flex-row"
                        >
                          <input
                            value={drafts[post.id] || ""}
                            onChange={(event) => setDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                            placeholder="Write a comment"
                            className="input-field"
                          />
                          <button type="submit" disabled={commenting} className="btn btn-secondary">
                            Comment
                          </button>
                        </form>
                      ) : (
                        <p className="text-sm text-zinc-400">Log in to comment</p>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        </div>

        <aside className="space-y-4 lg:pt-2">
          <section className="glass-panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">About</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{community.description || "No description yet."}</p>
            <p className="mt-4 text-xs text-zinc-500">Created by {community.creator_username}</p>
          </section>
          <section className="glass-panel p-5">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Rules</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
              {community.rules || "Be specific, cite the music, and keep the argument about the work."}
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}
