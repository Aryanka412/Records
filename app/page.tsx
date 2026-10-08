"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import AppShell from "./components/AppShell"
import StarRating from "./components/StarRating"
import TypeBadge from "./components/TypeBadge"
import { supabase } from "./lib/supabaseClient"

type Track = {
  name: string
  artist: string
  playcount: string
  album: string
  image: string
  spotify: string
}

type Review = {
  id: number
  type: "song" | "album" | "artist"
  title: string
  artist: string
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

type HeroArtist = {
  name: string
  image: string
  spotify: string
  spotifyId: string
  topTrack: string
  topTrackImage: string
  genres: string[]
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

function SectionHeading({
  label,
  title,
  subtitle,
  action,
}: {
  label?: string
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {label && (
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fa2d48]">
            {label}
          </p>
        )}
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.05]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2.5 text-base leading-relaxed text-zinc-500 sm:text-lg">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}

function HomeHeroSection() {
  const [artists, setArtists] = useState<HeroArtist[]>([])
  const [index, setIndex] = useState(0)
  const [heroNote, setHeroNote] = useState("")

  useEffect(() => {
    fetch("/api/featured-hero")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setArtists(data)
          return
        }
        setHeroNote(
          typeof data?.message === "string"
            ? data.message
            : "Featured artists will show here once Spotify responds."
        )
      })
      .catch(() => {
        setHeroNote("Featured artists could not be loaded.")
      })
  }, [])

  useEffect(() => {
    if (artists.length <= 1) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % artists.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [artists.length])

  const active = artists[index]

  if (!active) {
    return (
      <section className="relative flex min-h-[52vh] items-end overflow-hidden bg-black sm:min-h-[58vh]">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(250,45,72,0.12),transparent)]" />
        <div className="relative z-10 mx-auto w-full max-w-[88rem] px-5 pb-12 pt-28 sm:px-8 sm:pb-16 lg:px-12">
          <p className="section-label mb-4">Records</p>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            Rate the music you love
          </h1>
          <p className="mt-4 max-w-xl text-base text-zinc-300">
            {heroNote || "Loading featured artists…"}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="relative min-h-[88vh] overflow-hidden bg-black sm:min-h-[92vh]">
      <AnimatePresence mode="sync">
        <motion.div
          key={active.spotifyId}
          className="absolute -inset-[10%]"
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.image}
            alt=""
            aria-hidden
            className="h-full w-full object-cover object-[center_20%] saturate-[0.85] contrast-[1.08]"
          />
        </motion.div>
      </AnimatePresence>

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1/2 bg-[radial-gradient(ellipse_90%_60%_at_50%_100%,rgba(250,45,72,0.12),transparent)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-[88vh] max-w-[88rem] flex-col justify-end px-5 pb-10 pt-28 sm:min-h-[92vh] sm:px-8 sm:pb-14 sm:pt-32 lg:px-12">
        <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto] lg:gap-16">
          <motion.div
            key={`text-${active.spotifyId}`}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#fa2d48] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#fa2d48]" />
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                Featured artist
              </span>
            </div>

            <h1 className="max-w-4xl text-[clamp(2.75rem,11vw,6.5rem)] font-extrabold leading-[0.92] tracking-[-0.04em] text-white drop-shadow-[0_8px_48px_rgba(0,0,0,0.5)]">
              {active.name}
            </h1>

            {active.genres.length > 0 && (
              <p className="mt-4 text-sm capitalize tracking-wide text-zinc-400 sm:text-base">
                {active.genres.slice(0, 4).join(" · ")}
              </p>
            )}

            <p className="mt-5 max-w-xl text-sm text-zinc-500 sm:text-base">
              Trending track{" "}
              <span className="font-medium text-zinc-200">{active.topTrack}</span>
            </p>

            <div className="mt-8 flex flex-wrap gap-3 sm:mt-10">
              <Link
                href={`/artist/${encodeURIComponent(active.name)}`}
                className="inline-flex items-center justify-center rounded-full bg-[#fa2d48] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(250,45,72,0.35)] transition-all duration-300 hover:scale-[1.02] hover:bg-[#ff3d56] hover:shadow-[0_12px_40px_rgba(250,45,72,0.45)] active:scale-[0.98]"
              >
                Explore {active.name}
              </Link>
              <Link
                href="/discover"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-white/10"
              >
                Discover music
              </Link>
            </div>

            {artists.length > 1 && (
              <div className="mt-10 flex items-center gap-2">
                {artists.map((artist, dotIndex) => (
                  <button
                    key={artist.spotifyId}
                    type="button"
                    className={`h-[3px] rounded-full transition-all duration-300 ${
                      dotIndex === index
                        ? "w-10 bg-white"
                        : "w-6 bg-white/25 hover:bg-white/40"
                    }`}
                    onClick={() => setIndex(dotIndex)}
                    aria-label={`Show ${artist.name}`}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {active.topTrackImage && (
            <motion.div
              key={`art-${active.spotifyId}`}
              initial={{ opacity: 0, x: 40, rotate: 3 }}
              animate={{ opacity: 1, x: 0, rotate: 2 }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block"
            >
              <div className="relative">
                <div className="absolute -inset-6 rounded-3xl bg-[#fa2d48]/20 blur-3xl" />
                <div className="relative rotate-2 overflow-hidden rounded-2xl border border-white/10 shadow-[0_32px_80px_rgba(0,0,0,0.7)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={active.topTrackImage}
                    alt={active.topTrack}
                    className="aspect-square w-56 object-cover xl:w-64"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}

function ReviewCard({
  item,
  index,
  liking,
  liked,
  likeCount,
  onToggleLike,
  getReviewLink,
  showLike = true,
}: {
  item: Review
  index: number
  liking: string
  liked: boolean
  likeCount: number
  onToggleLike: (item: Review) => void
  getReviewLink: (item: Review) => string
  showLike?: boolean
}) {
  const likeKey = `${item.type}-${item.id}`
  const reviewLink = getReviewLink(item)

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm transition-all duration-500 hover:border-white/10 hover:bg-white/[0.05] hover:shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
    >
      {item.image && (
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 opacity-[0.07] blur-2xl transition-opacity duration-500 group-hover:opacity-[0.12]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="relative p-5 sm:p-6">
        <Link href={reviewLink} className="mb-5 flex items-start gap-4">
          <div className="relative shrink-0">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.title}
                className={`h-[4.5rem] w-[4.5rem] object-cover shadow-[0_12px_40px_rgba(0,0,0,0.55)] transition-transform duration-500 group-hover:scale-[1.03] sm:h-20 sm:w-20 ${
                  item.type === "artist" ? "rounded-full" : "rounded-xl"
                }`}
              />
            ) : (
              <div className="h-[4.5rem] w-[4.5rem] rounded-xl bg-zinc-800/80 sm:h-20 sm:w-20" />
            )}
            <div className="absolute -bottom-1 -right-1 rounded-md border border-black/40 bg-black/70 px-1.5 py-0.5 backdrop-blur-sm">
              <TypeBadge type={item.type} />
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-lg font-semibold tracking-tight text-white transition-colors group-hover:text-[#fa2d48]">
              {item.title}
            </h3>
            <p className="mt-0.5 truncate text-sm text-zinc-500">{item.artist}</p>
          </div>
        </Link>

        <div className="mb-4 flex items-center gap-3">
          <span className="text-2xl font-bold tabular-nums tracking-tight text-white">
            {Number(item.rating).toFixed(1)}
          </span>
          <StarRating rating={Number(item.rating)} size="md" />
        </div>

        <Link href={reviewLink}>
          <p className="line-clamp-4 text-[15px] italic leading-relaxed text-zinc-400 transition-colors hover:text-zinc-200">
            &ldquo;{item.review}&rdquo;
          </p>
        </Link>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div className="min-w-0">
            <p className="text-xs text-zinc-600">{formatRelativeDate(item.created_at)}</p>
            <p className="mt-0.5 truncate text-sm">
              {item.user_id ? (
                <Link
                  href={`/user/${item.user_id}`}
                  className="font-medium text-zinc-300 transition-colors hover:text-[#fa2d48]"
                >
                  {item.username}
                </Link>
              ) : (
                <span className="text-zinc-500">{item.username}</span>
              )}
            </p>
          </div>

          {showLike && (
            <button
              onClick={() => onToggleLike(item)}
              disabled={liking === likeKey}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                liked
                  ? "border-[#fa2d48]/40 bg-[#fa2d48]/10 text-[#fa2d48]"
                  : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:text-white"
              } disabled:opacity-50`}
            >
              <span className={liked ? "scale-110" : ""}>{liked ? "♥" : "♡"}</span>
              {likeCount}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  )
}

export default function Home() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [feed, setFeed] = useState<Review[]>([])
  const [likes, setLikes] = useState<ReviewLike[]>([])
  const [userId, setUserId] = useState("")
  const [liking, setLiking] = useState("")
  const [tracksNote, setTracksNote] = useState("")

  useEffect(() => {
    async function getUser() {
      try {
        const { data } = await supabase.auth.getSession()
        const user = data.session?.user
        setUserId(user ? user.id : "")
      } catch {
        setUserId("")
      }
    }

    async function getTracks() {
      try {
        const res = await fetch("/api/trending-with-covers")
        const data = await res.json()
        if (Array.isArray(data)) {
          setTracks(data)
          if (data.length === 0) setTracksNote("No trending tracks came back.")
          return
        }
        setTracks([])
        setTracksNote(
          typeof data?.message === "string"
            ? data.message
            : typeof data?.error === "string"
              ? data.error
              : "Trending tracks could not be loaded."
        )
      } catch {
        setTracks([])
        setTracksNote("Trending tracks could not be loaded.")
      }
    }

    async function getLikes() {
      try {
        const res = await fetch("/api/review-likes")
        const data = await res.json().catch(() => null)
        setLikes(Array.isArray(data) ? data : [])
      } catch {
        setLikes([])
      }
    }

    async function getReviews() {
      const [songRes, albumRes, artistRes] = await Promise.all([
        fetch("/api/reviews"),
        fetch("/api/album-reviews"),
        fetch("/api/artist-reviews"),
      ])

      const [songData, albumData, artistData] = await Promise.all([
        songRes.json().catch(() => null),
        albumRes.json().catch(() => null),
        artistRes.json().catch(() => null),
      ])

      const songReviews: Review[] = Array.isArray(songData)
        ? songData.map((item) => ({
            id: item.id,
            type: "song" as const,
            title: item.song_name,
            artist: item.artist,
            image: item.image,
            spotify: item.spotify,
            username: item.username || "Anonymous",
            user_id: item.user_id || null,
            rating: item.rating,
            review: item.review,
            created_at: item.created_at,
          }))
        : []

      const albumReviews: Review[] = Array.isArray(albumData)
        ? albumData.map((item) => ({
            id: item.id,
            type: "album" as const,
            title: item.album_name,
            artist: item.artist,
            image: item.image,
            spotify: item.spotify,
            username: item.username || "Anonymous",
            user_id: item.user_id || null,
            rating: item.rating,
            review: item.review,
            created_at: item.created_at,
          }))
        : []

      const artistReviews: Review[] = Array.isArray(artistData)
        ? artistData.map((item) => ({
            id: item.id,
            type: "artist" as const,
            title: item.artist_name,
            artist: "Artist",
            image: item.image,
            spotify: item.spotify,
            username: item.username || "Anonymous",
            user_id: item.user_id || null,
            rating: item.rating,
            review: item.review,
            created_at: item.created_at,
          }))
        : []

      const allReviews = [...songReviews, ...albumReviews, ...artistReviews].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setReviews(allReviews)
    }

    getUser()
    getTracks()
    getReviews().catch(() => setReviews([]))
    getLikes()
  }, [])

  useEffect(() => {
    async function getFeed() {
      if (!userId) {
        setFeed([])
        return
      }

      try {
        const res = await fetch(`/api/feed?user_id=${userId}`)
        const data = await res.json().catch(() => null)
        setFeed(Array.isArray(data) ? data : [])
      } catch {
        setFeed([])
      }
    }

    getFeed()
  }, [userId])

  function getReviewLink(item: Review) {
    if (item.type === "song") {
      return `/song/${encodeURIComponent(item.title + " " + item.artist)}`
    }
    if (item.type === "album") {
      return `/album/${encodeURIComponent(item.title + " " + item.artist)}`
    }
    return `/artist/${encodeURIComponent(item.title)}`
  }

  function getLikeKey(item: Review) {
    return `${item.type}-${item.id}`
  }

  function getLikeCount(item: Review) {
    return likes.filter(
      (like) =>
        like.review_type === item.type &&
        Number(like.review_id) === Number(item.id)
    ).length
  }

  function hasLiked(item: Review) {
    return likes.some(
      (like) =>
        like.review_type === item.type &&
        Number(like.review_id) === Number(item.id) &&
        like.user_id === userId
    )
  }

  async function toggleLike(item: Review) {
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
          `/api/review-likes?review_type=${item.type}&review_id=${item.id}&user_id=${userId}`,
          { method: "DELETE" }
        )
        const data = await res.json()
        if (data.success) {
          setLikes(
            likes.filter(
              (like) =>
                !(
                  like.review_type === item.type &&
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_type: item.type,
            review_id: item.id,
            user_id: userId,
          }),
        })
        const data = await res.json()
        if (data.success) {
          setLikes([
            {
              id: Date.now(),
              review_type: item.type,
              review_id: item.id,
              user_id: userId,
              created_at: new Date().toISOString(),
            },
            ...likes,
          ])
        } else {
          alert(data.error || "Like failed.")
        }
      }
    } catch {
      alert("Like failed. Check your connection and try again.")
    }

    setLiking("")
  }

  const featuredTrack = tracks[0]
  const restTracks = tracks.slice(1)

  return (
    <AppShell bleed>
      <HomeHeroSection />

      <div className="relative mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(100%,48rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Trending */}
        <section className="relative py-16 sm:py-20 lg:py-24">
          <SectionHeading
            label="Trending Now"
            title="What everyone's listening to"
            subtitle="The hottest tracks on Last.fm right now — tap any cover to review it"
            action={
              <Link
                href="/discover"
                className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-zinc-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              >
                See all
                <span aria-hidden className="text-zinc-500">→</span>
              </Link>
            }
          />

          {featuredTrack && (
            <Link
              href={`/song/${encodeURIComponent(featuredTrack.name + " " + featuredTrack.artist)}`}
              className="group mb-8 block"
            >
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-1"
              >
                <div className="relative flex flex-col overflow-hidden rounded-[1.35rem] sm:flex-row">
                  <div className="relative aspect-square w-full shrink-0 sm:aspect-auto sm:h-64 sm:w-64 lg:h-72 lg:w-72">
                    {featuredTrack.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={featuredTrack.image}
                        alt={featuredTrack.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                        <span className="text-6xl font-black text-white/20">1</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-black/20" />
                    <span className="absolute left-4 top-4 rounded-full bg-[#fa2d48] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-lg">
                      #1 Trending
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col justify-center p-6 sm:p-8 lg:p-10">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Top track
                    </p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-white transition-colors group-hover:text-[#fa2d48] sm:text-3xl lg:text-4xl">
                      {featuredTrack.name}
                    </h3>
                    <p className="mt-2 text-base text-zinc-400 sm:text-lg">{featuredTrack.artist}</p>
                    {featuredTrack.album && (
                      <p className="mt-1 text-sm text-zinc-600">{featuredTrack.album}</p>
                    )}
                    <p className="mt-4 text-sm text-zinc-500">
                      {Number(featuredTrack.playcount).toLocaleString()} plays worldwide
                    </p>
                    <span className="mt-6 inline-flex w-fit items-center rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-transform duration-300 group-hover:scale-[1.02]">
                      Write a review
                    </span>
                  </div>
                </div>
              </motion.div>
            </Link>
          )}

          {tracks.length === 0 && tracksNote && (
            <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-zinc-200">
              {tracksNote}
            </p>
          )}

          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 scroll-smooth [scrollbar-width:thin] sm:gap-5">
            {(featuredTrack ? restTracks : tracks).map((track, index) => {
              const rank = featuredTrack ? index + 2 : index + 1
              return (
                <Link
                  key={track.name + index}
                  href={`/song/${encodeURIComponent(track.name + " " + track.artist)}`}
                  className="group shrink-0 snap-start"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, delay: index * 0.04 }}
                    className="w-40 sm:w-48 md:w-52"
                  >
                    <div className="relative mb-3.5 aspect-square overflow-hidden rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_24px_56px_rgba(0,0,0,0.6)]">
                      {track.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={track.image}
                          alt={track.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                          <span className="text-3xl font-black text-white/30">{rank}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-60 transition-opacity group-hover:opacity-90" />
                      <span className="absolute left-2.5 top-2.5 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[11px] font-bold tabular-nums text-white backdrop-blur-md">
                        #{rank}
                      </span>
                      <div className="absolute inset-x-0 bottom-0 translate-y-2 p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <span className="inline-flex rounded-full bg-[#fa2d48] px-3 py-1 text-[11px] font-semibold text-white">
                          Review
                        </span>
                      </div>
                    </div>
                    <h3 className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[#fa2d48]">
                      {track.name}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{track.artist}</p>
                    <p className="mt-1 text-[11px] tabular-nums text-zinc-600">
                      {Number(track.playcount).toLocaleString()} plays
                    </p>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Following feed */}
        {userId && feed.length > 0 && (
          <section className="relative pb-16 sm:pb-20">
            <div className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-[#fa2d48]/[0.04] blur-3xl" />

            <SectionHeading
              label="Following"
              title="From your circle"
              subtitle="Fresh reviews from people you follow"
            />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {feed.slice(0, 6).map((item, index) => (
                <ReviewCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  index={index}
                  liking={liking}
                  liked={hasLiked(item)}
                  likeCount={getLikeCount(item)}
                  onToggleLike={toggleLike}
                  getReviewLink={getReviewLink}
                  showLike={false}
                />
              ))}
            </div>
          </section>
        )}

        {/* Recent reviews */}
        <section className="relative pb-20 sm:pb-28">
          <SectionHeading
            label="Community"
            title="Recent reviews"
            subtitle="Latest ratings and thoughts from the Records community"
          />

          {reviews.length === 0 && (
            <div className="rounded-3xl border border-white/[0.06] bg-white/[0.03] px-8 py-16 text-center backdrop-blur-sm sm:py-20">
              <p className="text-lg text-zinc-400">No reviews yet — be the first voice.</p>
              <Link
                href="/discover"
                className="mt-8 inline-flex items-center justify-center rounded-full bg-[#fa2d48] px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(250,45,72,0.3)] transition-all hover:scale-[1.02] hover:bg-[#ff3d56]"
              >
                Be the first to review
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((item, index) => (
              <ReviewCard
                key={getLikeKey(item)}
                item={item}
                index={index}
                liking={liking}
                liked={hasLiked(item)}
                likeCount={getLikeCount(item)}
                onToggleLike={toggleLike}
                getReviewLink={getReviewLink}
              />
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="relative -mx-5 overflow-hidden border-t border-white/[0.06] sm:-mx-8 lg:-mx-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_100%,rgba(250,45,72,0.08),transparent)]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />

          <div className="relative px-5 py-20 text-center sm:px-8 sm:py-24 lg:py-28">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fa2d48]">
              Your music journal
            </p>
            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Start your record today
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-zinc-500 sm:text-lg">
              Join Records and build a personal log of every piece of music that
              matters to you.
            </p>
            <a
              href="/signup"
              className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition-all duration-300 hover:scale-[1.03] hover:bg-zinc-100 active:scale-[0.98]"
            >
              Join Records — it&apos;s free
            </a>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
