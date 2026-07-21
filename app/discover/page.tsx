"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import AppShell from "../components/AppShell"
import TypeBadge from "../components/TypeBadge"

type SearchResult = {
  type: "track" | "album" | "artist"
  name: string
  artist: string
  album: string
  image: string
  spotify: string
  score: number
}

type SearchResponse = {
  query: string
  results: SearchResult[]
  groups: {
    tracks: SearchResult[]
    albums: SearchResult[]
    artists: SearchResult[]
  }
  total: number
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text

  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-[#fa2d48]/25 px-0.5 text-white">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  )
}

function getResultHref(item: SearchResult) {
  if (item.type === "track") {
    return `/song/${encodeURIComponent(item.name + " " + item.artist)}`
  }
  if (item.type === "album") {
    return `/album/${encodeURIComponent(item.name + " " + item.artist)}`
  }
  return `/artist/${encodeURIComponent(item.name)}`
}

function SearchSkeleton() {
  return (
    <div className="mt-12 space-y-10 animate-pulse">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="mb-6 h-4 w-24 rounded bg-white/10" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4"
              >
                <div className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-xl bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-16 rounded-full bg-white/10" />
                  <div className="h-5 w-40 rounded bg-white/10" />
                  <div className="h-4 w-28 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SectionHeading({
  label,
  title,
  subtitle,
}: {
  label?: string
  title: string
  subtitle?: string
}) {
  return (
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
  )
}

function ResultRow({
  item,
  query,
  index,
}: {
  item: SearchResult
  query: string
  index: number
}) {
  const isTrack = item.type === "track"
  const isArtist = item.type === "artist"

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={getResultHref(item)}
        className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06] hover:shadow-[0_16px_48px_rgba(0,0,0,0.35)]"
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image}
            alt={item.name}
            className={`h-[4.5rem] w-[4.5rem] shrink-0 object-cover shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-105 ${
              isArtist ? "rounded-full" : "rounded-xl"
            }`}
          />
        ) : (
          <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-xl bg-zinc-900">
            <span className="text-xs text-zinc-600">No art</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <TypeBadge type={isTrack ? "song" : item.type} />
          <h3 className="mt-2 truncate text-lg font-semibold text-white transition-colors group-hover:text-[#fa2d48]">
            {highlightMatch(item.name, query)}
          </h3>
          <p className="truncate text-sm text-zinc-500">
            {highlightMatch(item.artist, query)}
          </p>
          {item.album && isTrack && (
            <p className="mt-1 truncate text-xs text-zinc-600">{item.album}</p>
          )}
        </div>

        <div className="shrink-0 text-right">
          <span className="text-zinc-600 transition-colors group-hover:text-white">›</span>
          {item.score > 0 && (
            <p className="mt-1 text-[10px] tabular-nums text-zinc-600">
              {item.score}% match
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

function ResultGridCard({
  item,
  query,
  index,
}: {
  item: SearchResult
  query: string
  index: number
}) {
  const isArtist = item.type === "artist"

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={getResultHref(item)} className="group block">
        <div
          className={`relative mb-3 aspect-square overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.5)] transition-transform duration-300 group-hover:scale-[1.03] ${
            isArtist ? "rounded-full ring-2 ring-white/10" : "rounded-2xl ring-1 ring-white/10"
          }`}
        >
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-zinc-900">
              <span className="text-xs text-zinc-600">No art</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <TypeBadge type={item.type === "track" ? "song" : item.type} />
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-[#fa2d48]">
          {highlightMatch(item.name, query)}
        </h3>
        <p className="mt-0.5 truncate text-xs text-zinc-500">
          {highlightMatch(item.artist, query)}
        </p>
      </Link>
    </motion.div>
  )
}

export default function DiscoverPage() {
  const [search, setSearch] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [data, setData] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(search.trim()), 180)
    return () => clearTimeout(timer)
  }, [search])

  const runSearch = useCallback(async (query: string) => {
    abortRef.current?.abort()

    if (!query || query.length < 2) {
      setData(null)
      setLoading(false)
      setError("")
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`, {
        signal: controller.signal,
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.message || json.error || "Search failed")
        setData(null)
        return
      }

      setData(json)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setError("Search failed. Try again.")
      setData(null)
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    runSearch(debouncedQuery)
  }, [debouncedQuery, runSearch])

  const groups = data
    ? [
        { title: "Top matches", type: "all" as const, items: data.results.slice(0, 6) },
        { title: "Songs", type: "track" as const, items: data.groups.tracks },
        { title: "Albums", type: "album" as const, items: data.groups.albums },
        { title: "Artists", type: "artist" as const, items: data.groups.artists },
      ].filter((group) => group.items.length > 0)
    : []

  const showTopMatches = groups.some((group) => group.type === "all")

  const suggestions = [
    { label: "Albums", hint: "Dark Side of the Moon", desc: "Browse and review full albums" },
    { label: "Songs", hint: "Blinding Lights", desc: "Find tracks to rate and review" },
    { label: "Artists", hint: "Frank Ocean", desc: "Explore artist pages and discographies" },
  ]

  return (
    <AppShell bleed>
      {/* Hero + search */}
      <section className="relative overflow-hidden bg-black">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(250,45,72,0.12),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-black to-black" />

        <div className="relative z-10 mx-auto max-w-[88rem] px-5 pb-14 pt-10 sm:px-8 sm:pb-16 sm:pt-12 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                Explore
              </span>
            </div>

            <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-white">
              Discover music
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500 sm:text-lg">
              Search songs, artists, or albums. Results rank by relevance from
              your query.
            </p>

            <div className="relative mt-10 max-w-2xl">
              <svg
                className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try an artist, album, or song..."
                className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] py-4 pl-14 pr-32 text-base text-white shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-md outline-none transition-all placeholder:text-zinc-600 focus:border-white/20 focus:bg-white/[0.08]"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              {loading && (
                <span className="absolute right-5 top-1/2 flex -translate-y-1/2 items-center gap-2 text-sm text-zinc-500">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-400" />
                  Searching
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[88rem] px-5 pb-24 sm:px-8 lg:px-12">
        {!search.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-10 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {suggestions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setSearch(item.hint)}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-left transition-all duration-300 hover:border-white/10 hover:bg-white/[0.06] hover:shadow-[0_16px_40px_rgba(0,0,0,0.3)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#fa2d48]">
                  {item.label}
                </p>
                <p className="mt-2 font-semibold text-white">{item.hint}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                  {item.desc}
                </p>
              </button>
            ))}
          </motion.div>
        )}

        {error && (
          <div className="mt-8 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && debouncedQuery.length >= 2 && <SearchSkeleton />}

        {!loading && debouncedQuery.length >= 2 && groups.length === 0 && !error && (
          <div className="mt-12 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-14 text-center">
            <p className="text-lg text-zinc-400">
              No results for &ldquo;{debouncedQuery}&rdquo;
            </p>
            <p className="mt-2 text-sm text-zinc-600">
              Try a different spelling or fewer words.
            </p>
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="mt-12 space-y-14">
            {groups.map((group) => {
              if (group.type === "all" && !showTopMatches) return null

              const useGrid = group.type === "album" || group.type === "artist"

              return (
                <section key={group.type}>
                  <SectionHeading
                    label={
                      group.type === "all"
                        ? "Best match"
                        : group.type === "track"
                          ? "Songs"
                          : group.type
                    }
                    title={group.title}
                    subtitle={
                      group.type === "all"
                        ? `${data?.total || 0} total results`
                        : `${group.items.length} result${group.items.length !== 1 ? "s" : ""}`
                    }
                  />

                  {useGrid ? (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {group.items.map((item, index) => (
                        <ResultGridCard
                          key={`${group.type}-${item.name}-${item.artist}-${index}`}
                          item={item}
                          query={debouncedQuery}
                          index={index}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {group.items.map((item, index) => (
                        <ResultRow
                          key={`${group.type}-${item.name}-${item.artist}-${index}`}
                          item={item}
                          query={debouncedQuery}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
