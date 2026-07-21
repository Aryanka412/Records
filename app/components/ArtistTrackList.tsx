"use client"

import { useState } from "react"
import MediaRow from "./MediaRow"

type Track = {
  name: string
  artist: string
  album: string
  image: string
  spotify: string
  duration_ms?: number
}

type ArtistTrackListProps = {
  tracks: Track[]
  trackHref: (track: Track) => string
  formatDuration: (ms?: number) => string
  initialCount?: number
  ranked?: boolean
}

export default function ArtistTrackList({
  tracks,
  trackHref,
  formatDuration,
  initialCount = 10,
  ranked = false,
}: ArtistTrackListProps) {
  const [visible, setVisible] = useState(initialCount)
  const shown = tracks.slice(0, visible)
  const hasMore = visible < tracks.length

  if (tracks.length === 0) {
    return <p className="text-zinc-500">No tracks found.</p>
  }

  return (
    <>
      <div className="flex flex-col">
        {shown.map((track, index) => (
          <MediaRow
            key={`${track.name}-${track.album}-${index}`}
            href={trackHref(track)}
            image={track.image}
            title={track.name}
            subtitle={ranked ? track.album : `${track.album}${track.artist ? ` · ${track.artist}` : ""}`}
            rank={ranked ? index + 1 : undefined}
            meta={formatDuration(track.duration_ms)}
          />
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="btn btn-secondary w-full mt-4 !text-sm"
          onClick={() => setVisible((count) => count + 25)}
        >
          Show more ({tracks.length - visible} remaining)
        </button>
      )}
    </>
  )
}
