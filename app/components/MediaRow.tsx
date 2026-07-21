import Link from "next/link"

type MediaRowProps = {
  href: string
  image?: string
  title: string
  subtitle?: string
  meta?: string
  rank?: number
  round?: boolean
}

export default function MediaRow({
  href,
  image,
  title,
  subtitle,
  meta,
  rank,
  round,
}: MediaRowProps) {
  return (
    <Link href={href} className="media-row group">
      {rank !== undefined && <span className="media-row-rank">{rank}</span>}
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={title}
          className={`media-row-art ${round ? "media-row-art-round" : ""}`}
        />
      ) : (
        <div className={`media-row-art art-placeholder ${round ? "media-row-art-round" : ""}`} />
      )}
      <div className="media-row-body min-w-0">
        <p className="media-row-title truncate">{title}</p>
        {subtitle && <p className="media-row-sub truncate">{subtitle}</p>}
      </div>
      {meta && <span className="media-row-meta">{meta}</span>}
      <span className="media-row-chevron">›</span>
    </Link>
  )
}
