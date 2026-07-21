import Link from "next/link"

export type CarouselItem = {
  name: string
  href: string
  image?: string
  subtitle?: string
  round?: boolean
}

type ArtistCarouselProps = {
  items: CarouselItem[]
}

export default function ArtistCarousel({ items }: ArtistCarouselProps) {
  if (items.length === 0) return null

  return (
    <div className="artist-carousel">
      {items.map((item) => (
        <Link key={item.href + item.name} href={item.href} className="artist-carousel-item">
          {item.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image}
              alt={item.name}
              className={`artist-carousel-art ${item.round ? "artist-carousel-art-round" : ""}`}
            />
          ) : (
            <div
              className={`artist-carousel-art art-placeholder ${item.round ? "artist-carousel-art-round" : ""}`}
            />
          )}
          <p className="artist-carousel-title truncate">{item.name}</p>
          {item.subtitle && (
            <p className="artist-carousel-sub truncate">{item.subtitle}</p>
          )}
        </Link>
      ))}
    </div>
  )
}
