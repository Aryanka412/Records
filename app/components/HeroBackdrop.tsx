type HeroBackdropProps = {
  image?: string
  children: React.ReactNode
}

export default function HeroBackdrop({ image, children }: HeroBackdropProps) {
  return (
    <section className="hero-backdrop">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="hero-backdrop-image" aria-hidden />
      )}
      <div className="hero-backdrop-fade" />
      <div className="relative z-10">{children}</div>
    </section>
  )
}
