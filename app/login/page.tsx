"use client"

import { useState } from "react"
import { supabase } from "../lib/supabaseClient"
import AppShell from "../components/AppShell"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function login() {
    setLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        setMessage(error.message)
        setLoading(false)
        return
      }

      window.location.assign("/profile")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not log in.")
      setLoading(false)
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    void login()
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

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? "Logging in..." : "Log in"}
              </button>
            </form>

            {message && (
              <p className="mt-5 text-sm font-medium text-white" role="status">
                {message}
              </p>
            )}

            <p className="mt-8 text-center text-sm text-zinc-500">
              No account yet?{" "}
              <a href="/signup" className="link-muted">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
