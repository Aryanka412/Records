let cachedToken: { value: string; expiresAt: number } | null = null

export function readSpotifyCredentials() {
  const clientId = process.env.SPOTIFY_CLIENT_ID?.trim() ?? ""
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim() ?? ""
  return { clientId, clientSecret }
}

export function readLastfmKey() {
  return process.env.LASTFM_API_KEY?.trim() ?? ""
}

export function missingSpotifyCredentialsBody() {
  const { clientId, clientSecret } = readSpotifyCredentials()
  if (clientId && clientSecret) return null
  return {
    error: "Missing Spotify credentials" as const,
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
  }
}

export function spotifyCredentialsResponse(): Response {
  const { clientId, clientSecret } = readSpotifyCredentials()
  return Response.json(
    {
      error: "Missing Spotify credentials",
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
    },
    { status: 500 }
  )
}

export function missingLastfmResponse() {
  if (readLastfmKey()) return null
  return Response.json({ error: "Missing Last.fm API key" }, { status: 500 })
}

export function spotifyFailureMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object") return fallback
  const record = data as {
    error?: unknown
    error_description?: unknown
    message?: unknown
  }
  if (typeof record.error_description === "string" && record.error_description.trim()) {
    return record.error_description.trim()
  }
  if (typeof record.error === "string" && record.error.trim()) return record.error.trim()
  if (record.error && typeof record.error === "object") {
    const message = (record.error as { message?: unknown }).message
    if (typeof message === "string" && message.trim()) return message.trim()
  }
  if (typeof record.message === "string" && record.message.trim()) return record.message.trim()
  return fallback
}

export function invalidateSpotifyToken() {
  cachedToken = null
}

export async function getSpotifyToken(forceRefresh = false) {
  const { clientId, clientSecret } = readSpotifyCredentials()

  if (!clientId || !clientSecret) {
    throw new Error("Missing Spotify credentials")
  }

  if (
    !forceRefresh &&
    cachedToken &&
    Date.now() < cachedToken.expiresAt - 120_000
  ) {
    return cachedToken.value
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  })

  const tokenData = await tokenRes.json().catch(() => null)

  if (!tokenRes.ok || !tokenData?.access_token) {
    invalidateSpotifyToken()
    throw new Error(spotifyFailureMessage(tokenData, `Spotify token request failed (${tokenRes.status})`))
  }

  cachedToken = {
    value: tokenData.access_token,
    expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
  }

  return cachedToken.value
}

export type SearchResult = {
  type: "track" | "album" | "artist"
  name: string
  artist: string
  album: string
  image: string
  spotify: string
  popularity: number
  score: number
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i])
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[b.length][a.length]
}

function fuzzyScore(text: string, query: string) {
  const normalizedText = normalize(text)
  const normalizedQuery = normalize(query)

  if (!normalizedQuery) return 0
  if (normalizedText === normalizedQuery) return 100
  if (normalizedText.startsWith(normalizedQuery)) return 85
  if (normalizedText.includes(normalizedQuery)) return 65

  const words = normalizedQuery.split(" ")
  const textWords = normalizedText.split(" ")

  let wordScore = 0
  for (const word of words) {
    if (normalizedText.includes(word)) {
      wordScore += 18
      continue
    }

    for (const textWord of textWords) {
      const distance = levenshtein(word, textWord)
      if (distance <= 1 && word.length > 2) {
        wordScore += 12
        break
      }
    }
  }

  return wordScore
}

export function scoreResult(item: SearchResult, query: string) {
  const q = normalize(query)
  const nameScore = fuzzyScore(item.name, q) * 1.2
  const artistScore = fuzzyScore(item.artist, q)
  const albumScore = fuzzyScore(item.album, q)
  const popularityBoost = Math.min(item.popularity || 0, 100) * 0.08

  let typeBoost = 0
  if (item.type === "artist" && artistScore > nameScore * 0.9) typeBoost += 8
  if (item.type === "album" && albumScore > 40) typeBoost += 6

  return Math.round(nameScore + artistScore * 0.85 + albumScore * 0.6 + popularityBoost + typeBoost)
}

export function buildSpotifyQuery(rawQuery: string) {
  const query = rawQuery.trim()

  if (!query) return query

  const artistAlbum = query.match(/^(.+?)\s[-–—]\s(.+)$/i)
  if (artistAlbum) {
    return `album:${artistAlbum[2].trim()} artist:${artistAlbum[1].trim()}`
  }

  return query
}

export function mapSpotifyResults(data: any, query: string): SearchResult[] {
  const tracks: SearchResult[] =
    data.tracks?.items?.map((item: any) => ({
      type: "track" as const,
      name: item.name,
      artist: item.artists?.[0]?.name || "Unknown artist",
      album: item.album?.name || "",
      image: item.album?.images?.[0]?.url || item.images?.[0]?.url || "",
      spotify: item.external_urls?.spotify || "",
      popularity: item.popularity || item.album?.popularity || 0,
      score: 0,
    })) || []

  const artists: SearchResult[] =
    data.artists?.items?.map((item: any) => ({
      type: "artist" as const,
      name: item.name,
      artist: "Artist",
      album: "",
      image: item.images?.[0]?.url || "",
      spotify: item.external_urls?.spotify || "",
      popularity: item.popularity || 0,
      score: 0,
    })) || []

  const albums: SearchResult[] =
    data.albums?.items?.map((item: any) => ({
      type: "album" as const,
      name: item.name,
      artist: item.artists?.[0]?.name || "Unknown artist",
      album: "Album",
      image: item.images?.[0]?.url || "",
      spotify: item.external_urls?.spotify || "",
      popularity: item.popularity || 0,
      score: 0,
    })) || []

  const deduped = new Map<string, SearchResult>()

  for (const item of [...tracks, ...albums, ...artists]) {
    const key = `${item.type}:${item.name}:${item.artist}`.toLowerCase()
    const scored = { ...item, score: scoreResult(item, query) }

    const existing = deduped.get(key)
    if (!existing || scored.score > existing.score) {
      deduped.set(key, scored)
    }
  }

  return Array.from(deduped.values()).sort((a, b) => b.score - a.score)
}

export async function searchSpotify(query: string, limit = 10) {
  const spotifyQuery = buildSpotifyQuery(query)
  // Spotify allows max limit=10 when searching multiple types at once
  const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 10)
  const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(spotifyQuery)}&type=track,artist,album&limit=${safeLimit}&market=US`

  async function runSearch(token: string) {
    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    const data = await res.json()
    return { res, data }
  }

  let token = await getSpotifyToken()
  let { res, data } = await runSearch(token)

  if (res.status === 401) {
    invalidateSpotifyToken()
    token = await getSpotifyToken(true)
    ;({ res, data } = await runSearch(token))
  }

  if (!res.ok) {
    throw new Error(data?.error?.message || "Spotify search failed")
  }

  return mapSpotifyResults(data, query)
}

const SPOTIFY_MARKET = process.env.SPOTIFY_MARKET?.trim() || "CA"
const SPOTIFY_MARKETS = [SPOTIFY_MARKET, "CA", "US"].filter(
  (market, index, arr) => arr.indexOf(market) === index
)

function spotifyFetch(url: string, token: string) {
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
}

async function spotifyFetchJson<T = Record<string, unknown>>(
  url: string,
  token: string,
  retries = 1
): Promise<{ ok: boolean; status: number; data: T | null; token: string }> {
  const res = await spotifyFetch(url, token)

  if (res.status === 401 && retries > 0) {
    invalidateSpotifyToken()
    const freshToken = await getSpotifyToken(true)
    return spotifyFetchJson(url, freshToken, retries - 1)
  }

  if (res.status === 429 && retries > 0) {
    const retryAfter = Number(res.headers.get("retry-after") || "2")
    await new Promise((resolve) => setTimeout(resolve, Math.min(retryAfter, 5) * 1000))
    return spotifyFetchJson(url, token, retries - 1)
  }

  const text = await res.text()
  if (!text) {
    return { ok: res.ok, status: res.status, data: null, token }
  }

  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) as T, token }
  } catch {
    return { ok: false, status: res.status, data: null, token }
  }
}

export type CatalogTrack = {
  id: string
  name: string
  artist: string
  album: string
  image: string
  spotify: string
  duration_ms: number
  popularity: number
}

export type CatalogRelease = {
  id: string
  name: string
  artist: string
  image: string
  spotify: string
  release_date: string
  total_tracks: number
  album_type: "album" | "single" | "compilation" | "appears_on"
}

export type CatalogArtist = {
  id: string
  name: string
  image: string
  spotify: string
  popularity: number
}

export type ArtistCatalog = {
  topTracks: CatalogTrack[]
  allTracks: CatalogTrack[]
  featureTracks: CatalogTrack[]
  albums: CatalogRelease[]
  singles: CatalogRelease[]
  compilations: CatalogRelease[]
  features: CatalogRelease[]
  latestRelease: CatalogRelease | null
  relatedArtists: CatalogArtist[]
  counts: {
    albums: number
    singles: number
    compilations: number
    features: number
    allTracks: number
    featureTracks: number
  }
}

async function fetchArtistAlbumPages(
  artistId: string,
  token: string,
  maxPages = 40,
  groups = "album,single,compilation,appears_on"
) {
  const byId = new Map<string, any>()
  let offset = 0

  while (offset / 50 < maxPages) {
    const { ok, data } = await spotifyFetchJson<any>(
      `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=${groups}&market=${SPOTIFY_MARKET}&limit=50&offset=${offset}`,
      token
    )
    if (!ok || !Array.isArray(data?.items) || data.items.length === 0) break

    for (const item of data.items) {
      if (item?.id) byId.set(item.id, item)
    }

    if (data.items.length < 50) break
    offset += 50
  }

  return [...byId.values()]
}

async function fetchAllArtistAlbumPages(artistId: string, token: string, maxPages = 40) {
  const byId = new Map<string, any>()
  const groupSets = [
    "album,single,compilation,appears_on",
    "album,single,compilation",
    "album,single",
    "album",
  ]

  for (const groups of groupSets) {
    const items = await fetchArtistAlbumPages(artistId, token, maxPages, groups)
    for (const item of items) {
      if (item?.id) byId.set(item.id, item)
    }
    if (byId.size > 0) break
  }

  if (byId.size === 0) {
    const items = await fetchArtistAlbumPages(
      artistId,
      token,
      maxPages,
      "album,single,compilation,appears_on"
    )
    for (const item of items) {
      if (item?.id) byId.set(item.id, item)
    }
  }

  return [...byId.values()]
}

async function searchArtistReleases(artistName: string, token: string, maxPages = 4) {
  const byId = new Map<string, any>()

  for (let offset = 0; offset / 50 < maxPages; offset += 50) {
    const { ok, data } = await spotifyFetchJson<any>(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(`artist:${artistName}`)}&type=album&limit=50&offset=${offset}&market=${SPOTIFY_MARKET}`,
      token
    )
    const items = data?.albums?.items
    if (!ok || !Array.isArray(items) || items.length === 0) break
    for (const item of items) {
      if (item?.id) byId.set(item.id, item)
    }
    if (items.length < 50) break
  }

  return [...byId.values()]
}

function artistMatchesTrack(item: any, artistId: string, artistName: string) {
  const artists = item.artists || []
  return artists.some(
    (artist: any) =>
      artist.id === artistId || artist.name?.toLowerCase() === artistName.toLowerCase()
  )
}

function isPrimaryArtistTrack(item: any, artistId: string, artistName: string) {
  const primary = item.artists?.[0]
  if (!primary) return false
  return primary.id === artistId || primary.name?.toLowerCase() === artistName.toLowerCase()
}

async function fetchAllArtistTracks(artistId: string, artistName: string, token: string) {
  const primary = new Map<string, CatalogTrack>()
  const featured = new Map<string, CatalogTrack>()

  try {
    for (let offset = 0; offset < 500; offset += 50) {
      const res = await spotifyFetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(`artist:"${artistName}"`)}&type=track&limit=50&offset=${offset}&market=${SPOTIFY_MARKET}`,
        token
      )
      const data = await res.json()
      if (!res.ok) break
      const items = data.tracks?.items
      if (!Array.isArray(items) || items.length === 0) break

      for (const item of items) {
        if (!item?.id || !artistMatchesTrack(item, artistId, artistName)) continue

        const track = mapTrack(item, artistName)
        if (isPrimaryArtistTrack(item, artistId, artistName)) {
          if (!primary.has(item.id)) primary.set(item.id, track)
        } else {
          const featureTrack = {
            ...track,
            artist: (item.artists || []).map((a: any) => a.name).join(", "),
          }
          if (!featured.has(item.id)) featured.set(item.id, featureTrack)
        }
      }

      if (items.length < 50) break
    }

    // Fallback query without quotes if quoted search returned nothing
    if (primary.size === 0 && featured.size === 0) {
      for (let offset = 0; offset < 500; offset += 50) {
        const res = await spotifyFetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(`artist:${artistName}`)}&type=track&limit=50&offset=${offset}&market=${SPOTIFY_MARKET}`,
          token
        )
        const data = await res.json()
        if (!res.ok) break
        const items = data.tracks?.items
        if (!Array.isArray(items) || items.length === 0) break

        for (const item of items) {
          if (!item?.id || !artistMatchesTrack(item, artistId, artistName)) continue
          const track = mapTrack(item, artistName)
          if (isPrimaryArtistTrack(item, artistId, artistName)) {
            if (!primary.has(item.id)) primary.set(item.id, track)
          } else {
            const featureTrack = {
              ...track,
              artist: (item.artists || []).map((a: any) => a.name).join(", "),
            }
            if (!featured.has(item.id)) featured.set(item.id, featureTrack)
          }
        }
        if (items.length < 50) break
      }
    }
  } catch {
    // Search can fail under rate limits — top-tracks still returned separately
  }

  const byPopularity = (a: CatalogTrack, b: CatalogTrack) => b.popularity - a.popularity

  return {
    allTracks: [...primary.values()].sort(byPopularity),
    featureTracks: [...featured.values()].sort(byPopularity),
  }
}

async function fetchTopTracks(artistId: string, artistName: string, token: string) {
  for (const market of SPOTIFY_MARKETS) {
    const { ok, data } = await spotifyFetchJson<any>(
      `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=${market}`,
      token
    )
    if (ok && Array.isArray(data?.tracks) && data.tracks.length > 0) {
      return data.tracks.map((track: any) => mapTrack(track, artistName))
    }
  }

  for (const market of SPOTIFY_MARKETS) {
    const { ok, data } = await spotifyFetchJson<any>(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(`artist:${artistName}`)}&type=track&limit=10&market=${market}`,
      token
    )
    const items = data?.tracks?.items
    if (ok && Array.isArray(items) && items.length > 0) {
      return items.map((track: any) => mapTrack(track, artistName))
    }
  }

  return []
}

function splitReleases(rawAlbums: any[], artistName: string) {
  const allReleases = dedupeReleases(
    rawAlbums.map((item: any) => mapRelease(item, artistName))
  )

  let albums = sortByReleaseDate(allReleases.filter((item) => item.album_type === "album"))
  const singles = sortByReleaseDate(allReleases.filter((item) => item.album_type === "single"))
  const compilations = sortByReleaseDate(
    allReleases.filter((item) => item.album_type === "compilation")
  )
  const features = sortByReleaseDate(
    allReleases.filter((item) => item.album_type === "appears_on")
  )

  if (albums.length === 0 && allReleases.length > 0) {
    albums = sortByReleaseDate(allReleases.filter((item) => item.album_type !== "appears_on"))
  }

  const latestRelease = sortByReleaseDate([...albums, ...singles, ...compilations])[0] || null

  return { albums, singles, compilations, features, latestRelease }
}

export async function getArtistDiscographyQuick(
  artistId: string,
  artistName: string
): Promise<Pick<ArtistCatalog, "topTracks" | "albums" | "singles" | "compilations" | "features" | "latestRelease">> {
  const token = await getSpotifyToken()

  const [topTracks, rawAlbums] = await Promise.all([
    fetchTopTracks(artistId, artistName, token),
    fetchArtistAlbumPages(artistId, token, 6, "album,single,compilation").catch(() => [] as any[]),
  ])

  let albumsRaw = rawAlbums
  if (albumsRaw.length === 0) {
    albumsRaw = await searchArtistReleases(artistName, token).catch(() => [])
  }

  const releases = splitReleases(albumsRaw, artistName)

  if (releases.albums.length === 0 && releases.singles.length === 0 && topTracks.length > 0) {
    releases.albums = releasesFromTracks(topTracks, artistName)
    if (!releases.latestRelease && releases.albums.length > 0) {
      releases.latestRelease = releases.albums[0]
    }
  }

  return {
    topTracks,
    ...releases,
  }
}

export async function getArtistCatalogById(
  artistId: string,
  artistName: string
): Promise<ArtistCatalog> {
  const token = await getSpotifyToken()

  // Fast: always load popular tracks first so songs never disappear
  const topTracks = await fetchTopTracks(artistId, artistName, token)

  const [relatedRes, rawAlbums, trackGroups] = await Promise.all([
    spotifyFetch(`https://api.spotify.com/v1/artists/${artistId}/related-artists`, token),
    fetchAllArtistAlbumPages(artistId, token).catch(() => [] as any[]),
    fetchAllArtistTracks(artistId, artistName, token).catch(() => ({
      allTracks: [] as CatalogTrack[],
      featureTracks: [] as CatalogTrack[],
    })),
  ])

  const relatedData = await relatedRes.json().catch(() => ({}))

  let allTracks = trackGroups.allTracks
  let featureTracks = trackGroups.featureTracks

  // Ensure allTracks at least includes popular tracks
  if (allTracks.length === 0 && topTracks.length > 0) {
    allTracks = topTracks
  } else if (topTracks.length > 0) {
    const seen = new Set(allTracks.map((t) => t.id))
    for (const track of topTracks) {
      if (!seen.has(track.id)) {
        allTracks = [track, ...allTracks]
        seen.add(track.id)
      }
    }
  }

  let albumsRaw = rawAlbums
  if (albumsRaw.length === 0) {
    albumsRaw = await searchArtistReleases(artistName, token).catch(() => [])
  }

  let { albums, singles, compilations, features, latestRelease } = splitReleases(
    albumsRaw,
    artistName
  )

  if (albums.length === 0 && singles.length === 0 && topTracks.length > 0) {
    albums = releasesFromTracks(topTracks, artistName)
    if (!latestRelease && albums.length > 0) {
      latestRelease = albums[0]
    }
  }

  const relatedArtists: CatalogArtist[] =
    relatedRes.ok && relatedData.artists
      ? relatedData.artists.slice(0, 12).map((item: any) => ({
          id: item.id,
          name: item.name,
          image: item.images?.[0]?.url || "",
          spotify: item.external_urls?.spotify || "",
          popularity: item.popularity || 0,
        }))
      : []

  return {
    topTracks,
    allTracks,
    featureTracks,
    albums,
    singles,
    compilations,
    features,
    latestRelease,
    relatedArtists,
    counts: {
      albums: albums.length,
      singles: singles.length,
      compilations: compilations.length,
      features: features.length,
      allTracks: allTracks.length,
      featureTracks: featureTracks.length,
    },
  }
}

export async function findSpotifyArtist(query: string) {
  const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=1&market=${SPOTIFY_MARKET}`

  async function runLookup(token: string) {
    const res = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    const data = await res.json()
    return { res, data }
  }

  let token = await getSpotifyToken()
  let { res, data } = await runLookup(token)

  if (res.status === 401) {
    invalidateSpotifyToken()
    token = await getSpotifyToken(true)
    ;({ res, data } = await runLookup(token))
  }

  if (!res.ok) {
    throw new Error(data?.error?.message || "Spotify artist lookup failed")
  }

  return data.artists?.items?.[0] || null
}

function mapTrack(item: any, artistName: string): CatalogTrack {
  return {
    id: item.id || "",
    name: item.name,
    artist: item.artists?.[0]?.name || artistName,
    album: item.album?.name || "",
    image: item.album?.images?.[0]?.url || item.images?.[0]?.url || "",
    spotify: item.external_urls?.spotify || "",
    duration_ms: item.duration_ms || 0,
    popularity: item.popularity || 0,
  }
}

function mapRelease(item: any, artistName: string): CatalogRelease {
  const group = item.album_group || item.album_type || "album"
  return {
    id: item.id || "",
    name: item.name,
    artist: item.artists?.[0]?.name || artistName,
    image: item.images?.[0]?.url || "",
    spotify: item.external_urls?.spotify || "",
    release_date: item.release_date || "",
    total_tracks: item.total_tracks || 0,
    album_type: group as CatalogRelease["album_type"],
  }
}

function dedupeReleases(items: CatalogRelease[]) {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.id || `${item.name.toLowerCase()}:${item.album_type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function releasesFromTracks(tracks: CatalogTrack[], artistName: string): CatalogRelease[] {
  const map = new Map<string, CatalogRelease>()
  for (const track of tracks) {
    if (!track.album) continue
    const key = track.album.toLowerCase()
    if (map.has(key)) continue
    map.set(key, {
      id: key,
      name: track.album,
      artist: track.artist || artistName,
      image: track.image,
      spotify: track.spotify,
      release_date: "",
      total_tracks: 0,
      album_type: "album",
    })
  }
  return [...map.values()]
}

function sortByReleaseDate(items: CatalogRelease[]) {
  return [...items].sort((a, b) => {
    const aDate = a.release_date.padEnd(10, "0")
    const bDate = b.release_date.padEnd(10, "0")
    return bDate.localeCompare(aDate)
  })
}

export async function getArtistCatalog(artistQuery: string): Promise<ArtistCatalog | null> {
  const foundArtist = await findSpotifyArtist(artistQuery)
  if (!foundArtist) return null
  return getArtistCatalogById(foundArtist.id, foundArtist.name)
}

export type FeaturedHeroArtist = {
  name: string
  image: string
  spotify: string
  spotifyId: string
  topTrack: string
  topTrackImage: string
  genres: string[]
}

export async function getFeaturedHeroArtists(limit = 5): Promise<FeaturedHeroArtist[]> {
  const token = await getSpotifyToken()
  const lastKey = readLastfmKey()

  let artistNames: string[] = []

  if (lastKey) {
    const trendingRes = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=chart.gettopartists&api_key=${lastKey}&format=json&limit=${limit}`,
      { next: { revalidate: 3600 } }
    )
    const trendingData = await trendingRes.json()
    artistNames =
      trendingData.artists?.artist?.map((item: { name: string }) => item.name).slice(0, limit) ||
      []
  }

  if (artistNames.length === 0) {
    artistNames = ["Future", "Drake", "Taylor Swift", "The Weeknd", "Bad Bunny"]
  }

  const heroes: FeaturedHeroArtist[] = []

  for (const name of artistNames) {
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1&market=${SPOTIFY_MARKET}`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } }
    )
    const searchData = await searchRes.json()
    const artist = searchData.artists?.items?.[0]
    if (!artist?.images?.[0]?.url) continue

    const tracksRes = await fetch(
      `https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=${SPOTIFY_MARKET}`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 3600 } }
    )
    const tracksData = await tracksRes.json()
    const topTrack = tracksData.tracks?.[0]

    heroes.push({
      name: artist.name,
      image: artist.images[0].url,
      spotify: artist.external_urls?.spotify || "",
      spotifyId: artist.id,
      topTrack: topTrack?.name || "Top tracks",
      topTrackImage: topTrack?.album?.images?.[0]?.url || artist.images[0].url,
      genres: artist.genres?.slice(0, 2) || [],
    })
  }

  return heroes
}
