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

type Artist = {
  name: string
  spotifyId?: string
  image: string
  spotify: string
  followers: number
  popularity: number
  bio: string
  listeners: string
  playcount: string
  tags: string[]
}

type ArtistReview = {
  id: number
  artist_name: string
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

type Track = {
  name: string
  artist: string
  album: string
  image: string
  spotify: string
  duration_ms?: number
}

type Album = {
  id?: string
  name: string
  artist: string
  image: string
  spotify: string
  release_date: string
  year?: string
  total_tracks: number
  album_type?: string
}

function formatStat(value: string | undefined | null): string | null {
  if (value == null || value === "") return null
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return null
  return num.toLocaleString()
}

function formatCount(value: number | undefined | null): string | null {
  if (value == null || value <= 0) return null
  return value.toLocaleString()
}

function formatPopularity(value: number | undefined | null): string | null {
  if (value == null || value <= 0) return null
  return String(value)
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

function formatDuration(ms?: number) {
  if (!ms) return ""
  const mins = Math.floor(ms / 60000)
  const secs = Math.floor((ms % 60000) / 1000)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

function albumHref(album: Album) {
  return `/album/${encodeURIComponent(album.name + " " + album.artist)}`
}

function latestRelease(releases: ReleaseGroups): Album | null {
  const candidates = [...releases.albums, ...releases.singles].filter((release) => release.name)
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => (b.release_date || "").localeCompare(a.release_date || ""))[0]
}

function trackHref(track: Track) {
  return `/song/${encodeURIComponent(track.name + " " + track.artist)}`
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T
  } catch {
    return null
  }
}

function SectionBlock({
  label,
  title,
  subtitle,
  children,
}: {
  label?: string
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-12 sm:mb-14">
      <div className="mb-6">
        {label && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
            {label}
          </p>
        )}
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1.5 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function PremiumTrackList({
  tracks,
  initialCount = 10,
  ranked = false,
}: {
  tracks: Track[]
  initialCount?: number
  ranked?: boolean
}) {
  const [visible, setVisible] = useState(initialCount)
  const shown = tracks.slice(0, visible)
  const hasMore = visible < tracks.length

  if (tracks.length === 0) {
    return <p className="text-sm text-zinc-500">No tracks found.</p>
  }

  return (
    <>
      <div className="flex flex-col gap-0.5">
        {shown.map((track, index) => (
          <div
            key={`${track.name}-${track.album}-${index}`}
            className="group flex items-center gap-2 rounded-xl border border-transparent px-2 py-2.5 transition-all hover:border-white/[0.06] hover:bg-white/[0.04] sm:gap-3 sm:px-3"
          >
            <Link href={trackHref(track)} className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              {ranked && (
                <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-zinc-600 group-hover:text-zinc-400">
                  {index + 1}
                </span>
              )}
              {track.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={track.image}
                  alt={track.name}
                  className="h-11 w-11 shrink-0 rounded-lg object-cover shadow-[0_8px_24px_rgba(0,0,0,0.45)] transition-transform group-hover:scale-105 sm:h-12 sm:w-12"
                />
              ) : (
                <div className="h-11 w-11 shrink-0 rounded-lg bg-zinc-800 sm:h-12 sm:w-12" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[#fa2d48]">
                  {track.name}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  {track.artist}
                  {track.album ? ` · ${track.album}` : ""}
                </p>
              </div>
              {formatDuration(track.duration_ms) && (
                <span className="hidden shrink-0 text-xs tabular-nums text-zinc-600 sm:inline">
                  {formatDuration(track.duration_ms)}
                </span>
              )}
            </Link>
            {track.spotify && (
              <a
                href={track.spotify}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full px-2 py-1 text-[11px] font-medium text-zinc-500 transition hover:text-white"
              >
                Spotify
              </a>
            )}
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="mt-4 w-full rounded-full border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          onClick={() => setVisible((count) => count + 25)}
        >
          Show more ({tracks.length - visible} remaining)
        </button>
      )}
    </>
  )
}

function ArtistHero({
  artist,
  avgRating,
  reviewCount,
}: {
  artist: Artist
  avgRating: number
  reviewCount: number
}) {
  const listeners = formatStat(artist.listeners)
  const followers = formatCount(artist.followers)
  const popularity = formatPopularity(artist.popularity)

  const heroStats = [
    {
      label: "Records score",
      value: reviewCount > 0 ? avgRating.toFixed(1) : "—",
      stars: reviewCount > 0,
    },
    { label: "Reviews", value: String(reviewCount) },
    listeners ? { label: "Last.fm listeners", value: listeners } : null,
    followers ? { label: "Spotify followers", value: followers } : null,
    popularity ? { label: "Spotify popularity", value: popularity } : null,
  ].filter(Boolean) as { label: string; value: string; stars?: boolean }[]

  return (
    <section className="relative overflow-hidden bg-black">
      {artist.image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artist.image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full scale-110 object-cover object-[center_20%] opacity-35 blur-3xl saturate-150"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artist.image}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover object-[center_20%] opacity-20 mix-blend-luminosity"
          />
        </>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-black/50" />
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-2/3 bg-[radial-gradient(ellipse_80%_60%_at_50%_100%,rgba(250,45,72,0.12),transparent)]" />

      <div className="relative z-10 mx-auto max-w-[88rem] px-5 pb-14 pt-12 sm:px-8 sm:pb-16 sm:pt-16 lg:px-12">
        <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:items-end lg:gap-12 lg:text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative shrink-0"
          >
            <div className="absolute -inset-4 rounded-full bg-[#fa2d48]/20 blur-3xl" />
            {artist.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.image}
                alt={artist.name}
                className="relative h-44 w-44 rounded-full object-cover shadow-[0_32px_80px_rgba(0,0,0,0.65)] ring-4 ring-white/10 sm:h-52 sm:w-52 lg:h-56 lg:w-56"
              />
            ) : (
              <div className="relative h-44 w-44 rounded-full bg-zinc-900 ring-4 ring-white/10 sm:h-52 sm:w-52 lg:h-56 lg:w-56" />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 flex-1"
          >
            <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Artist
              </span>
            </div>

            <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-white drop-shadow-[0_4px_32px_rgba(0,0,0,0.5)]">
              {artist.name}
            </h1>

            {artist.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
                {artist.tags.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium capitalize text-zinc-300 backdrop-blur-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:text-[11px]">
                    {stat.label}
                  </p>
                  <div className="mt-1 flex items-center justify-center gap-2 lg:justify-start">
                    <span className="text-xl font-bold tabular-nums text-white sm:text-2xl">
                      {stat.value}
                    </span>
                    {stat.stars && <StarRating rating={avgRating} size="md" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a
                href="#review"
                className="inline-flex items-center justify-center rounded-full bg-[#fa2d48] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(250,45,72,0.35)] transition-all duration-300 hover:scale-[1.02] hover:bg-[#ff3d56]"
              >
                Review artist
              </a>
              {artist.spotify && (
                <a
                  href={artist.spotify}
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
  item: ArtistReview
  index: number
  liked: boolean
  likeCount: number
  liking: string
  reviewComments: ReviewComment[]
  onToggleLike: (item: ArtistReview) => void
  loggedIn: boolean
  userId: string
  accountName: string
  allComments: ReviewComment[]
  setComments: (comments: ReviewComment[]) => void
}) {
  const likeKey = `artist-${item.id}`

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]"
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
          reviewType="artist"
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

type ReleaseGroups = {
  albums: Album[]
  singles: Album[]
  appearsOn: Album[]
  compilations: Album[]
}

const emptyReleases: ReleaseGroups = {
  albums: [],
  singles: [],
  appearsOn: [],
  compilations: [],
}

const DISCOGRAPHY_TABS = [
  { id: "albums", label: "Albums" },
  { id: "singles", label: "Singles & EPs" },
  { id: "appearsOn", label: "Appears On" },
  { id: "compilations", label: "Compilations" },
] as const

type DiscographyTab = (typeof DISCOGRAPHY_TABS)[number]["id"]

function releaseTypeLabel(type?: string) {
  if (type === "single") return "Single"
  if (type === "appears_on") return "Appears On"
  if (type === "compilation") return "Compilation"
  return "Album"
}

function LatestRelease({
  release,
  loading,
  hidden,
}: {
  release: Album | null
  loading: boolean
  hidden: boolean
}) {
  if (hidden) return null

  return (
    <SectionBlock label="New" title="Latest release">
      {loading && <div className="h-36 animate-pulse rounded-2xl bg-white/[0.05]" />}
      {!loading && release && (
        <article className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 transition hover:border-white/15 hover:bg-white/[0.05] sm:gap-5 sm:p-4">
          <Link href={albumHref(release)} className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
            {release.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={release.image}
                alt={release.name}
                className="h-24 w-24 shrink-0 rounded-xl object-cover shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10 sm:h-32 sm:w-32"
              />
            ) : (
              <div className="h-24 w-24 shrink-0 rounded-xl bg-zinc-900 sm:h-32 sm:w-32" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {releaseTypeLabel(release.album_type)}
                {release.year ? ` · ${release.year}` : ""}
              </p>
              <h3 className="mt-1 truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
                {release.name}
              </h3>
              <p className="mt-1 truncate text-sm text-zinc-500">{release.artist}</p>
            </div>
          </Link>
          {release.spotify && (
            <a
              href={release.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-white/25 hover:text-white sm:inline-flex"
            >
              Spotify
            </a>
          )}
        </article>
      )}
    </SectionBlock>
  )
}

function DiscographyBrowser({
  releases,
  loading,
  error,
}: {
  releases: ReleaseGroups
  loading: boolean
  error: string
}) {
  const [tab, setTab] = useState<DiscographyTab>("albums")
  const [query, setQuery] = useState("")

  const counts: Record<DiscographyTab, number> = {
    albums: releases.albums.length,
    singles: releases.singles.length,
    appearsOn: releases.appearsOn.length,
    compilations: releases.compilations.length,
  }

  useEffect(() => {
    if (loading) return
    if (counts[tab] > 0) return
    const next = DISCOGRAPHY_TABS.find((item) => counts[item.id] > 0)
    if (next) setTab(next.id)
  }, [loading, counts, tab])

  const active = releases[tab]
  const filtered = active.filter((release) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return (
      release.name.toLowerCase().includes(needle) ||
      release.artist.toLowerCase().includes(needle)
    )
  })

  return (
    <SectionBlock
      label="Discography"
      title="Releases"
      subtitle="Albums, singles, appearances, and compilations from Spotify."
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {DISCOGRAPHY_TABS.map((item) => {
            const selected = tab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-white/20 bg-white text-black"
                    : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {item.label}
                <span className={selected ? "ml-1.5 text-black/50" : "ml-1.5 text-zinc-600"}>
                  {counts[item.id]}
                </span>
              </button>
            )
          })}
        </div>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search releases"
          aria-label="Search releases"
          className="w-full rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 sm:max-w-xs"
        />
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="mb-2.5 aspect-square rounded-xl bg-white/[0.06]" />
              <div className="h-3 w-3/4 rounded bg-white/[0.06]" />
              <div className="mt-2 h-2.5 w-1/2 rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && <p className="text-sm text-zinc-300">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-zinc-500">
          {query.trim() ? "No releases match that search." : "No releases in this section."}
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((release) => (
            <article key={`${release.album_type}-${release.id || release.name}-${release.year}`} className="group">
              <Link href={albumHref(release)} className="block">
                <div className="relative mb-2.5 aspect-square overflow-hidden rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition-transform duration-300 group-hover:scale-[1.03]">
                  {release.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={release.image} alt={release.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-zinc-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="truncate text-sm font-semibold text-white transition-colors group-hover:text-[#fa2d48]">
                  {release.name}
                </p>
              </Link>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {release.year || "Year unknown"}
                <span className="px-1 text-zinc-700">·</span>
                {releaseTypeLabel(release.album_type)}
              </p>
              {release.spotify && (
                <a
                  href={release.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex text-[11px] font-medium text-zinc-500 transition hover:text-white"
                >
                  Spotify
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </SectionBlock>
  )
}

export default function ArtistPage() {
  const params = useParams()
  const name = decodeURIComponent(params.name as string)

  const [artist, setArtist] = useState<Artist | null>(null)
  const [infoError, setInfoError] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [tracksLoading, setTracksLoading] = useState(true)
  const [tracksError, setTracksError] = useState("")
  const [releases, setReleases] = useState<ReleaseGroups>(emptyReleases)
  const [discographyLoading, setDiscographyLoading] = useState(true)
  const [discographyError, setDiscographyError] = useState("")
  const [reviews, setReviews] = useState<ArtistReview[]>([])
  const [likes, setLikes] = useState<ReviewLike[]>([])
  const [rating, setRating] = useState(0)
  const [username, setUsername] = useState("")
  const [accountName, setAccountName] = useState("")
  const [userId, setUserId] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)
  const [review, setReview] = useState("")
  const [saving, setSaving] = useState(false)
  const [liking, setLiking] = useState("")
  const [comments, setComments] = useState<ReviewComment[]>([])

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.length
      : 0

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
      const res = await fetch("/api/review-likes")
      const data = await res.json()

      if (Array.isArray(data)) {
        setLikes(data)
      } else {
        setLikes([])
      }
    }

    async function getComments() {
      const res = await fetch("/api/review-comments")
      const data = await res.json()
      setComments(Array.isArray(data) ? data : [])
    }

    getUser()
    getLikes()
    getComments()
  }, [])

  useEffect(() => {
    const artistParam = encodeURIComponent(name)
    let cancelled = false

    setArtist(null)
    setInfoError("")
    setTracks([])
    setTracksLoading(true)
    setTracksError("")
    setReleases(emptyReleases)
    setDiscographyLoading(true)
    setDiscographyError("")
    setReviews([])

    function rememberArtist(next: Artist) {
      if (cancelled) return
      setInfoError("")
      setArtist((current) => {
        if (!current) return next
        return {
          name: next.name || current.name,
          spotifyId: next.spotifyId || current.spotifyId,
          image: next.image || current.image,
          spotify: next.spotify || current.spotify,
          followers: next.followers || current.followers,
          popularity: next.popularity || current.popularity,
          bio:
            next.bio && next.bio !== "No artist bio available yet."
              ? next.bio
              : current.bio || next.bio,
          listeners: next.listeners !== "0" ? next.listeners : current.listeners,
          playcount: next.playcount !== "0" ? next.playcount : current.playcount,
          tags: next.tags.length ? next.tags : current.tags,
        }
      })
    }

    async function loadInfo() {
      const res = await fetch(`/api/artist-info?artist=${artistParam}`)
      const data = await safeJson<Artist & { error?: string; genres?: string[] }>(res)
      if (cancelled) return
      if (res.ok && data && !data.error && data.name) {
        const tags = data.genres?.length ? data.genres : data.tags || []
        rememberArtist({
          name: data.name,
          spotifyId: data.spotifyId || "",
          image: data.image || "",
          spotify: data.spotify || "",
          followers: data.followers || 0,
          popularity: data.popularity || 0,
          bio: data.bio || "No artist bio available yet.",
          listeners: data.listeners || "0",
          playcount: data.playcount || "0",
          tags,
        })
      } else {
        setInfoError("Could not load artist info.")
      }
    }

    async function loadTracks() {
      const res = await fetch(`/api/artist-top-tracks?artist=${artistParam}`)
      const data = await safeJson<{ tracks?: Track[]; source?: string } | Track[]>(res)
      if (cancelled) return
      const list = Array.isArray(data) ? data : data?.tracks
      if (res.ok && Array.isArray(list)) {
        setTracks(list.slice(0, 10))
        setTracksError("")
      } else {
        setTracks([])
        setTracksError("Could not load popular songs.")
      }
      setTracksLoading(false)
    }

    async function loadDiscography() {
      const res = await fetch(`/api/artist-discography?artist=${artistParam}`)
      const data = await safeJson<
        ReleaseGroups & {
          artist?: {
            id?: string
            name?: string
            image?: string
            spotify?: string
            followers?: number
            popularity?: number
            genres?: string[]
          }
          error?: string
        }
      >(res)
      if (cancelled) return
      if (data?.artist?.name) {
        rememberArtist({
          name: data.artist.name,
          spotifyId: data.artist.id || "",
          image: data.artist.image || "",
          spotify: data.artist.spotify || "",
          followers: data.artist.followers || 0,
          popularity: data.artist.popularity || 0,
          bio: "No artist bio available yet.",
          listeners: "0",
          playcount: "0",
          tags: data.artist.genres || [],
        })
      }
      if (res.ok && data && !data.error) {
        setReleases({
          albums: Array.isArray(data.albums) ? data.albums : [],
          singles: Array.isArray(data.singles) ? data.singles : [],
          appearsOn: Array.isArray(data.appearsOn) ? data.appearsOn : [],
          compilations: Array.isArray(data.compilations) ? data.compilations : [],
        })
        setDiscographyError("")
      } else if (!data?.artist?.name) {
        setReleases(emptyReleases)
        setDiscographyError("Could not load discography.")
      } else {
        setReleases(emptyReleases)
        setDiscographyError("Could not load discography.")
      }
      setDiscographyLoading(false)
    }

    async function loadReviews() {
      const res = await fetch(`/api/artist-reviews?artist=${artistParam}`)
      const data = await safeJson<ArtistReview[]>(res)
      if (!cancelled && Array.isArray(data)) setReviews(data)
    }

    loadInfo()
    loadTracks()
    loadDiscography()
    loadReviews()

    return () => {
      cancelled = true
    }
  }, [name])

  function getLikeKey(item: ArtistReview) {
    return `artist-${item.id}`
  }

  function getLikeCount(item: ArtistReview) {
    return likes.filter(
      (like) =>
        like.review_type === "artist" &&
        Number(like.review_id) === Number(item.id)
    ).length
  }

  function hasLiked(item: ArtistReview) {
    return likes.some(
      (like) =>
        like.review_type === "artist" &&
        Number(like.review_id) === Number(item.id) &&
        like.user_id === userId
    )
  }

  function getReviewComments(item: ArtistReview) {
    return comments.filter(
      (comment) =>
        comment.review_type === "artist" &&
        Number(comment.review_id) === Number(item.id)
    )
  }

  async function toggleLike(item: ArtistReview) {
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
          `/api/review-likes?review_type=artist&review_id=${item.id}&user_id=${userId}`,
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
                  like.review_type === "artist" &&
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
            review_type: "artist",
            review_id: item.id,
            user_id: userId,
          }),
        })

        const data = await res.json()

        if (data.success) {
          const newLike: ReviewLike = {
            id: Date.now(),
            review_type: "artist",
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
    if (!artist) return

    if (!review.trim()) {
      alert("Write a review first.")
      return
    }

    const finalUsername = loggedIn
      ? accountName || "Anonymous"
      : username || "Anonymous"

    setSaving(true)

    try {
      const res = await fetch("/api/artist-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          artist_name: artist.name,
          image: artist.image,
          spotify: artist.spotify,
          rating: rating,
          review: review,
          username: finalUsername,
          user_id: loggedIn ? userId : null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        const newReview: ArtistReview = {
          id: Date.now(),
          artist_name: artist.name,
          image: artist.image,
          spotify: artist.spotify,
          username: finalUsername,
          user_id: loggedIn ? userId : null,
          rating: rating,
          review: review,
          created_at: new Date().toISOString(),
        }

        setReviews([newReview, ...reviews])
        setUsername("")
        setReview("")
        alert("Artist review saved!")
      } else {
        alert(data.error || "Something went wrong.")
      }
    } catch {
      alert("Save failed. Check your connection and try again.")
    }

    setSaving(false)
  }

  if (!artist) {
    return (
      <AppShell>
        {infoError && !discographyLoading ? (
          <div className="mx-auto max-w-lg px-6 py-24 text-center">
            <p className="text-sm text-zinc-300">Could not load artist info.</p>
          </div>
        ) : (
          <LoadingScreen message="Loading artist..." />
        )}
      </AppShell>
    )
  }

  const playcount = formatStat(artist.playcount)
  const aboutListeners = formatStat(artist.listeners)
  const aboutFollowers = formatCount(artist.followers)
  const aboutPopularity = formatPopularity(artist.popularity)
  const aboutStats = [
    playcount ? { label: "Last.fm scrobbles", value: playcount } : null,
    aboutListeners ? { label: "Last.fm listeners", value: aboutListeners } : null,
    aboutFollowers ? { label: "Spotify followers", value: aboutFollowers } : null,
    aboutPopularity ? { label: "Spotify popularity", value: aboutPopularity } : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <AppShell bleed>
      <ArtistHero artist={artist} avgRating={avgRating} reviewCount={reviews.length} />

      <div className="mx-auto max-w-[88rem] px-5 sm:px-8 lg:px-12">
        {/* Latest release + popular songs + discography */}
        <div className="py-10 sm:py-12">
          <LatestRelease
            release={latestRelease(releases)}
            loading={discographyLoading}
            hidden={!discographyLoading && !latestRelease(releases)}
          />

          <SectionBlock label="Popular" title="Popular songs">
            {tracksLoading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-14 animate-pulse rounded-xl bg-white/[0.05]" />
                ))}
              </div>
            )}
            {!tracksLoading && tracksError && (
              <p className="text-sm text-zinc-300">{tracksError}</p>
            )}
            {!tracksLoading && !tracksError && tracks.length === 0 && (
              <p className="text-sm text-zinc-500">No popular songs found for this artist.</p>
            )}
            {!tracksLoading && !tracksError && tracks.length > 0 && (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2 sm:p-3">
                <PremiumTrackList tracks={tracks.slice(0, 10)} initialCount={5} ranked />
              </div>
            )}
          </SectionBlock>

          <DiscographyBrowser
            releases={releases}
            loading={discographyLoading}
            error={discographyError}
          />
        </div>

        {/* About + reviews + form */}
        <div className="grid gap-8 border-t border-white/[0.06] pb-24 pt-10 lg:grid-cols-[1fr_380px] lg:gap-10 xl:grid-cols-[1fr_400px]">
          <div className="space-y-8">
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm">
              <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
                  Biography
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  About {artist.name}
                </h2>
              </div>

              <div className="px-6 py-6 sm:px-8">
                <p className="text-[15px] leading-7 text-zinc-400">{artist.bio}</p>

                {aboutStats.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {aboutStats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-4"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                          {stat.label}
                        </p>
                        <p className="mt-1.5 text-2xl font-bold tabular-nums text-white">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {artist.tags.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {artist.tags.map((tag) => (
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

            <div>
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
                  Community
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Artist reviews
                </h2>
                <p className="mt-1.5 text-sm text-zinc-500">
                  {reviews.length === 0
                    ? "No one has reviewed this artist yet."
                    : `${reviews.length} review${reviews.length === 1 ? "" : "s"} from the Records community`}
                </p>
              </div>

              <div className="space-y-4">
                {reviews.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                    <p className="text-zinc-500">
                      No artist reviews yet. Be the first to review this artist.
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

          <aside id="review" className="h-fit lg:sticky lg:top-20">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-md">
              <div className="border-b border-white/[0.06] px-6 py-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Your take
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">Review this artist</h2>
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
                  placeholder="What defines this artist? Share your thoughts..."
                  className="h-36 w-full resize-none rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20 focus:bg-black/40"
                />

                <button
                  onClick={saveReview}
                  disabled={saving}
                  className="mt-5 w-full rounded-full bg-[#fa2d48] py-3.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgba(250,45,72,0.3)] transition-all hover:bg-[#ff3d56] disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save artist review"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  )
}
