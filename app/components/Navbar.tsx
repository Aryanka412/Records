"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"
import NotificationBell from "./NotificationBell"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/discover", label: "Discover" },
  { href: "/community", label: "Communities" },
  { href: "/profile", label: "Profile" },
]

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getSession()
      setLoggedIn(!!data.session)
    }

    checkUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })

    function onScroll() {
      setScrolled(window.scrollY > 8)
    }

    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()

    return () => {
      listener.subscription.unsubscribe()
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    setLoggedIn(false)
    router.push("/")
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled
          ? "border-white/[0.08] bg-black/75 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          : "border-transparent bg-black/40 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link href="/" className="group flex shrink-0 items-center gap-3">
          <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#fa2d48] to-[#c41e3a] text-sm font-bold text-white shadow-[0_4px_20px_rgba(250,45,72,0.35)] transition-transform duration-300 group-hover:scale-105">
            R
          </span>
          <span className="text-lg font-bold tracking-tight text-white sm:text-xl">
            Records
          </span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                isActive(link.href)
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/discover"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white sm:inline-flex"
          >
            <svg
              className="h-4 w-4 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search
          </Link>

          <NotificationBell />

          {loggedIn && (
            <Link
              href="/notifications"
              className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/[0.05] hover:text-white lg:inline-flex"
            >
              Activity
            </Link>
          )}

          {loggedIn ? (
            <button
              onClick={logout}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/[0.05] hover:text-white sm:px-4"
            >
              Log out
            </button>
          ) : (
            <>
              <a
                href="/login"
                className="hidden rounded-full px-3.5 py-2 text-sm font-medium text-zinc-400 transition-all hover:bg-white/[0.05] hover:text-white sm:inline-flex sm:px-4"
              >
                Log in
              </a>
              <a
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-[#fa2d48] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(250,45,72,0.3)] transition-all hover:bg-[#ff3d56] hover:shadow-[0_6px_24px_rgba(250,45,72,0.4)]"
              >
                Sign up
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
