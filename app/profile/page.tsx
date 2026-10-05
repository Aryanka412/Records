"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import AppShell from "../components/AppShell"
import StarRating from "../components/StarRating"
import TypeBadge from "../components/TypeBadge"
import FollowList from "../components/FollowList"
import { supabase } from "../lib/supabaseClient"

type ProfileSummary = {
  id: string
  username: string
  avatar_url: string
}

type ProfileTab = "reviews" | "following" | "followers"

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

function ProfileHero({
  accountName,
  avatarUrl,
  bio,
  loggedIn,
  onEditProfile,
}: {
  accountName: string
  avatarUrl: string
  bio: string
  loggedIn: boolean
  onEditProfile: () => void
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
                alt={accountName}
                className="relative h-40 w-40 rounded-full object-cover shadow-[0_32px_80px_rgba(0,0,0,0.65)] ring-4 ring-white/10 sm:h-48 sm:w-48"
              />
            ) : (
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 text-5xl font-bold text-white shadow-[0_32px_80px_rgba(0,0,0,0.65)] ring-4 ring-white/10 sm:h-48 sm:w-48 sm:text-6xl">
                {accountName.charAt(0).toUpperCase()}
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
                Profile
              </span>
            </div>

            <h1 className="text-[clamp(2.25rem,7vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-white">
              {accountName}
            </h1>

            <p className="mt-3 text-base text-zinc-500 sm:text-lg">
              {loggedIn ? "Your Records diary" : "Log in to view your profile"}
            </p>

            {bio ? (
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-zinc-300 sm:text-lg lg:mx-0">
                {bio}
              </p>
            ) : (
              loggedIn && (
                <p className="mx-auto mt-5 max-w-2xl text-sm text-zinc-600 lg:mx-0">
                  Add a bio to personalize your profile.
                </p>
              )
            )}

            {loggedIn && (
              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <button
                  onClick={onEditProfile}
                  className="inline-flex items-center justify-center rounded-full bg-[#fa2d48] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(250,45,72,0.35)] transition-all hover:scale-[1.02] hover:bg-[#ff3d56]"
                >
                  Edit profile
                </button>
                <Link
                  href="/discover"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/10"
                >
                  Discover music
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  )
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

function ReviewCard({
  item,
  index,
  isEditing,
  editRating,
  editReview,
  savingEdit,
  deleting,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditRatingChange,
  onEditReviewChange,
}: {
  item: Review
  index: number
  isEditing: boolean
  editRating: number
  editReview: string
  savingEdit: string
  deleting: string
  onStartEdit: (item: Review) => void
  onCancelEdit: () => void
  onSaveEdit: (item: Review) => void
  onDelete: (item: Review) => void
  onEditRatingChange: (value: number) => void
  onEditReviewChange: (value: string) => void
}) {
  const itemKey = item.type + item.id

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

            {!isEditing && (
              <>
                <p className="mt-4 text-[15px] leading-relaxed text-zinc-400">
                  &ldquo;{item.review}&rdquo;
                </p>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
                  <p className="text-xs text-zinc-600">
                    {formatRelativeDate(item.created_at)}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onStartEdit(item)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      disabled={deleting === itemKey}
                      className="rounded-full border border-red-500/20 bg-red-500/[0.06] px-4 py-1.5 text-sm font-medium text-red-300 transition-all hover:border-red-500/35 hover:bg-red-500/10 disabled:opacity-50"
                    >
                      {deleting === itemKey ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {isEditing && (
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-black/25 p-4">
                <div className="mb-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm text-zinc-400">Edit score</p>
                    <p className="text-2xl font-bold tabular-nums text-white">
                      {editRating.toFixed(1)}
                    </p>
                  </div>
                  <StarRating rating={editRating} size="md" />
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.1"
                    value={editRating}
                    onChange={(e) => onEditRatingChange(Number(e.target.value))}
                    className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#fa2d48] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                </div>

                <textarea
                  value={editReview}
                  onChange={(e) => onEditReviewChange(e.target.value)}
                  className="h-32 w-full resize-none rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm leading-relaxed text-white outline-none transition-colors focus:border-white/20"
                />

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => onSaveEdit(item)}
                    disabled={savingEdit === itemKey}
                    className="rounded-full bg-[#fa2d48] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#ff3d56] disabled:opacity-60"
                  >
                    {savingEdit === itemKey ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={onCancelEdit}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-medium text-zinc-300 transition-all hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  )
}

export default function ProfilePage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [accountName, setAccountName] = useState("Anonymous")
  const [userId, setUserId] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [bio, setBio] = useState("")
  const [profileUsername, setProfileUsername] = useState("")
  const [loggedIn, setLoggedIn] = useState(false)
  const [loading, setLoading] = useState(true)

  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [deleting, setDeleting] = useState("")
  const [editing, setEditing] = useState("")
  const [editRating, setEditRating] = useState(0)
  const [editReview, setEditReview] = useState("")
  const [savingEdit, setSavingEdit] = useState("")
  const [activeTab, setActiveTab] = useState<ProfileTab>("reviews")
  const [followingUsers, setFollowingUsers] = useState<ProfileSummary[]>([])
  const [followerUsers, setFollowerUsers] = useState<ProfileSummary[]>([])
  const [followsLoading, setFollowsLoading] = useState(false)

  useEffect(() => {
    async function getProfile() {
      setLoading(true)

      const { data } = await supabase.auth.getSession()
      const user = data.session?.user

      if (!user) {
        setLoggedIn(false)
        setAccountName("Anonymous")
        setReviews([])
        setLoading(false)
        return
      }

      const currentUsername =
        user.user_metadata?.username || user.email || "Anonymous"

      setLoggedIn(true)
      setUserId(user.id)
      setAccountName(currentUsername)
      setProfileUsername(currentUsername)

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      const usernameForFilter = profile?.username || currentUsername

      if (profile) {
        setAccountName(profile.username || currentUsername)
        setProfileUsername(profile.username || currentUsername)
        setAvatarUrl(profile.avatar_url || "")
        setBio(profile.bio || "")
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

      const allReviews = [...songReviews, ...albumReviews, ...artistReviews]
        .filter(
          (item) =>
            item.user_id === user.id ||
            (!item.user_id &&
              item.username.toLowerCase() === usernameForFilter.toLowerCase())
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )

      setReviews(allReviews)
      setLoading(false)
    }

    getProfile()
  }, [])

  useEffect(() => {
    async function loadFollows() {
      if (!userId || !loggedIn) return

      setFollowsLoading(true)

      const res = await fetch(
        `/api/follows?user_id=${userId}&include_profiles=true`
      )
      const data = await res.json()

      if (res.ok) {
        setFollowingUsers(data.followingProfiles || [])
        setFollowerUsers(data.followerProfiles || [])
      }

      setFollowsLoading(false)
    }

    loadFollows()
  }, [userId, loggedIn])

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!userId) {
      alert("You need to be logged in to upload an avatar.")
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.")
      return
    }

    setUploadingAvatar(true)

    const cleanName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "-")

    const filePath = `${userId}/${Date.now()}-${cleanName}`

    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      })

    if (error) {
      alert(error.message)
      setUploadingAvatar(false)
      return
    }

    const { data } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath)

    setAvatarUrl(data.publicUrl)
    setUploadingAvatar(false)
    event.target.value = ""
  }

  async function saveProfile() {
    if (!userId) return

    if (!profileUsername.trim()) {
      alert("Username cannot be empty.")
      return
    }

    setSavingProfile(true)

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      username: profileUsername,
      avatar_url: avatarUrl,
      bio: bio,
      updated_at: new Date().toISOString(),
    })

    await supabase.auth.updateUser({
      data: {
        username: profileUsername,
      },
    })

    if (error) {
      alert(error.message)
    } else {
      setAccountName(profileUsername)
      setEditingProfile(false)
      alert("Profile updated!")
    }

    setSavingProfile(false)
  }

  function startEdit(item: Review) {
    setEditing(item.type + item.id)
    setEditRating(Number(item.rating))
    setEditReview(item.review)
  }

  function cancelEdit() {
    setEditing("")
    setEditRating(0)
    setEditReview("")
  }

  async function saveEdit(item: Review) {
    if (!editReview.trim()) {
      alert("Review cannot be empty.")
      return
    }

    const editKey = item.type + item.id
    setSavingEdit(editKey)

    let url = ""

    if (item.type === "song") {
      url = "/api/reviews"
    }

    if (item.type === "album") {
      url = "/api/album-reviews"
    }

    if (item.type === "artist") {
      url = "/api/artist-reviews"
    }

    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: item.id,
          rating: editRating,
          review: editReview,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setReviews(
          reviews.map((review) =>
            review.id === item.id && review.type === item.type
              ? {
                  ...review,
                  rating: editRating,
                  review: editReview,
                }
              : review
          )
        )

        cancelEdit()
        alert("Review updated!")
      } else {
        alert(data.error || "Update failed.")
      }
    } catch (error) {
      console.error(error)
      alert("Update failed. Check your terminal.")
    }

    setSavingEdit("")
  }

  async function deleteReview(item: Review) {
    const sure = confirm("Delete this review?")

    if (!sure) return

    const deleteKey = item.type + item.id
    setDeleting(deleteKey)

    let url = ""

    if (item.type === "song") {
      url = `/api/reviews?id=${item.id}`
    }

    if (item.type === "album") {
      url = `/api/album-reviews?id=${item.id}`
    }

    if (item.type === "artist") {
      url = `/api/artist-reviews?id=${item.id}`
    }

    try {
      const res = await fetch(url, {
        method: "DELETE",
      })

      const data = await res.json()

      if (data.success) {
        setReviews(
          reviews.filter(
            (review) => !(review.id === item.id && review.type === item.type)
          )
        )
      } else {
        alert(data.error || "Delete failed.")
      }
    } catch (error) {
      console.error(error)
      alert("Delete failed. Check your terminal.")
    }

    setDeleting("")
  }

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
      <ProfileHero
        accountName={accountName}
        avatarUrl={avatarUrl}
        bio={bio}
        loggedIn={loggedIn}
        onEditProfile={() => setEditingProfile(true)}
      />

      <div className="mx-auto max-w-[88rem] px-5 pb-24 sm:px-8 lg:px-12">
        {!loggedIn && (
          <div className="mt-10 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-8 py-10 text-center backdrop-blur-sm">
            <p className="text-base text-zinc-400">
              You need to log in to see your personal reviews.
            </p>
            <a
              href="/login"
              className="mt-6 inline-flex rounded-full bg-[#fa2d48] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[#ff3d56]"
            >
              Log in
            </a>
          </div>
        )}

        <AnimatePresence>
          {loggedIn && editingProfile && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="mt-10 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_24px_64px_rgba(0,0,0,0.35)] backdrop-blur-md"
            >
              <div className="border-b border-white/[0.06] px-6 py-5 sm:px-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Settings
                </p>
                <h2 className="mt-1 text-xl font-bold text-white">Edit profile</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Update your username, avatar, and bio.
                </p>
              </div>

              <div className="space-y-5 p-6 sm:p-8">
                <input
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20 focus:bg-black/40"
                />

                <div className="rounded-xl border border-white/[0.06] bg-black/25 p-5">
                  <p className="mb-4 text-sm font-medium text-zinc-400">Profile picture</p>

                  <div className="flex flex-wrap items-center gap-5">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt="Avatar preview"
                        className="h-20 w-20 rounded-full object-cover ring-2 ring-white/10"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold text-white ring-2 ring-white/10">
                        {accountName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#fa2d48] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#ff3d56]">
                      {uploadingAvatar ? "Uploading..." : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadAvatar}
                        disabled={uploadingAvatar}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <input
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="Avatar image URL"
                  className="w-full rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20 focus:bg-black/40"
                />

                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Write a short bio..."
                  className="h-28 w-full resize-none rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-sm leading-relaxed text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-white/20 focus:bg-black/40"
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={saveProfile}
                    disabled={savingProfile || uploadingAvatar}
                    className="rounded-full bg-[#fa2d48] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#ff3d56] disabled:opacity-60"
                  >
                    {savingProfile ? "Saving..." : "Save profile"}
                  </button>
                  <button
                    onClick={() => setEditingProfile(false)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loggedIn && (
          <>
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
              <StatCard label="Followers" value={followerUsers.length} />
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
                      Your reviews
                    </h2>
                  </div>

                  {loading && (
                    <p className="text-sm text-zinc-500">Loading your reviews...</p>
                  )}

                  {!loading && reviews.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                      <p className="text-zinc-500">You have not reviewed anything yet.</p>
                      <Link
                        href="/discover"
                        className="mt-5 inline-flex rounded-full bg-[#fa2d48] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#ff3d56]"
                      >
                        Discover music to review
                      </Link>
                    </div>
                  )}

                  <div className="space-y-4">
                    {reviews.map((item, index) => {
                      const itemKey = item.type + item.id
                      return (
                        <ReviewCard
                          key={itemKey}
                          item={item}
                          index={index}
                          isEditing={editing === itemKey}
                          editRating={editRating}
                          editReview={editReview}
                          savingEdit={savingEdit}
                          deleting={deleting}
                          onStartEdit={startEdit}
                          onCancelEdit={cancelEdit}
                          onSaveEdit={saveEdit}
                          onDelete={deleteReview}
                          onEditRatingChange={setEditRating}
                          onEditReviewChange={setEditReview}
                        />
                      )
                    })}
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
                      Following
                    </h2>
                  </div>
                  {followsLoading ? (
                    <p className="text-sm text-zinc-500">Loading...</p>
                  ) : (
                    <FollowList
                      users={followingUsers}
                      emptyMessage="You're not following anyone yet. Find people on Discover or from their reviews."
                    />
                  )}
                </div>
              )}

              {activeTab === "followers" && (
                <div>
                  <div className="mb-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
                      Network
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                      Followers
                    </h2>
                  </div>
                  {followsLoading ? (
                    <p className="text-sm text-zinc-500">Loading...</p>
                  ) : (
                    <FollowList
                      users={followerUsers}
                      emptyMessage="No followers yet. Keep reviewing — people will find you."
                    />
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}
