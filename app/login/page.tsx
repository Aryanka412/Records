"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"
import AppShell from "../components/AppShell"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      setMessage("Logged in!")
      setLoading(false)
      router.push("/profile")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not log in.")
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <section className="auth-page flex min-h-[70vh] items-center justify-center py-10 sm:py-14">
        <div className="auth-glow" aria-hidden />
        <div className="relative z-10 w-full max-w-md">
          <div className="auth-card glass-panel">
            <div className="mb-8 flex items-center gap-3">
              <span className="sidebar-logo-mark">R</span>
              <div>
                <p className="section-label mb-1">Welcome back</p>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Log in
                </h1>
              </div>
            </div>
            <p className="text-body text-sm sm:text-base">
              Continue your music diary on Records.
            </p>

            <form onSubmit={login} className="mt-8 space-y-4">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email"
                className="input-field"
                required
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Password"
                className="input-field"
                required
              />
              <button disabled={loading} className="btn btn-primary w-full">
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>

            {message && (
              <p className="text-body mt-5 text-sm" role="status">
                {message}
              </p>
            )}

            <p className="mt-8 text-center text-sm text-zinc-500">
              No account yet?{" "}
              <Link href="/signup" className="link-muted">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
