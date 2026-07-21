type ArtistSectionProps = {
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
}

export default function ArtistSection({
  title,
  subtitle,
  children,
  action,
}: ArtistSectionProps) {
  return (
    <section className="artist-section">
      <div className="artist-section-header">
        <div>
          <h2 className="artist-section-title">{title}</h2>
          {subtitle && <p className="artist-section-sub">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
