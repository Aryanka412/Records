type StarRatingProps = {
  rating: number
  max?: number
  size?: "sm" | "md"
}

export default function StarRating({
  rating,
  max = 10,
  size = "sm",
}: StarRatingProps) {
  const stars = 5
  const normalized = (rating / max) * stars
  const fullStars = Math.floor(normalized)
  const hasHalf = normalized - fullStars >= 0.25

  const sizeClass = size === "md" ? "text-base" : "text-sm"

  return (
    <span className={`star-rating ${sizeClass}`} aria-label={`${rating} out of ${max}`}>
      {Array.from({ length: stars }).map((_, i) => {
        if (i < fullStars) {
          return (
            <span key={i} className="star">
              ★
            </span>
          )
        }
        if (i === fullStars && hasHalf) {
          return (
            <span key={i} className="star" style={{ opacity: 0.55 }}>
              ★
            </span>
          )
        }
        return (
          <span key={i} className="star star-empty">
            ★
          </span>
        )
      })}
    </span>
  )
}
