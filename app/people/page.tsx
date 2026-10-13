"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import AppShell from "../components/AppShell"
import { supabase } from "../lib/supabaseClient"

type Person = {
  id: string
  username: string
  avatar_url: string
  bio: string
  updated_at: string
  review_count: number
  followers_count: number
  following_count: number
}

function countLabel(count: number, singular: string, plural: string) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`
}

function matchesQuery(person: Person, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return (
    (person.username || "").toLowerCase().includes(needle) ||
    (person.bio || "").toLowerCase().includes(needle)
  )
}

function PersonCard({
  person,
  userId,
  following,
  pending,
  onToggle,
}: {
  person: Person
  userId: string
  following: boolean
  pending: boolean
  onToggle: (person: Person) => void
}) {
  const isSelf = Boolean(userId) && userId === person.id
  const initial = (person.username || "A").slice(0, 1).toUpperCase()

  return (
    <article className="flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition duration-200 hover:border-white/10 hover:bg-white/[0.05] sm:p-5">
      <div className="flex items-start gap-3">
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold text-white ring-1 ring-white/10">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-white">{person.username || "Anonymous"}</h3>
            {isSelf && (
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                You
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-400">
            {person.bio || "No bio yet."}
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        {countLabel(person.review_count, "review", "reviews")}
        <span className="px-1.5 text-zinc-700">·</span>
        {countLabel(person.followers_count, "follower", "followers")}
        <span className="px-1.5 text-zinc-700">·</span>
        {countLabel(person.following_count, "following", "following")}
      </p>

      <div className="mt-4 flex items-center gap-2">
        {isSelf ? null : userId ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onToggle(person)}
            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
              following
                ? "border border-white/15 bg-transparent text-zinc-200 hover:border-white/30 hover:bg-white/[0.06]"
                : "bg-[#fa2d48] text-white hover:bg-[#ff3d56]"
            }`}
          >
            {pending ? "Saving..." : following ? "Unfollow" : "Follow"}
          </button>
        ) : (
          <Link href="/login" className="text-sm font-medium text-zinc-400 transition hover:text-white">
            Log in to follow.
          </Link>
        )}
        <Link
          href={`/user/${person.id}`}
          className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white"
        >
          View Profile
        </Link>
      </div>
    </article>
  )
}

function PeopleGrid({
  people,
  userId,
  followingIds,
  pendingId,
  onToggle,
}: {
  people: Person[]
  userId: string
  followingIds: Set<string>
  pendingId: string
  onToggle: (person: Person) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {people.map((person) => (
        <PersonCard
          key={person.id}
          person={person}
          userId={userId}
          following={followingIds.has(person.id)}
          pending={pendingId === person.id}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [userId, setUserId] = useState("")
  const [username, setUsername] = useState("")
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [pendingId, setPendingId] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")

      const { data } = await supabase.auth.getSession()
      const sessionUser = data.session?.user
      const nextUserId = sessionUser?.id || ""

      let nextUsername = sessionUser?.user_metadata?.username || ""
      if (nextUserId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", nextUserId)
          .maybeSingle()
        if (profile?.username) nextUsername = profile.username
      }

      const [peopleRes, followsRes] = await Promise.all([
        fetch("/api/people"),
        nextUserId ? fetch(`/api/follows?user_id=${nextUserId}`) : Promise.resolve(null),
      ])

      const payload = await peopleRes.json().catch(() => null)
      if (cancelled) return

      if (!peopleRes.ok || !payload || !Array.isArray(payload.people)) {
        setPeople([])
        setError("Could not load people.")
        setLoading(false)
        return
      }

      const followed = new Set<string>()
      if (followsRes) {
        const followsPayload = await followsRes.json().catch(() => null)
        const rows = Array.isArray(followsPayload?.following) ? followsPayload.following : []
        for (const row of rows) {
          if (row?.following_id) followed.add(row.following_id)
        }
      }

      if (cancelled) return
      setUserId(nextUserId)
      setUsername(nextUsername)
      setPeople(payload.people)
      setFollowingIds(followed)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(
    () => people.filter((person) => matchesQuery(person, query)),
    [people, query]
  )

  const searching = query.trim().length > 0
  const topReviewers = people.filter((person) => person.review_count > 0).slice(0, 6)
  const recent = [...people]
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
    .slice(0, 6)

  function adjustFollowers(id: string, delta: number) {
    setPeople((current) =>
      current.map((person) =>
        person.id === id
          ? { ...person, followers_count: Math.max(0, person.followers_count + delta) }
          : person
      )
    )
  }

  async function toggleFollow(person: Person) {
    if (!userId || userId === person.id || pendingId) return

    const already = followingIds.has(person.id)
    setPendingId(person.id)

    try {
      if (already) {
        const res = await fetch(
          `/api/follows?follower_id=${userId}&following_id=${person.id}`,
          { method: "DELETE" }
        )
        const data = await res.json().catch(() => null)
        if (data?.success) {
          setFollowingIds((current) => {
            const next = new Set(current)
            next.delete(person.id)
            return next
          })
          adjustFollowers(person.id, -1)
        }
      } else {
        const res = await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            follower_id: userId,
            following_id: person.id,
            username: username || "Someone",
          }),
        })
        const data = await res.json().catch(() => null)
        const duplicate = typeof data?.error === "string" && /duplicate|unique|23505/i.test(data.error)
        if (data?.success || duplicate) {
          setFollowingIds((current) => new Set(current).add(person.id))
          if (data?.success) adjustFollowers(person.id, 1)
        }
      }
    } finally {
      setPendingId("")
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
            Records
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Explore People
          </h1>
          <p className="mt-3 text-base text-zinc-400 sm:text-lg">
            Find reviewers, follow music fans, and discover new taste profiles.
          </p>
        </div>

        <div className="mt-8">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search usernames or bios"
            aria-label="Search people"
            className="w-full rounded-full border border-white/10 bg-zinc-950 px-5 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-white/25 [color-scheme:dark]"
          />
          {!userId && !loading && !error && (
            <p className="mt-3 text-sm text-zinc-500">Log in to follow people.</p>
          )}
        </div>

        {loading && <p className="mt-10 text-sm text-zinc-400">Loading people...</p>}

        {!loading && error && <p className="mt-10 text-sm text-zinc-300">Could not load people.</p>}

        {!loading && !error && filtered.length === 0 && (
          <p className="mt-10 text-sm text-zinc-500">No users found.</p>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="mt-10 space-y-12">
            {!searching && topReviewers.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold tracking-tight text-white">Top reviewers</h2>
                <p className="mt-1 text-sm text-zinc-500">People with the most song, album, and artist reviews.</p>
                <div className="mt-4">
                  <PeopleGrid
                    people={topReviewers}
                    userId={userId}
                    followingIds={followingIds}
                    pendingId={pendingId}
                    onToggle={toggleFollow}
                  />
                </div>
              </section>
            )}

            {!searching && recent.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold tracking-tight text-white">Recently joined</h2>
                <p className="mt-1 text-sm text-zinc-500">Newest profiles on Records.</p>
                <div className="mt-4">
                  <PeopleGrid
                    people={recent}
                    userId={userId}
                    followingIds={followingIds}
                    pendingId={pendingId}
                    onToggle={toggleFollow}
                  />
                </div>
              </section>
            )}

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {searching ? "Results" : "Everyone"}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {searching
                  ? `${filtered.length.toLocaleString()} matching ${filtered.length === 1 ? "person" : "people"}`
                  : "Browse every public profile."}
              </p>
              <div className="mt-4">
                <PeopleGrid
                  people={filtered}
                  userId={userId}
                  followingIds={followingIds}
                  pendingId={pendingId}
                  onToggle={toggleFollow}
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  )
}
