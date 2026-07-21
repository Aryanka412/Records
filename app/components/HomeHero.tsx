"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"

type HeroArtist = {
  name: string
  image: string
  spotify: string
  spotifyId: string
  topTrack: string
  topTrackImage: string
  genres: string[]
}

export default function HomeHero() {
  const [artists, setArtists] = useState<HeroArtist[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    fetch("/api/featured-hero")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setArtists(data)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (artists.length <= 1) return
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % artists.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [artists.length])

  const active = artists[index]

  if (!active) {
    return (
      <section className="home-hero home-hero-loading">
        <div className="home-hero-shimmer" />
      </section>
    )
  }

  return (
    <section className="home-hero">
      <AnimatePresence mode="sync">
        <motion.div
          key={active.spotifyId}
          className="home-hero-bg-wrap"
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={active.image} alt="" className="home-hero-bg" aria-hidden />
        </motion.div>
      </AnimatePresence>

      <div className="home-hero-overlay" />
      <div className="home-hero-grain" />

      <div className="home-hero-content">
        <motion.div
          key={`text-${active.spotifyId}`}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <p className="home-hero-label">Featured artist</p>
          <h1 className="home-hero-title">{active.name}</h1>
          {active.genres.length > 0 && (
            <p className="home-hero-genres">{active.genres.join(" · ")}</p>
          )}
          <p className="home-hero-track">
            Now playing culture: <span>{active.topTrack}</span>
          </p>

          <div className="home-hero-actions">
            <Link
              href={`/artist/${encodeURIComponent(active.name)}`}
              className="btn btn-primary"
            >
              Explore {active.name}
            </Link>
            <Link href="/discover" className="btn btn-secondary">
              Discover music
            </Link>
          </div>
        </motion.div>

        {artists.length > 1 && (
          <div className="home-hero-dots">
            {artists.map((artist, dotIndex) => (
              <button
                key={artist.spotifyId}
                type="button"
                className={`home-hero-dot ${dotIndex === index ? "home-hero-dot-active" : ""}`}
                onClick={() => setIndex(dotIndex)}
                aria-label={`Show ${artist.name}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
