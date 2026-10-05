"use client"

import { useEffect, useState } from "react"
import { supabaseConfigError } from "../lib/supabaseClient"
import AppShell from "../components/AppShell"

const CONFIG_MESSAGE = "Supabase is not configured. Check your .env.local file."
const CONNECTION_MESSAGE =
  "Could not connect to Supabase. Check your Supabase URL/key and restart npm run dev."

function cleanLoginMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (message === "Failed to fetch" || message.includes("Failed to fetch")) {
    return CONNECTION_MESSAGE
  }
  return message || "Could not log in."
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (supabaseConfigError) setMessage(CONFIG_MESSAGE)
  }, [])

  async function login() {
    if (supabaseConfigError) {
      setMessage(CONFIG_MESSAGE)
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = (await response.json().catch(() => null)) as { error?: unknown } | null

      if (!response.ok) {
        const errorText = typeof data?.error === "string" ? data.error : ""
        setMessage(cleanLoginMessage(new Error(errorText || "Could not log in.")))
        setLoading(false)
        return
      }

      window.location.assign("/profile")
    } catch (error) {
      setMessage(cleanLoginMessage(error))
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
