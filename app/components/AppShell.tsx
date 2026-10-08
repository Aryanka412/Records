"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Sidebar from "./Sidebar"
import { supabase } from "../lib/supabaseClient"

type AppShellProps = {
  children: React.ReactNode
  bleed?: boolean
}

export default function AppShell({ children, bleed = false }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <div className="app-layout">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="app-main">
        <header className="mobile-header">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="sidebar-logo-mark !w-8 !h-8 !text-sm">R</span>
            <span className="font-bold tracking-tight text-white">Records</span>
          </Link>
          {!loggedIn && (
            <div className="ml-auto flex items-center gap-2">
              <a href="/login" className="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-300">
                Log in
              </a>
              <a href="/signup" className="btn btn-primary !px-3.5 !py-1.5 !text-xs">
                Sign up
              </a>
            </div>
          )}
        </header>

        <main className={bleed ? "main-content main-content-bleed" : "main-content"}>
          {children}
        </main>
      </div>
    </div>
  )
}
