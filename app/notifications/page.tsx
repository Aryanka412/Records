"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import AppShell from "../components/AppShell"
import LoadingScreen from "../components/LoadingScreen"
import { supabase } from "../lib/supabaseClient"

type Notification = {
  id: number
  user_id: string
  actor_id: string | null
  actor_username: string | null
  type: "like" | "comment" | "follow" | "review"
  message: string
  link?: string | null
  read: boolean
  created_at: string
}

function getNotificationLink(item: Notification) {
  if (item.link) return item.link
  if (item.type === "follow" && item.actor_id) return `/user/${item.actor_id}`
  return "/profile"
}

function typeIcon(type: Notification["type"]) {
  if (type === "like") return "♥"
  if (type === "comment") return "💬"
  if (type === "follow") return "👤"
  return "★"
}

export default function NotificationsPage() {
  const [userId, setUserId] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getSession()
      setUserId(data.session?.user?.id || "")
    }

    init()
  }, [])

  async function loadNotifications() {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)

    const query =
      filter === "unread"
        ? `/api/notifications?user_id=${userId}&unread=true`
        : `/api/notifications?user_id=${userId}`

    const res = await fetch(query)
    const data = await res.json()

    if (res.ok) {
      setNotifications(data.notifications || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadNotifications()
  }, [userId, filter])

  async function markRead(id: number) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    })

    setNotifications(
      notifications.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
  }

  async function markAllRead() {
    if (!userId) return

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, mark_all_read: true }),
    })

    setNotifications(notifications.map((item) => ({ ...item, read: true })))
  }

  async function deleteNotification(id: number) {
    if (!userId) return

    await fetch(`/api/notifications?id=${id}&user_id=${userId}`, {
      method: "DELETE",
    })

    setNotifications(notifications.filter((item) => item.id !== id))
  }

  const unreadCount = notifications.filter((item) => !item.read).length

  return (
    <AppShell>
      <section className="relative mx-auto max-w-3xl pb-24">
        <div
          className="pointer-events-none absolute -top-20 left-1/2 h-64 w-[120%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(250,45,72,0.08)_0%,transparent_65%)]"
          aria-hidden
        />

        <div className="relative">
          <p className="section-label mb-3">Activity</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn btn-secondary !text-sm">
                Mark all read
              </button>
            )}
          </div>
          <p className="text-body mt-2 text-sm">Likes, comments, follows, and reviews.</p>
        </div>

        {!userId && (
          <div className="glass-panel mt-10 rounded-2xl p-8 text-center sm:p-10">
            <p className="text-body">Log in to see your notifications.</p>
            <Link href="/login" className="btn btn-primary mt-6 inline-flex">
              Log in
            </Link>
          </div>
        )}

        {userId && (
          <>
            <div className="mt-8 flex gap-2">
              <button
                onClick={() => setFilter("all")}
                className={`btn !px-4 !py-2 !text-sm ${
                  filter === "all" ? "btn-primary" : "btn-secondary"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`btn !px-4 !py-2 !text-sm ${
                  filter === "unread" ? "btn-primary" : "btn-secondary"
                }`}
              >
                Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
              </button>
            </div>

            {loading && <LoadingScreen message="Loading notifications..." />}

            {!loading && notifications.length === 0 && (
              <div className="mt-10 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
                <p className="text-body">
                  {filter === "unread"
                    ? "You're all caught up."
                    : "No notifications yet. Likes, comments, follows, and reviews show up here."}
                </p>
              </div>
            )}

            <div className="mt-8 space-y-3">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`review-card flex items-start gap-4 rounded-2xl ${
                    !item.read ? "notification-unread" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 shrink-0 text-xl ${
                      item.type === "like" ? "text-[#fa2d48]" : "text-zinc-400"
                    }`}
                  >
                    {typeIcon(item.type)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={getNotificationLink(item)}
                      onClick={() => {
                        if (!item.read) markRead(item.id)
                      }}
                      className="block transition-opacity hover:opacity-90"
                    >
                      <p className="leading-relaxed text-zinc-200">{item.message}</p>
                      <p className="mt-2 text-xs text-zinc-600">
                        {new Date(item.created_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </Link>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    {!item.read && (
                      <button
                        onClick={() => markRead(item.id)}
                        className="text-xs text-zinc-500 transition-colors hover:text-[#fa2d48]"
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(item.id)}
                      className="text-xs text-zinc-600 transition-colors hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </AppShell>
  )
}
