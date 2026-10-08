"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"
import NotificationBell from "./NotificationBell"

const navItems = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 3l9 8v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V11l9-8z" />
      </svg>
    ),
  },
  {
    href: "/discover",
    label: "Discover",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    href: "/community",
    label: "Communities",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m0-4a3 3 0 116 0 3 3 0 01-6 0zm8 2a3 3 0 100-6" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    href: "/notifications",
    label: "Activity",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    authOnly: true,
  },
]

type SidebarProps = {
  mobileOpen: boolean
  onClose: () => void
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession()
      setLoggedIn(!!data.session)
    }
    check()
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s))
    return () => listener.subscription.unsubscribe()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    setLoggedIn(false)
    router.push("/")
    onClose()
  }

  const content = (
    <>
      <Link href="/" className="sidebar-logo" onClick={onClose}>
        <span className="sidebar-logo-mark">R</span>
        <span className="sidebar-logo-text">Records</span>
      </Link>

      <nav className="sidebar-nav">
        {navItems
          .filter((item) => !item.authOnly || loggedIn)
          .map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`sidebar-link ${active ? "sidebar-link-active" : ""}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
      </nav>

      <div className="sidebar-footer">
        {loggedIn ? (
          <>
            <div className="sidebar-notify">
              <NotificationBell />
              <span className="text-sm text-zinc-500">Alerts</span>
            </div>
            <button onClick={logout} className="btn btn-secondary w-full !text-sm">
              Log out
            </button>
          </>
        ) : (
          <>
            <a href="/signup" className="btn btn-primary w-full !text-sm" onClick={onClose}>
              Sign up
            </a>
            <a href="/login" className="btn btn-secondary w-full !text-sm mt-2" onClick={onClose}>
              Log in
            </a>
          </>
        )}
      </div>
    </>
  )

  return (
    <>
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>{content}</aside>
      {mobileOpen && <button className="sidebar-backdrop" onClick={onClose} aria-label="Close menu" />}
    </>
  )
}
