"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import AppShell from "../../components/AppShell"
import StarRating from "../../components/StarRating"
import TypeBadge from "../../components/TypeBadge"
import FollowList from "../../components/FollowList"
import { supabase } from "../../lib/supabaseClient"

type ProfileSummary = {
  id: string
  username: string
  avatar_url: string
}

type ProfileTab = "reviews" | "following" | "followers"

type Profile = {
  id: string
  username: string
  avatar_url: string
  bio: string
}

type Review = {
  id: number
  type: "song" | "album" | "artist"
  title: string
  artist: string
  image: string
  username: string
  user_id?: string | null
  rating: number
  review: string
  created_at: string
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

function getReviewLink(item: Review) {
  if (item.type === "song") {
    return `/song/${encodeURIComponent(item.title + " " + item.artist)}`
  }
  if (item.type === "album") {
    return `/album/${encodeURIComponent(item.title + " " + item.artist)}`
  }
  return `/artist/${encodeURIComponent(item.title)}`
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-4 backdrop-blur-sm sm:px-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 sm:text-[11px]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-white">
        {value}
      </p>
    </div>
  )
}

function PublicProfileHero({
  username,
  avatarUrl,
  bio,
  followerCount,
  showFollow,
  isFollowing,
  followLoading,
  onToggleFollow,
}: {
  username: string
  avatarUrl: string
  bio: string
  followerCount: number
  showFollow: boolean
  isFollowing: boolean
  followLoading: boolean
  onToggleFollow: () => void
}) {
  return (
    <section className="relative overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,45,72,0.14),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-black to-black" />
      {avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-3xl saturate-150"
        />
      )}

      <div className="relative z-10 mx-auto max-w-[88rem] px-5 pb-12 pt-10 sm:px-8 sm:pb-14 sm:pt-12 lg:px-12">
        <div className="flex flex-col items-center gap-8 text-center lg:flex-row lg:items-end lg:gap-12 lg:text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="relative shrink-0"
          >
            <div className="absolute -inset-4 rounded-full bg-[#fa2d48]/20 blur-3xl" />
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={username}
                className="relative h-40 w-40 rounded-full object-cover shadow-[0_32px_80px_rgba(0,0,0,0.65)] ring-4 ring-white/10 sm:h-48 sm:w-48"
              />
            ) : (
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 text-5xl font-bold text-white shadow-[0_32px_80px_rgba(0,0,0,0.65)] ring-4 ring-white/10 sm:h-48 sm:w-48 sm:text-6xl">
                {username.charAt(0).toUpperCase()}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="min-w-0 flex-1"
          >
            <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Member
              </span>
            </div>

            <h1 className="text-[clamp(2.25rem,7vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-white">
              {username}
            </h1>

            <p className="mt-3 text-sm text-zinc-500 sm:text-base">
              {followerCount} follower{followerCount !== 1 ? "s" : ""}
            </p>

            {bio ? (
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg lg:mx-0">
                {bio}
              </p>
            ) : (
              <p className="mx-auto mt-5 max-w-2xl text-sm text-zinc-600 lg:mx-0">
                This user has not added a bio yet.
              </p>
            )}

            {showFollow && (
              <div className="mt-8 flex justify-center lg:justify-start">
                <button
                  onClick={onToggleFollow}
                  disabled={followLoading}
                  className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-all duration-300 disabled:opacity-60 ${
                    isFollowing
                      ? "border border-white/15 bg-white/5 text-white backdrop-blur-md hover:border-white/25 hover:bg-white/10"
                      : "bg-[#fa2d48] text-white shadow-[0_8px_32px_rgba(250,45,72,0.35)] hover:scale-[1.02] hover:bg-[#ff3d56]"
                  }`}
                >
                  {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function PublicReviewCard({ item, index }: { item: Review; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]"
    >
      <div className="p-5 sm:p-6">
        <div className="flex gap-4 sm:gap-5">
          <Link href={getReviewLink(item)} className="shrink-0">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.image}
                alt={item.title}
                className={`h-20 w-20 object-cover shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-transform hover:scale-[1.03] sm:h-24 sm:w-24 ${
                  item.type === "artist" ? "rounded-full" : "rounded-xl"
                }`}
              />
            ) : (
              <div className="h-20 w-20 rounded-xl bg-zinc-800 sm:h-24 sm:w-24" />
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <TypeBadge type={item.type} />
                <Link href={getReviewLink(item)}>
                  <h3 className="mt-2 truncate text-lg font-semibold text-white transition-colors hover:text-[#fa2d48] sm:text-xl">
                    {item.title}
                  </h3>
                </Link>
                <p className="truncate text-sm text-zinc-500">{item.artist}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5">
                <span className="text-lg font-bold tabular-nums text-white">
                  {Number(item.rating).toFixed(1)}
                </span>
                <StarRating rating={Number(item.rating)} />
              </div>
            </div>

            <Link href={getReviewLink(item)}>
              <p className="mt-4 text-[15px] leading-relaxed text-zinc-400 transition-colors hover:text-zinc-200">
                &ldquo;{item.review}&rdquo;
              </p>
            </Link>

            <p className="mt-5 border-t border-white/[0.06] pt-4 text-xs text-zinc-600">
              {formatRelativeDate(item.created_at)}
            </p>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export default function PublicUserPage() {
  const params = useParams()
  const id = params.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState("")
  const [isFollowing, setIsFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<ProfileTab>("reviews")
  const [followingUsers, setFollowingUsers] = useState<ProfileSummary[]>([])
  const [followerUsers, setFollowerUsers] = useState<ProfileSummary[]>([])

  useEffect(() => {
    async function getSession() {
      const { data } = await supabase.auth.getSession()
      setCurrentUserId(data.session?.user?.id || "")
    }

    getSession()
  }, [])

  useEffect(() => {
    async function getPublicProfile() {
      setLoading(true)

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      setProfile(profileData)

      const followsRes = await fetch(
        `/api/follows?user_id=${id}&include_profiles=true`
      )
      const followsData = await followsRes.json()

      if (followsRes.ok) {
        setFollowerCount(followsData.followerCount || 0)
        setFollowingUsers(followsData.followingProfiles || [])
        setFollowerUsers(followsData.followerProfiles || [])
      }

      const songRes = await fetch("/api/reviews")
      const songData = await songRes.json()

      const albumRes = await fetch("/api/album-reviews")
      const albumData = await albumRes.json()

      const artistRes = await fetch("/api/artist-reviews")
      const artistData = await artistRes.json()

      const songReviews: Review[] = Array.isArray(songData)
        ? songData.map((item) => ({
            id: item.id,
            type: "song" as const,
            title: item.song_name,
            artist: item.artist,
            image: item.image,
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
            username: item.username || "Anonymous",
            user_id: item.user_id || null,
            rating: item.rating,
            review: item.review,
            created_at: item.created_at,
          }))
        : []

      const userReviews = [...songReviews, ...albumReviews, ...artistReviews]
        .filter((item) => item.user_id === id)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

      setReviews(userReviews)
      setLoading(false)
    }

    getPublicProfile()
  }, [id])

  useEffect(() => {
    async function checkFollow() {
      if (!currentUserId || currentUserId === id) return

      const res = await fetch(
        `/api/follows?follower_id=${currentUserId}&following_id=${id}`
      )
      const data = await res.json()

      if (res.ok) {
        setIsFollowing(!!data.following)
      }
    }

    checkFollow()
  }, [currentUserId, id])

  async function toggleFollow() {
    if (!currentUserId) {
      alert("Log in to follow users.")
      return
    }

    if (currentUserId === id) return

    setFollowLoading(true)

    try {
      if (isFollowing) {
        const res = await fetch(
          `/api/follows?follower_id=${currentUserId}&following_id=${id}`,
          { method: "DELETE" }
        )
        const data = await res.json()

        if (data.success) {
          setIsFollowing(false)
          setFollowerCount((count) => Math.max(0, count - 1))
        }
      } else {
        const res = await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            follower_id: currentUserId,
            following_id: id,
            username: profile?.username || "Someone",
          }),
        })
        const data = await res.json()

        if (data.success) {
          setIsFollowing(true)
          setFollowerCount((count) => count + 1)
        } else {
          alert(data.error || "Follow failed.")
        }
      }
    } finally {
      setFollowLoading(false)
    }
  }

  const username =
    profile?.username ||
    reviews[0]?.username ||
    "User"

  const avatarUrl = profile?.avatar_url || ""
  const bio = profile?.bio || ""

  const avg =
    reviews.length > 0
      ? reviews.reduce((sum, item) => sum + Number(item.rating), 0) / reviews.length
      : 0

  const songCount = reviews.filter((item) => item.type === "song").length
  const albumCount = reviews.filter((item) => item.type === "album").length
  const artistCount = reviews.filter((item) => item.type === "artist").length

  const tabs: { id: ProfileTab; label: string }[] = [
    { id: "reviews", label: "Reviews" },
    { id: "following", label: "Following" },
    { id: "followers", label: "Followers" },
  ]

  return (
    <AppShell bleed>
      <PublicProfileHero
        username={username}
        avatarUrl={avatarUrl}
        bio={bio}
        followerCount={followerCount}
        showFollow={!!currentUserId && currentUserId !== id}
        isFollowing={isFollowing}
        followLoading={followLoading}
        onToggleFollow={toggleFollow}
      />

      <div className="mx-auto max-w-[88rem] px-5 pb-24 sm:px-8 lg:px-12">
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <StatCard label="Total reviews" value={reviews.length} />
          <StatCard
            label="Average score"
            value={reviews.length > 0 ? avg.toFixed(1) : "—"}
          />
          <StatCard label="Songs" value={songCount} />
          <StatCard label="Albums" value={albumCount} />
          <StatCard label="Artists" value={artistCount} />
          <StatCard label="Following" value={followingUsers.length} />
          <StatCard label="Followers" value={followerCount} />
        </div>

        <section className="mt-12 sm:mt-14">
          <div className="mb-8 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-black shadow-lg"
                    : "border border-white/10 bg-white/[0.04] text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "reviews" && (
            <div>
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
                  Diary
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Reviews
                </h2>
                <p className="mt-1.5 text-sm text-zinc-500">
                  Songs, albums, and artists reviewed by {username}.
                </p>
              </div>

              {loading && (
                <p className="text-sm text-zinc-500">Loading reviews...</p>
              )}

              {!loading && reviews.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                  <p className="text-zinc-500">
                    This user has not reviewed anything yet.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {reviews.map((item, index) => (
                  <PublicReviewCard
                    key={item.type + item.id}
                    item={item}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === "following" && (
            <div>
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
                  Network
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {username} is following
                </h2>
              </div>
              <FollowList
                users={followingUsers}
                emptyMessage={`${username} isn't following anyone yet.`}
              />
            </div>
          )}

          {activeTab === "followers" && (
            <div>
              <div className="mb-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
                  Network
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {username}&apos;s followers
                </h2>
              </div>
              <FollowList
                users={followerUsers}
                emptyMessage={`${username} doesn't have followers yet.`}
              />
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
