type TypeBadgeProps = {
  type: "song" | "album" | "artist" | string
}

export default function TypeBadge({ type }: TypeBadgeProps) {
  const variant =
    type === "song"
      ? "type-badge-song"
      : type === "album"
        ? "type-badge-album"
        : type === "artist"
          ? "type-badge-artist"
          : ""

  return (
    <span className={`type-badge ${variant}`}>
      {type === "track" ? "song" : type}
    </span>
  )
}
