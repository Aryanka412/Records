"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import AppShell from "../../components/AppShell"
import StarRating from "../../components/StarRating"
import LoadingScreen from "../../components/LoadingScreen"
import ReviewComments, { type ReviewComment } from "../../components/ReviewComments"
import { supabase } from "../../lib/supabaseClient"

type Song = {
  name: string
  artist: string
  album: string
  image: string
  spotify: string
}

type ArtistInfo = {
  name: string
  bio: string
  listeners: string
  playcount: string
  tags: string[]
}

type SavedReview = {
  id: number
  song_name: string
  artist: string
  album: string
  image: string
  spotify: string
  username: string
  user_id?: string | null
  rating: number
  review: string
  created_at: string
}

type ReviewLike = {
  id: number
  review_type: "song" | "album" | "artist"
  review_id: number
  user_id: string
  created_at: string
}

function formatStat(value: string | undefined | null): string | null {
  if (value == null || value === "") return null
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return null
  return num.toLocaleString()
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

function SongHero({
  song,
  avgRating,
  reviewCount,
}: {
  song: Song
  avgRating: number
  reviewCount: number
}) {
  return (
    <section className="relative overflow-hidden bg-black">
      {song.image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={song.image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-3xl saturate-150"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={song.image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-luminosity"
          />
        </>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/75 to-black" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/40" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-2/3 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(250,45,72,0.1),transparent)]" />

      <div className="relative z-10 mx-auto max-w-[88rem] px-5 pb-14 pt-10 sm:px-8 sm:pb-16 sm:pt-12 lg:px-12">
        <div className="grid items-end gap-10 lg:grid-cols-[minmax(240px,320px)_1fr] lg:gap-14 xl:grid-cols-[minmax(280px,360px)_1fr]">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto w-full max-w-xs lg:mx-0 lg:max-w-none"
          >
            <div className="absolute -inset-4 rounded-3xl bg-[#fa2d48]/15 blur-2xl" />
            {song.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.image}
                alt={song.name}
                className="relative aspect-square w-full rounded-2xl object-cover shadow-[0_32px_80px_rgba(0,0,0,0.65)] ring-1 ring-white/10"
              />
            ) : (
              <div className="relative aspect-square w-full rounded-2xl bg-zinc-900 ring-1 ring-white/10" />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="pb-1"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Song
              </span>
            </div>

            <h1 className="text-[clamp(2rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.5)]">
              {song.name}
            </h1>

            <p className="mt-4 text-xl font-medium text-zinc-300 sm:text-2xl">
              <Link
                href={`/artist/${encodeURIComponent(song.artist)}`}
                className="transition-colors hover:text-[#fa2d48]"
              >
                {song.artist}
              </Link>
            </p>

            {song.album && (
              <p className="mt-2 text-sm text-zinc-500 sm:text-base">
                from{" "}
                <Link
                  href={`/album/${encodeURIComponent(song.album + " " + song.artist)}`}
                  className="text-zinc-400 transition-colors hover:text-white"
                >
                  {song.album}
                </Link>
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Records score
                </p>
                <div className="mt-1.5 flex items-center gap-2.5">
                  <span className="text-3xl font-bold tabular-nums tracking-tight text-white">
                    {reviewCount > 0 ? avgRating.toFixed(1) : "—"}
                  </span>
                  {reviewCount > 0 && <StarRating rating={avgRating} size="md" />}
                </div>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Reviews
                </p>
                <p className="mt-1.5 text-3xl font-bold tabular-nums tracking-tight text-white">
                  {reviewCount}
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#review"
                className="inline-flex items-center justify-center rounded-full bg-[#fa2d48] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(250,45,72,0.35)] transition-all duration-300 hover:scale-[1.02] hover:bg-[#ff3d56]"
              >
                Write a review
              </a>
              {song.spotify && (
                <a
                  href={song.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/10"
                >
                  Open on Spotify
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function CommunityReviewCard({
  item,
  index,
  liked,
  likeCount,
  liking,
  reviewComments,
  onToggleLike,
  loggedIn,
  userId,
  accountName,
  allComments,
  setComments,
}: {
  item: SavedReview
  index: number
  liked: boolean
  likeCount: number
  liking: string
  reviewComments: ReviewComment[]
  onToggleLike: (item: SavedReview) => void
  loggedIn: boolean
  userId: string
  accountName: string
  allComments: ReviewComment[]
  setComments: (comments: ReviewComment[]) => void
}) {
  const likeKey = `song-${item.id}`

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]"
    >
      <div className="p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">
              {item.user_id ? (
                <Link
                  href={`/user/${item.user_id}`}
                  className="transition-colors hover:text-[#fa2d48]"
                >
                  {item.username || "Anonymous"}
                </Link>
              ) : (
                <span>{item.username || "Anonymous"}</span>
              )}
            </p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {formatRelativeDate(item.created_at)}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5">
            <span className="text-lg font-bold tabular-nums text-white">
              {Number(item.rating).toFixed(1)}
            </span>
            <StarRating rating={Number(item.rating)} />
          </div>
        </div>

        <p className="text-[15px] italic leading-relaxed text-zinc-400">
          &ldquo;{item.review}&rdquo;
        </p>

        <div className="mt-5 flex items-center justify-end">
          <button
            onClick={() => onToggleLike(item)}
            disabled={liking === likeKey}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              liked
                ? "border-[#fa2d48]/40 bg-[#fa2d48]/10 text-[#fa2d48]"
                : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:text-white"
            } disabled:opacity-50`}
          >
            <span className={liked ? "scale-110" : ""}>{liked ? "♥" : "♡"}</span>
            {likeCount}
          </button>
        </div>

        <ReviewComments
          reviewType="song"
          reviewId={item.id}
          comments={reviewComments}
          onCommentAdded={(comment) => setComments([...allComments, comment])}
          loggedIn={loggedIn}
          userId={userId}
          accountName={accountName}
        />
      </div>
    </motion.article>
  )
}

export default function SongPage() {
  const params = useParams()
  const name = decodeURIComponent(params.name as string)

  const [song, setSong] = useState<Song | null>(null)
  const [loadError, setLoadError] = useState("")
  const [artistInfo, setArtistInfo] = useState<ArtistInfo | null>(null)
  const [reviews, setReviews] = useState<SavedReview[]>([])
  const [likes, setLikes] = useState<ReviewLike[]>([])
  const [comments, setComments] = useState<ReviewComment[]>([])
  const [rating, setRating] = useState(0)
  const [username, setUsername] = useState("")
  const [accountName, setAccountName] = useState("")
  const [userId, setUserId] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)
  const [review, setReview] = useState("")
  const [saving, setSaving] = useState(false)
  const [liking, setLiking] = useState("")

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.length
      : 0

  const listenerCount = formatStat(artistInfo?.listeners)
  const playCount = formatStat(artistInfo?.playcount)
  const hasArtistStats = listenerCount != null || playCount != null

  useEffect(() => {
    async function getUser() {
      const { data } = await supabase.auth.getSession()
      const user = data.session?.user

      if (user) {
        setLoggedIn(true)
        setUserId(user.id)
        setAccountName(user.user_metadata?.username || user.email || "Anonymous")
      } else {
        setLoggedIn(false)
        setUserId("")
        setAccountName("")
      }
    }

    async function getLikes() {
      try {
        const res = await fetch("/api/review-likes")

        if (!res.ok) {
          setLikes([])
          return
        }

        const data = await res.json()

        if (Array.isArray(data)) {
          setLikes(data)
        } else {
          setLikes([])
        }
      } catch {
        setLikes([])
      }
    }

    async function getComments() {
      try {
        const res = await fetch("/api/review-comments")

        if (!res.ok) {
          setComments([])
          return
        }

        const text = await res.text()

        if (!text) {
          setComments([])
          return
        }

        const data = JSON.parse(text)

        if (Array.isArray(data)) {
          setComments(data)
        } else {
          setComments([])
        }
      } catch {
        setComments([])
      }
    }

    getUser()
    getLikes()
    getComments()
  }, [])

  useEffect(() => {
    async function getSong() {
      try {
        const res = await fetch(`/api/spotify-search?q=${encodeURIComponent(name)}`)
        const data = await res.json().catch(() => null)

        if (!data?.name) {
          setLoadError(
            typeof data?.error === "string" ? data.error : "Could not load this song."
          )
          return
        }

        setSong(data)

        const reviewRes = await fetch(
          `/api/reviews?song=${encodeURIComponent(data.name)}`
        )
        const reviewData = await reviewRes.json().catch(() => null)
        if (Array.isArray(reviewData)) setReviews(reviewData)

        if (data.artist) {
          const artistRes = await fetch(
            `/api/artist-info?artist=${encodeURIComponent(data.artist)}`
          )
          const artistData = await artistRes.json().catch(() => null)
          if (artistData && !artistData.error) setArtistInfo(artistData)
        }
      } catch {
        setLoadError("Could not load this song.")
      }
    }

    getSong()
  }, [name])

  function getLikeKey(item: SavedReview) {
    return `song-${item.id}`
  }

  function getLikeCount(item: SavedReview) {
    return likes.filter(
      (like) =>
        like.review_type === "song" &&
        Number(like.review_id) === Number(item.id)
    ).length
  }

  function hasLiked(item: SavedReview) {
    return likes.some(
      (like) =>
        like.review_type === "song" &&
        Number(like.review_id) === Number(item.id) &&
        like.user_id === userId
    )
  }

  function getReviewComments(item: SavedReview) {
    return comments.filter(
      (comment) =>
        comment.review_type === "song" &&
        Number(comment.review_id) === Number(item.id)
    )
  }

  async function toggleLike(item: SavedReview) {
    if (!userId) {
      alert("Log in to like reviews.")
      return
    }

    const likeKey = getLikeKey(item)
    const alreadyLiked = hasLiked(item)

    setLiking(likeKey)

    try {
      if (alreadyLiked) {
        const res = await fetch(
          `/api/review-likes?review_type=song&review_id=${item.id}&user_id=${userId}`,
          {
            method: "DELETE",
          }
        )

        const data = await res.json()

        if (data.success) {
          setLikes(
            likes.filter(
              (like) =>
                !(
                  like.review_type === "song" &&
                  Number(like.review_id) === Number(item.id) &&
                  like.user_id === userId
                )
            )
          )
        } else {
          alert(data.error || "Unlike failed.")
        }
      } else {
        const res = await fetch("/api/review-likes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            review_type: "song",
            review_id: item.id,
            user_id: userId,
          }),
        })

        const data = await res.json()

        if (data.success) {
          const newLike: ReviewLike = {
            id: Date.now(),
            review_type: "song",
            review_id: item.id,
            user_id: userId,
            created_at: new Date().toISOString(),
          }

          setLikes([newLike, ...likes])
        } else {
          alert(data.error || "Like failed.")
        }
      }
    } catch {
      alert("Like failed. Check your connection and try again.")
    }

    setLiking("")
  }

  async function saveReview() {
    if (!song) return

    if (!review.trim()) {
      alert("Write a review first.")
      return
    }

    const finalUsername = loggedIn
      ? accountName || "Anonymous"
      : username || "Anonymous"

    setSaving(true)

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          song_name: song.name,
          artist: song.artist,
          album: song.album,
          image: song.image,
          spotify: song.spotify,
          rating: rating,
          review: review,
          username: finalUsername,
          user_id: loggedIn ? userId : null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        const newReview: SavedReview = {
          id: Date.now(),
          song_name: song.name,
          artist: song.artist,
          album: song.album,
          image: song.image,
          spotify: song.spotify,
          username: finalUsername,
          user_id: loggedIn ? userId : null,
          rating: rating,
          review: review,
          created_at: new Date().toISOString(),
        }

        setReviews([newReview, ...reviews])
        setUsername("")
        setReview("")
        alert("Review saved!")
      } else {
        alert(data.error || "Something went wrong.")
      }
    } catch {
      alert("Save failed. Check your connection and try again.")
    }

    setSaving(false)
  }

  if (loadError) {
    return (
      <AppShell>
        <p className="mx-auto max-w-lg px-6 py-24 text-center text-sm text-zinc-300">{loadError}</p>
      </AppShell>
    )
  }

  if (!song) {
    return <LoadingScreen message="Loading song..." />
  }

  return (
    <AppShell>
      <SongHero song={song} avgRating={avgRating} reviewCount={reviews.length} />

      <section className="mx-auto grid max-w-[88rem] gap-8 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[1fr_380px] lg:gap-10 lg:px-12 xl:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          {/* Artist info */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm">
            <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
                About the artist
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {artistInfo?.name || song.artist}
              </h2>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <p className="text-[15px] leading-7 text-zinc-400">
                {artistInfo?.bio || "Loading artist information..."}
              </p>

              {hasArtistStats && (
                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {listenerCount != null && (
                    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Last.fm listeners
                      </p>
                      <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">
                        {listenerCount}
                      </p>
                    </div>
                  )}
                  {playCount != null && (
                    <div className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                        Last.fm scrobbles
                      </p>
                      <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">
                        {playCount}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {artistInfo?.tags && artistInfo.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {artistInfo.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium capitalize text-zinc-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Community reviews */}
          <div>
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
                Community
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Reviews
              </h2>
              <p className="mt-1.5 text-sm text-zinc-500">
                {reviews.length === 0
                  ? "No one has reviewed this song yet."
                  : `${reviews.length} review${reviews.length === 1 ? "" : "s"} from the Records community`}
              </p>
            </div>

            <div className="space-y-4">
              {reviews.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                  <p className="text-zinc-500">
                    No reviews yet. Be the first to review this song.
                  </p>
                  <a
                    href="#review"
                    className="mt-5 inline-flex rounded-full bg-[#fa2d48] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#ff3d56]"
                  >
                    Write the first review
                  </a>
                </div>
              )}

              {reviews.map((item, index) => (
                <CommunityReviewCard
                  key={item.id}
                  item={item}
                  index={index}
                  liked={hasLiked(item)}
                  likeCount={getLikeCount(item)}
                  liking={liking}
                  reviewComments={getReviewComments(item)}
                  onToggleLike={toggleLike}
                  loggedIn={loggedIn}
                  userId={userId}
                  accountName={accountName}
                  allComments={comments}
                  setComments={setComments}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Review form */}
        <aside
          id="review"
          className="h-fit lg:sticky lg:top-20"
        >
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <div className="border-b border-white/[0.06] px-6 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Your take
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">Write a review</h2>
            </div>

            <div className="p-6">
              {loggedIn ? (
                <p className="mb-6 text-sm text-zinc-500">
                  Logged in as{" "}
                  <span className="font-medium text-zinc-200">{accountName}</span>
                </p>
              ) : (
                <p className="mb-6 text-sm text-zinc-500">
                  Not logged in — you can still review with a display name.
                </p>
              )}

              <div className="mb-6 rounded-xl border border-white/[0.06] bg-black/25 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Your score</p>
                  <p className="text-3xl font-bold tabular-nums text-white">
                    {rating.toFixed(1)}
                  </p>
                </div>
                <StarRating rating={rating} size="md" />
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="mt-4 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#fa2d48] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
                <div className="mt-2 flex justify-between text-xs text-zinc-600">
                  <span>0</span>
                  <span>10</span>
                </div>
              </div>

              {!loggedIn && (
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your name..."
                  className="mb-4 w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20 focus:bg-black/40"
                />
              )}

              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="What did this song make you feel? Share your thoughts..."
                className="h-36 w-full resize-none rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20 focus:bg-black/40"
              />

              <button
                onClick={saveReview}
                disabled={saving}
                className="mt-5 w-full rounded-full bg-[#fa2d48] py-3.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(250,45,72,0.3)] transition-all hover:bg-[#ff3d56] disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save review"}
              </button>
            </div>
          </div>
        </aside>
      </section>
    </AppShell>
  )
}
