"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { supabase } from "../lib/supabaseClient"

type Notification = {
  id: number
  user_id: string
  actor_id: string | null
  actor_username: string | null
  type: "like" | "comment" | "follow" | "review"
  message: string
  review_type?: "song" | "album" | "artist" | null
  review_id?: number | null
  link?: string | null
  read: boolean
  created_at: string
}

function getNotificationLink(item: Notification) {
  if (item.link) return item.link

  if (item.type === "follow" && item.actor_id) {
    return `/user/${item.actor_id}`
  }

  if (item.review_type && item.review_id) {
    return "/"
  }

  return "/profile"
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [userId, setUserId] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getSession()
      setUserId(data.session?.user?.id || "")
    }

    loadUser()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || "")
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function loadNotifications() {
    if (!userId) return

    setLoading(true)

    try {
      const res = await fetch(`/api/notifications?user_id=${userId}`)
      const data = await res.json()

      if (res.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadNotifications()
      const interval = setInterval(loadNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [userId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function markAllRead() {
    if (!userId) return

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, mark_all_read: true }),
    })

    setNotifications(notifications.map((item) => ({ ...item, read: true })))
    setUnreadCount(0)
  }

  async function markRead(id: number) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, read: true }),
    })

    setNotifications(
      notifications.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
    setUnreadCount(Math.max(0, unreadCount - 1))
  }

  if (!userId) return null

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          setOpen(!open)
          if (!open) loadNotifications()
        }}
        className="relative btn btn-ghost !p-2 !px-3"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-[#fa2d48] text-[10px] font-bold flex items-center justify-center text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/90 shadow-2xl shadow-black/50 backdrop-blur-xl md:w-96">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
            <p className="font-semibold text-white">Notifications</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-zinc-500 transition-colors hover:text-[#fa2d48]"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <p className="p-4 text-sm text-zinc-500">Loading...</p>
            )}

            {!loading && notifications.length === 0 && (
              <p className="p-6 text-center text-sm text-zinc-500">
                No notifications yet. Likes, comments, and follows show up here.
              </p>
            )}

            {notifications.map((item) => (
              <Link
                key={item.id}
                href={getNotificationLink(item)}
                onClick={() => {
                  if (!item.read) markRead(item.id)
                  setOpen(false)
                }}
                className={`block border-b border-white/[0.04] px-4 py-3 transition hover:bg-white/[0.04] ${
                  !item.read ? "bg-[#fa2d48]/[0.05]" : ""
                }`}
              >
                <p className="text-sm leading-relaxed text-zinc-200">{item.message}</p>
                <p className="mt-1 text-xs text-zinc-600">
                  {new Date(item.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </Link>
            ))}
          </div>

          <div className="border-t border-white/[0.06] px-4 py-3">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-zinc-500 transition-colors hover:text-[#fa2d48]"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
