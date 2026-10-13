"use client"

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import AppShell from "../components/AppShell"
import { supabase } from "../lib/supabaseClient"

const CATEGORIES = [
  "Genre",
  "Artist",
  "Album",
  "Song",
  "Reviews",
  "Rankings",
  "Debate",
  "Recommendations",
  "News",
  "Local Scene",
  "Other",
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

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-300">
      {children}
    </span>
  )
}

function CommunityCard({
  community,
  loggedIn,
  pending,
  onToggle,
}: {
  community: Community
  loggedIn: boolean
  pending: boolean
  onToggle: (community: Community) => void
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] transition duration-200 hover:border-white/10 hover:bg-white/[0.05]">
      <div className="relative h-28 overflow-hidden bg-zinc-950">
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
          <div className="flex h-full items-end bg-[radial-gradient(ellipse_at_top_left,rgba(250,45,72,0.22),transparent_55%),linear-gradient(160deg,#18181b,#09090b)] p-4">
            <span className="text-3xl font-semibold tracking-tight text-white/80">
              {community.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <Badge>{community.category}</Badge>
          {community.genre && <Badge>{community.genre}</Badge>}
        </div>

        <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">
          <Link href={`/community/${community.id}`} className="hover:text-[#fa2d48]">
            {community.name}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-zinc-400">
          {community.description || "No description yet."}
        </p>

        <p className="mt-4 text-xs text-zinc-500">
          {countLabel(community.member_count, "member", "members")}
          <span className="px-1.5 text-zinc-700">·</span>
          {countLabel(community.post_count, "post", "posts")}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          {community.user_id ? (
            <Link href={`/user/${community.user_id}`} className="text-zinc-300 hover:text-white">
              {community.username}
            </Link>
          ) : (
            <span className="text-zinc-300">{community.username}</span>
          )}
          {community.created_at && (
            <>
              <span className="px-1.5 text-zinc-700">·</span>
              {formatDate(community.created_at)}
            </>
          )}
        </p>

        <div className="mt-5 flex gap-2">
          {loggedIn ? (
            <button
              type="button"
              onClick={() => onToggle(community)}
              disabled={pending}
              className={`inline-flex flex-1 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                community.joined
                  ? "border border-[#fa2d48]/40 bg-[#fa2d48]/10 text-[#fa2d48] hover:bg-[#fa2d48]/20"
                  : "bg-[#fa2d48] text-white hover:bg-[#ff3d56]"
              }`}
            >
              {pending ? "Saving..." : community.joined ? "Leave" : "Join"}
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              Join
            </Link>
          )}
          <Link
            href={`/community/${community.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            Open
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function CommunitiesPage() {
  const router = useRouter()
  const [communities, setCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [userId, setUserId] = useState("")
  const [username, setUsername] = useState("")
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState("")
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Genre",
    genre: "",
    image_url: "",
    rules: "",
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError("")

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

      const query = nextUserId ? `?user_id=${encodeURIComponent(nextUserId)}` : ""
      const res = await fetch(`/api/communities${query}`)
      const payload = await res.json().catch(() => null)

      if (cancelled) return
      if (!res.ok || !Array.isArray(payload)) {
        setCommunities([])
        setError("Could not load communities.")
      } else {
        setCommunities(payload)
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return communities.filter((community) => {
      if (category !== "All" && community.category !== category) return false
      if (!query) return true
      return [community.name, community.description, community.genre, community.category, community.username]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    })
  }, [communities, search, category])

  const searching = search.trim().length > 0 || category !== "All"
  const popular = useMemo(() => {
    return [...filtered]
      .sort((a, b) => {
        if (b.member_count !== a.member_count) return b.member_count - a.member_count
        if (b.post_count !== a.post_count) return b.post_count - a.post_count
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })
      .slice(0, 4)
  }, [filtered])

  async function toggleJoin(community: Community) {
    if (!userId || joiningId != null) return
    setJoiningId(community.id)

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
      setCommunities((current) =>
        current.map((item) =>
          item.id === community.id
            ? {
                ...item,
                joined: Boolean(payload?.joined),
                member_count:
                  typeof payload?.member_count === "number"
                    ? payload.member_count
                    : item.member_count,
              }
            : item
        )
      )
    }
    setJoiningId(null)
  }

  async function createCommunity(event: FormEvent) {
    event.preventDefault()
    if (!userId || submitting) return
    setFormError("")
    setSubmitting(true)

    const res = await fetch("/api/communities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        username,
        user_id: userId,
      }),
    })
    const payload = await res.json().catch(() => null)
    setSubmitting(false)

    if (!res.ok || !payload?.data?.id) {
      setFormError(payload?.error || "Could not create community.")
      return
    }

    router.push(`/community/${payload.data.id}`)
  }

  function renderGrid(list: Community[]) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {list.map((community) => (
          <CommunityCard
            key={community.id}
            community={community}
            loggedIn={Boolean(userId)}
            pending={joiningId === community.id}
            onToggle={toggleJoin}
          />
        ))}
      </div>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fa2d48]">
            Records
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Communities
          </h1>
          <p className="mt-3 text-base text-zinc-400 sm:text-lg">
            Join music groups, start discussions, and debate ratings.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_19.5rem] lg:items-start">
          <aside className="order-1 lg:sticky lg:top-4 lg:order-2">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5">
              {userId ? (
                <>
                  <h2 className="text-base font-semibold text-white">Start a community</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                    Open a room for a genre, artist, scene, or argument worth having.
                  </p>
                  {!creating ? (
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#fa2d48] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff3d56]"
                    >
                      Create community
                    </button>
                  ) : (
                    <form onSubmit={createCommunity} className="mt-4 space-y-3">
                      <input
                        className={fieldClass}
                        placeholder="Name"
                        value={form.name}
                        maxLength={80}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        required
                      />
                      <textarea
                        className={`${fieldClass} min-h-20 resize-y`}
                        placeholder="Description"
                        value={form.description}
                        maxLength={600}
                        onChange={(event) =>
                          setForm({ ...form, description: event.target.value })
                        }
                      />
                      <select
                        className={fieldClass}
                        value={form.category}
                        onChange={(event) => setForm({ ...form, category: event.target.value })}
                      >
                        {CATEGORIES.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                      <input
                        className={fieldClass}
                        placeholder="Genre, optional"
                        value={form.genre}
                        maxLength={40}
                        onChange={(event) => setForm({ ...form, genre: event.target.value })}
                      />
                      <input
                        className={fieldClass}
                        placeholder="Banner image URL, optional"
                        value={form.image_url}
                        onChange={(event) => setForm({ ...form, image_url: event.target.value })}
                      />
                      <textarea
                        className={`${fieldClass} min-h-24 resize-y`}
                        placeholder="Rules"
                        value={form.rules}
                        maxLength={1200}
                        onChange={(event) => setForm({ ...form, rules: event.target.value })}
                      />
                      <p className="text-xs text-zinc-500">Creating as {username}</p>
                      {formError && <p className="text-sm text-[#fa2d48]">{formError}</p>}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex flex-1 items-center justify-center rounded-full bg-[#fa2d48] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff3d56] disabled:opacity-50"
                        >
                          {submitting ? "Creating..." : "Create community"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreating(false)
                            setFormError("")
                          }}
                          className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.05] hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-base font-semibold text-white">Membership</h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                    Log in to create or join communities
                  </p>
                  <Link
                    href="/login"
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[#fa2d48] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff3d56]"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </aside>

          <div className="order-2 min-w-0 lg:order-1">
            <input
              className={fieldClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search communities"
              aria-label="Search communities"
            />

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {["All", ...CATEGORIES].map((item) => {
                const active = category === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-white/20 bg-white text-black"
                        : "border-white/10 bg-white/[0.03] text-zinc-400 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>

            <div className="mt-8" aria-live="polite">
              {loading && <p className="text-sm text-zinc-400">Loading communities...</p>}
              {!loading && error && <p className="text-sm text-zinc-300">{error}</p>}
              {!loading && !error && communities.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
                  <p className="text-sm text-zinc-300">No communities yet. Start the first one.</p>
                </div>
              )}
              {!loading && !error && communities.length > 0 && filtered.length === 0 && (
                <p className="text-sm text-zinc-400">No communities match that search.</p>
              )}

              {!loading && !error && filtered.length > 0 && searching && (
                <section>
                  <h2 className="text-xl font-semibold tracking-tight text-white">
                    {filtered.length === 1 ? "1 community" : `${filtered.length} communities`}
                  </h2>
                  <div className="mt-4">{renderGrid(filtered)}</div>
                </section>
              )}

              {!loading && !error && filtered.length > 0 && !searching && (
                <div className="space-y-10">
                  <section>
                    <h2 className="text-xl font-semibold tracking-tight text-white">
                      Popular communities
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Rooms with the most members and posts.
                    </p>
                    <div className="mt-4">{renderGrid(popular)}</div>
                  </section>
                  <section>
                    <h2 className="text-xl font-semibold tracking-tight text-white">
                      Newest communities
                    </h2>
                    <p className="mt-1 text-sm text-zinc-500">Recently opened.</p>
                    <div className="mt-4">{renderGrid(filtered)}</div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
