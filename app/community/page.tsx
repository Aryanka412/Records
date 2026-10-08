"use client"

import { useEffect, useMemo, useState } from "react"
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
  creator_username: string
  creator_user_id: string | null
  created_at: string
  member_count: number
  post_count: number
}

type SessionUser = {
  id: string
  username: string
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default function CommunitiesPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [communities, setCommunities] = useState<Community[]>([])
  const [joinedIds, setJoinedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState("")
  const [joiningId, setJoiningId] = useState<number | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [formCategory, setFormCategory] = useState("Genre")
  const [genre, setGenre] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [rules, setRules] = useState("")

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
    let cancelled = false
    async function load() {
      setLoading(true)
      setError("")
      try {
        const response = await fetch("/api/communities")
        const data = await response.json().catch(() => null)
        if (!response.ok || !Array.isArray(data)) {
          if (!cancelled) setError("Could not load communities.")
          return
        }
        if (!cancelled) setCommunities(data)
      } catch {
        if (!cancelled) setError("Could not load communities.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setJoinedIds([])
      return
    }
    let cancelled = false
    fetch(`/api/community-members?user_id=${encodeURIComponent(user.id)}`)
      .then((response) => response.json().catch(() => null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.joined_ids)) setJoinedIds(data.joined_ids)
      })
      .catch(() => {
        if (!cancelled) setJoinedIds([])
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return communities.filter((community) => {
      const matchesCategory = category === "All" || community.category === category
      const haystack = [community.name, community.description, community.category, community.genre || ""]
        .join(" ")
        .toLowerCase()
      return matchesCategory && (!needle || haystack.includes(needle))
    })
  }, [communities, query, category])

  const popular = useMemo(
    () => [...filtered].sort((a, b) => b.member_count - a.member_count || b.post_count - a.post_count).slice(0, 4),
    [filtered]
  )
  const newest = useMemo(
    () => [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [filtered]
  )

  async function createCommunity(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return
    setCreating(true)
    setFormError("")
    try {
      const response = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category: formCategory,
          genre,
          image_url: imageUrl,
          rules,
          creator_username: user.username,
          creator_user_id: user.id,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.id) {
        setFormError(typeof data?.error === "string" ? data.error : "Could not create community.")
        return
      }
      setCommunities((current) => [data, ...current.filter((item) => item.id !== data.id)])
      setJoinedIds((current) => (current.includes(data.id) ? current : [data.id, ...current]))
      setName("")
      setDescription("")
      setGenre("")
      setImageUrl("")
      setRules("")
      setShowForm(false)
    } catch {
      setFormError("Could not create community.")
    } finally {
      setCreating(false)
    }
  }

  async function toggleJoin(community: Community) {
    if (!user) return
    const joined = joinedIds.includes(community.id)
    setJoiningId(community.id)
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
      const data = await response.json().catch(() => null)
      if (!response.ok && response.status !== 409) return
      setJoinedIds((current) =>
        joined ? current.filter((id) => id !== community.id) : current.includes(community.id) ? current : [...current, community.id]
      )
      setCommunities((current) =>
        current.map((item) =>
          item.id === community.id
            ? {
                ...item,
                member_count: Math.max(0, item.member_count + (joined && response.ok ? -1 : joined ? 0 : 1)),
              }
            : item
        )
      )
      if (typeof data?.error === "string" && response.status === 409) {
        setJoinedIds((current) => (current.includes(community.id) ? current : [...current, community.id]))
      }
    } finally {
      setJoiningId(null)
    }
  }

  function renderCard(community: Community) {
    const joined = joinedIds.includes(community.id)
    return (
      <article
        key={community.id}
        className="flex h-full flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 transition hover:border-white/[0.14] hover:bg-white/[0.05]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#fa2d48]">
              {community.category}
              {community.genre ? ` · ${community.genre}` : ""}
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-tight text-white">{community.name}</h3>
          </div>
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-zinc-400">
          {community.description || "No description yet."}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-500">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em]">Members</dt>
            <dd className="mt-1 text-white">{community.member_count}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.14em]">Posts</dt>
            <dd className="mt-1 text-white">{community.post_count}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-zinc-500">
          Started by {community.creator_username} · {formatDate(community.created_at)}
        </p>
        <div className="mt-5 flex gap-2">
          {user ? (
            <button
              type="button"
              disabled={joiningId === community.id}
              onClick={() => toggleJoin(community)}
              className={joined ? "btn btn-secondary !px-4 !py-2 !text-sm" : "btn btn-primary !px-4 !py-2 !text-sm"}
            >
              {joiningId === community.id ? "Saving..." : joined ? "Leave" : "Join"}
            </button>
          ) : (
            <a href="/login" className="btn btn-secondary !px-4 !py-2 !text-sm">
              Log in
            </a>
          )}
          <a href={`/community/${community.id}`} className="btn btn-secondary !px-4 !py-2 !text-sm">
            Open
          </a>
        </div>
      </article>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-[88rem] px-5 py-10 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-label">Records</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">Communities</h1>
            <p className="mt-3 max-w-2xl text-base text-zinc-400 sm:text-lg">
              Join music groups, start discussions, and debate ratings.
            </p>
          </div>
          {user ? (
            <button type="button" onClick={() => setShowForm((open) => !open)} className="btn btn-primary">
              {showForm ? "Close" : "Create community"}
            </button>
          ) : (
            <p className="text-sm text-zinc-400">Log in to create or join communities</p>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search communities"
            className="input-field"
          />
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {["All", ...CATEGORIES].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold tracking-wide ${
                category === item
                  ? "border-[#fa2d48]/40 bg-[#fa2d48]/15 text-white"
                  : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {showForm && user && (
          <form onSubmit={createCommunity} className="glass-panel mt-8 space-y-4 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">New community</h2>
            <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Name" className="input-field" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} required placeholder="Description" className="input-field min-h-28" />
            <div className="grid gap-4 sm:grid-cols-2">
              <select value={formCategory} onChange={(event) => setFormCategory(event.target.value)} className="input-field">
                {CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <input value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Genre, optional" className="input-field" />
            </div>
            <input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="Banner image URL, optional" className="input-field" />
            <textarea value={rules} onChange={(event) => setRules(event.target.value)} placeholder="Rules" className="input-field min-h-24" />
            {formError && <p className="text-sm text-white">{formError}</p>}
            <button type="submit" disabled={creating} className="btn btn-primary">
              {creating ? "Creating..." : "Create community"}
            </button>
          </form>
        )}

        {loading && <p className="mt-10 text-sm text-zinc-400">Loading communities...</p>}
        {error && <p className="mt-10 text-sm text-white">{error}</p>}

        {!loading && !error && communities.length === 0 && (
          <p className="mt-10 text-sm text-zinc-400">No communities yet. Start the first one.</p>
        )}

        {!loading && !error && communities.length > 0 && filtered.length === 0 && (
          <p className="mt-10 text-sm text-zinc-400">No communities match that search.</p>
        )}

        {!loading && !error && popular.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Popular communities</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{popular.map(renderCard)}</div>
          </section>
        )}

        {!loading && !error && newest.length > 0 && (
          <section className="mt-12">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">Newest communities</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">{newest.map(renderCard)}</div>
          </section>
        )}
      </div>
    </AppShell>
  )
}
