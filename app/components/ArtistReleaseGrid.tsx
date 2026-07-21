import Link from "next/link"

export type ReleaseItem = {
  name: string
  href: string
  image?: string
  subtitle?: string
}

type ArtistReleaseGridProps = {
  items: ReleaseItem[]
  round?: boolean
}

export default function ArtistReleaseGrid({ items, round }: ArtistReleaseGridProps) {
  if (items.length === 0) return null

  return (
    <div className="artist-release-grid">
      {items.map((item) => (
        <Link key={item.href + item.name} href={item.href} className="artist-release-card">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              className={`artist-release-art ${round ? "artist-release-art-round" : ""}`}
            />
          ) : (
            <div
              className={`artist-release-art art-placeholder ${round ? "artist-release-art-round" : ""}`}
            />
          )}
          <p className="artist-release-title truncate">{item.name}</p>
          {item.subtitle && <p className="artist-release-sub truncate">{item.subtitle}</p>}
        </Link>
      ))}
    </div>
  )
}
