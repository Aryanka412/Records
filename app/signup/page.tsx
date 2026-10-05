"use client"

import { useState } from "react"
import { supabase } from "../lib/supabaseClient"
import AppShell from "../components/AppShell"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  async function signup() {
    setLoading(true)
    setMessage("")

    const displayName = username.trim() || "Anonymous"

    let data
    try {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: displayName },
        },
      })
      data = result.data
      if (result.error) {
        setMessage(result.error.message)
        setLoading(false)
        return
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create an account.")
      setLoading(false)
      return
    }

    if (data?.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        username: displayName,
        updated_at: new Date().toISOString(),
      })

      if (profileError) {
        setMessage(
          "Account created, but the profile could not be saved. You can finish it from your profile page."
        )
        setLoading(false)
        return
      }
    }

    setMessage("Account created. Check your email if confirmation is required.")
    setLoading(false)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()
    void signup()
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
                <p className="section-label mb-1">Join the community</p>
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Create account
                </h1>
              </div>
            </div>
            <p className="text-body text-sm sm:text-base">
              Start rating albums, logging songs, and sharing reviews.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="input-field"
              />
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
                {loading ? "Creating..." : "Sign up — it's free"}
              </button>
            </form>

            {message && (
              <p className="mt-5 text-sm font-medium text-white" role="status">
                {message}
              </p>
            )}

            <p className="mt-8 text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <a href="/login" className="link-muted">
                Log in
              </a>
            </p>
          </div>
        </div>
      </section>
    </AppShell>
  )
}
