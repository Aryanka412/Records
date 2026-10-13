import {
  getSpotifyToken,
  invalidateSpotifyToken,
  readLastfmKey,
  spotifyFailureMessage,
} from "./spotify"

const MARKET = process.env.SPOTIFY_MARKET?.trim() || "CA"
/** Spotify currently rejects artist-album limits above 10. */
const PAGE_SIZE = 10
/** Eight pages per group: 80 releases, above the 50 minimum, stopping when Spotify has no next page. */
export const MAX_RELEASES_PER_GROUP = 80

export type ResolvedArtist = {
  id: string
  name: string
  image: string
  spotify: string
  followers: number
  popularity: number
  genres: string[]
}

export type ArtistTrack = {
  id: string
  name: string
  artist: string
  artists: string[]
  album: string
  image: string
  spotify: string
  duration_ms: number
}

export type ArtistRelease = {
  id: string
  name: string
  artist: string
  image: string
  spotify: string
  release_date: string
  year: string
  total_tracks: number
  album_type: "album" | "single" | "appears_on" | "compilation"
}

export type ArtistDiscography = {
  albums: ArtistRelease[]
  singles: ArtistRelease[]
  appearsOn: ArtistRelease[]
  compilations: ArtistRelease[]
}

type SpotifyArtist = {
  id?: string
  name?: string
  images?: { url?: string }[]
  external_urls?: { spotify?: string }
  followers?: { total?: number }
  popularity?: number
  genres?: string[]
}

type SpotifyAlbum = {
  id?: string
  name?: string
  album_group?: string
  album_type?: string
  artists?: { id?: string; name?: string }[]
  images?: { url?: string }[]
  external_urls?: { spotify?: string }
  release_date?: string
  total_tracks?: number
}

type SpotifyTrack = {
  id?: string
  name?: string
  duration_ms?: number
  popularity?: number
  artists?: { id?: string; name?: string }[]
  album?: { name?: string; images?: { url?: string }[] }
  external_urls?: { spotify?: string }
}

const resolvedArtists = new Map<string, Promise<ResolvedArtist | null>>()
const discographyCache = new Map<string, Promise<ArtistDiscography>>()
/** Artist-albums is on a long Spotify quota window. Skip it until this time. */
let artistAlbumsBlockedUntil = 0

function artistAlbumsBlocked() {
  return Date.now() < artistAlbumsBlockedUntil
}

function noteArtistAlbumsBlock(url: string, retryAfterSeconds: number) {
  if (!url.includes("/artists/") || !url.includes("/albums")) return
  const waitMs = Math.max(retryAfterSeconds, 30) * 1000
  artistAlbumsBlockedUntil = Math.max(artistAlbumsBlockedUntil, Date.now() + waitMs)
}

function artistKey(query: string) {
  return query.trim().toLowerCase()
}

async function spotifyGet<T>(url: string, token: string, allowRefresh = true): Promise<{
  ok: boolean
  status: number
  data: T | null
  token: string
  message: string
}> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (res.status === 401 && allowRefresh) {
    invalidateSpotifyToken()
    const fresh = await getSpotifyToken(true)
    return spotifyGet<T>(url, fresh, false)
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after") || "1")
    noteArtistAlbumsBlock(url, Number.isFinite(retryAfter) ? retryAfter : 60)
    if (retryAfter > 8) {
      const data = await res.json().catch(() => null)
      return {
        ok: false,
        status: 429,
        data: data as T | null,
        token,
        message: spotifyFailureMessage(data, "Spotify rate limit"),
      }
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 3) * 1000))
    const retry = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (retry.status === 429) noteArtistAlbumsBlock(url, Number(retry.headers.get("retry-after") || "60"))
    const data = await retry.json().catch(() => null)
    return {
      ok: retry.ok,
      status: retry.status,
      data: data as T | null,
      token,
      message: spotifyFailureMessage(data, "Spotify request failed"),
    }
  }

  const data = await res.json().catch(() => null)
  return {
    ok: res.ok,
    status: res.status,
    data: data as T | null,
    token,
    message: spotifyFailureMessage(data, "Spotify request failed"),
  }
}

function mapArtist(item: SpotifyArtist): ResolvedArtist | null {
  if (!item.id || !item.name) return null
  return {
    id: item.id,
    name: item.name,
    image: item.images?.[0]?.url || "",
    spotify: item.external_urls?.spotify || "",
    followers: item.followers?.total || 0,
    popularity: item.popularity || 0,
    genres: Array.isArray(item.genres) ? item.genres.slice(0, 6) : [],
  }
}

export async function resolveSpotifyArtist(query: string): Promise<ResolvedArtist | null> {
  const key = artistKey(query)
  if (!key) return null

  const existing = resolvedArtists.get(key)
  if (existing) return existing

  const pending = resolveSpotifyArtistUncached(query.trim()).catch((error) => {
    resolvedArtists.delete(key)
    throw error
  })
  resolvedArtists.set(key, pending)
  const artist = await pending
  if (!artist) resolvedArtists.delete(key)
  return artist
}

async function resolveSpotifyArtistUncached(query: string): Promise<ResolvedArtist | null> {
  const token = await getSpotifyToken()
  const search = await spotifyGet<{ artists?: { items?: SpotifyArtist[] } }>(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=10&market=${MARKET}`,
    token
  )
  if (!search.ok) {
    throw new Error(search.message)
  }

  const items = search.data?.artists?.items || []
  const exact = items.find((item) => item.name?.toLowerCase() === query.toLowerCase())
  const chosen = exact || items[0]
  if (!chosen?.id) return null

  const details = await spotifyGet<SpotifyArtist>(
    `https://api.spotify.com/v1/artists/${chosen.id}`,
    search.token
  )
  if (details.ok && details.data?.id) {
    return mapArtist(details.data)
  }

  return mapArtist(chosen)
}

function trackBelongsToArtist(track: SpotifyTrack, artist: ResolvedArtist) {
  const artists = track.artists || []
  if (artists.some((item) => item.id && item.id === artist.id)) return true
  return artists.some((item) => item.name?.toLowerCase() === artist.name.toLowerCase())
}

function mapTrack(track: SpotifyTrack, artist: ResolvedArtist): ArtistTrack {
  const names = (track.artists || []).map((item) => item.name).filter((name): name is string => Boolean(name))
  return {
    id: track.id || "",
    name: track.name || "Untitled",
    artist: names.join(", ") || artist.name,
    artists: names,
    album: track.album?.name || "",
    image: track.album?.images?.[0]?.url || "",
    spotify: track.external_urls?.spotify || "",
    duration_ms: track.duration_ms || 0,
  }
}

function popularTracks(items: SpotifyTrack[], artist: ResolvedArtist) {
  const seen = new Set<string>()
  return items
    .filter((track) => trackBelongsToArtist(track, artist))
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .filter((track) => {
      const key = (track.name || "").toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 10)
    .map((track) => mapTrack(track, artist))
}

async function lastfmPopularTracks(artist: ResolvedArtist) {
  const key = readLastfmKey()
  if (!key) return []

  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(artist.name)}&api_key=${key}&format=json&limit=10`,
    { cache: "no-store" }
  )
  const data = await res.json().catch(() => null)
  const raw = data?.toptracks?.track
  const names = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .map((track: { name?: string }) => track?.name?.trim() || "")
    .filter(Boolean)
    .slice(0, 10)

  if (names.length === 0) return []

  const token = await getSpotifyToken()
  const tracks: ArtistTrack[] = []
  const seen = new Set<string>()

  for (const name of names) {
    const query = `track:"${name.replace(/"/g, "")}" artist:"${artist.name.replace(/"/g, "")}"`
    const result = await spotifyGet<{ tracks?: { items?: SpotifyTrack[] } }>(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5&market=${MARKET}`,
      token
    )
    const match = (result.data?.tracks?.items || []).find((track) => trackBelongsToArtist(track, artist))
    if (!match?.name) continue
    const keyName = match.name.toLowerCase()
    if (seen.has(keyName)) continue
    seen.add(keyName)
    tracks.push(mapTrack(match, artist))
  }

  return tracks
}

async function searchArtistTracks(artist: ResolvedArtist) {
  const token = await getSpotifyToken()
  const markets = [MARKET, "US"].filter((market, index, list) => list.indexOf(market) === index)
  for (const market of markets) {
    const result = await spotifyGet<{ tracks?: { items?: SpotifyTrack[] } }>(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(`artist:"${artist.name.replace(/"/g, "")}"`)}&type=track&limit=${PAGE_SIZE}&market=${market}`,
      token
    )
    const tracks = popularTracks(result.data?.tracks?.items || [], artist)
    if (tracks.length > 0) return tracks
  }
  return []
}

const trackCache = new Map<string, Promise<{ tracks: ArtistTrack[]; source: "top-tracks" | "releases" }>>()

async function fetchArtistTopTracksUncached(
  artist: ResolvedArtist
): Promise<{ tracks: ArtistTrack[]; source: "top-tracks" | "releases" }> {
  const token = await getSpotifyToken()
  const markets = [MARKET, "CA", "US"].filter((market, index, list) => list.indexOf(market) === index)

  for (const market of markets) {
    const result = await spotifyGet<{ tracks?: SpotifyTrack[] }>(
      `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=${market}`,
      token
    )
    if (!result.ok || !Array.isArray(result.data?.tracks)) continue
    const tracks = popularTracks(result.data.tracks, artist)
    if (tracks.length > 0) return { tracks, source: "top-tracks" }
  }

  const popular = await lastfmPopularTracks(artist)
  if (popular.length > 0) return { tracks: popular, source: "top-tracks" }

  return { tracks: await searchArtistTracks(artist), source: "releases" }
}

export async function fetchArtistTopTracks(artist: ResolvedArtist) {
  const existing = trackCache.get(artist.id)
  if (existing) return existing

  const pending = fetchArtistTopTracksUncached(artist).catch((error) => {
    trackCache.delete(artist.id)
    throw error
  })
  trackCache.set(artist.id, pending)
  return pending
}

function releaseYear(date: string) {
  const year = date.slice(0, 4)
  return /^\d{4}$/.test(year) ? year : ""
}

function normalizeReleaseName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function asGroup(value: string | undefined, fallback: ArtistRelease["album_type"]): ArtistRelease["album_type"] {
  if (value === "album" || value === "single" || value === "appears_on" || value === "compilation") {
    return value
  }
  return fallback
}

function mapRelease(item: SpotifyAlbum, artistName: string, group: ArtistRelease["album_type"]): ArtistRelease | null {
  if (!item.name) return null
  const releaseDate = item.release_date || ""
  const names = (item.artists || []).map((entry) => entry.name).filter((name): name is string => Boolean(name))
  return {
    id: item.id || "",
    name: item.name,
    artist: names.join(", ") || artistName,
    image: item.images?.[0]?.url || "",
    spotify: item.external_urls?.spotify || "",
    release_date: releaseDate,
    year: releaseYear(releaseDate),
    total_tracks: item.total_tracks || 0,
    album_type: asGroup(item.album_group || item.album_type, group),
  }
}

async function fetchReleaseGroup(
  artistId: string,
  group: ArtistRelease["album_type"],
  token: string
) {
  const collected: SpotifyAlbum[] = []
  let next: string | null =
    `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=${group}&market=${MARKET}&limit=${PAGE_SIZE}`
  let pages = 0

  while (next && collected.length < MAX_RELEASES_PER_GROUP && pages < MAX_RELEASES_PER_GROUP / PAGE_SIZE) {
    const pageUrl: string = next
    const result: {
      ok: boolean
      status: number
      data: { items?: SpotifyAlbum[]; next?: string | null } | null
      token: string
      message: string
    } = await spotifyGet<{ items?: SpotifyAlbum[]; next?: string | null }>(pageUrl, token)
    token = result.token
    if (!result.ok) {
      if (collected.length === 0 && pages === 0) {
        throw new Error(result.message)
      }
      break
    }
    const items = Array.isArray(result.data?.items) ? result.data.items : []
    collected.push(...items)
    next = typeof result.data?.next === "string" ? result.data.next : null
    pages += 1
    if (items.length === 0) break
  }

  return { items: collected.slice(0, MAX_RELEASES_PER_GROUP), token }
}

function releaseSortKey(release: ArtistRelease) {
  const date = release.release_date || ""
  if (/^\d{4}$/.test(date)) return `${date}-00-00`
  if (/^\d{4}-\d{2}$/.test(date)) return `${date}-00`
  return date.padEnd(10, "0")
}

function dedupeReleases(releases: ArtistRelease[]) {
  const priority: Record<ArtistRelease["album_type"], number> = {
    album: 4,
    single: 3,
    compilation: 2,
    appears_on: 1,
  }
  const kept = new Map<string, ArtistRelease>()

  for (const release of releases) {
    const key = `${normalizeReleaseName(release.name)}:${release.year}`
    const existing = kept.get(key)
    if (!existing) {
      kept.set(key, release)
      continue
    }
    const existingScore = priority[existing.album_type] * 10 + (existing.image ? 1 : 0)
    const nextScore = priority[release.album_type] * 10 + (release.image ? 1 : 0)
    if (nextScore > existingScore) kept.set(key, release)
  }

  return [...kept.values()].sort((a, b) => releaseSortKey(b).localeCompare(releaseSortKey(a)))
}

function groupForSearchedRelease(item: SpotifyAlbum, artist: ResolvedArtist): ArtistRelease["album_type"] {
  const primary = item.artists?.[0]
  const isPrimary = primary?.id === artist.id || primary?.name?.toLowerCase() === artist.name.toLowerCase()
  if (!isPrimary) return "appears_on"
  if (item.album_type === "single" || item.album_type === "compilation" || item.album_type === "album") {
    return item.album_type
  }
  return "album"
}

function releaseBelongsToArtist(item: SpotifyAlbum, artist: ResolvedArtist) {
  return (item.artists || []).some((entry) => entry.id === artist.id)
}

async function searchArtistReleases(artist: ResolvedArtist, token: string) {
  const collected: SpotifyAlbum[] = []
  const seen = new Set<string>()
  const markets = [MARKET, "US"].filter((market, index, list) => list.indexOf(market) === index)

  for (const market of markets) {
    for (let offset = 0; offset < MAX_RELEASES_PER_GROUP && collected.length < MAX_RELEASES_PER_GROUP; offset += PAGE_SIZE) {
      const result = await spotifyGet<{ albums?: { items?: SpotifyAlbum[] } }>(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(`artist:"${artist.name.replace(/"/g, "")}"`)}&type=album&limit=${PAGE_SIZE}&offset=${offset}&market=${market}`,
        token
      )
      token = result.token
      if (!result.ok) break
      const items = Array.isArray(result.data?.albums?.items) ? result.data.albums.items : []
      for (const item of items) {
        if (!item.id || seen.has(item.id) || !releaseBelongsToArtist(item, artist)) continue
        seen.add(item.id)
        collected.push(item)
      }
      if (items.length < PAGE_SIZE) break
    }
    if (collected.length > 0) break
  }

  return collected
}

function packReleases(releases: ArtistRelease[]): ArtistDiscography {
  const unique = dedupeReleases(releases)
  return {
    albums: unique.filter((item) => item.album_type === "album"),
    singles: unique.filter((item) => item.album_type === "single"),
    appearsOn: unique.filter((item) => item.album_type === "appears_on"),
    compilations: unique.filter((item) => item.album_type === "compilation"),
  }
}

async function fetchArtistDiscographyUncached(artist: ResolvedArtist): Promise<ArtistDiscography> {
  const token = await getSpotifyToken()
  const groups: ArtistRelease["album_type"][] = ["album", "single", "appears_on", "compilation"]
  const pages = artistAlbumsBlocked()
    ? []
    : await Promise.all(
        groups.map(async (group) => {
          try {
            const page = await fetchReleaseGroup(artist.id, group, token)
            return { group, items: page.items, failed: false }
          } catch {
            return { group, items: [] as SpotifyAlbum[], failed: true }
          }
        })
      )

  const anyItems = pages.some((page) => page.items.length > 0)
  const allFailed = pages.length === 0 || pages.every((page) => page.failed)

  if (!anyItems) {
    const searched = await searchArtistReleases(artist, token)
    if (searched.length === 0) {
      if (allFailed) throw new Error("Could not load discography.")
      return { albums: [], singles: [], appearsOn: [], compilations: [] }
    }
    const mapped: ArtistRelease[] = []
    for (const item of searched) {
      const group = groupForSearchedRelease(item, artist)
      const release = mapRelease(item, artist.name, group)
      if (release) mapped.push({ ...release, album_type: group })
    }
    return packReleases(mapped)
  }

  const mapped: ArtistRelease[] = []
  for (const page of pages) {
    for (const item of page.items) {
      const release = mapRelease(item, artist.name, page.group)
      if (release) mapped.push({ ...release, album_type: page.group })
    }
  }

  return packReleases(mapped)
}

export async function fetchArtistDiscography(artist: ResolvedArtist): Promise<ArtistDiscography> {
  const existing = discographyCache.get(artist.id)
  if (existing) return existing

  const pending = fetchArtistDiscographyUncached(artist).catch((error) => {
    discographyCache.delete(artist.id)
    throw error
  })
  discographyCache.set(artist.id, pending)
  return pending
}
