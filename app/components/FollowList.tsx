"use client"

import Link from "next/link"

type ProfileSummary = {
  id: string
  username: string
  avatar_url: string
}

type FollowListProps = {
  users: ProfileSummary[]
  emptyMessage: string
}

export default function FollowList({ users, emptyMessage }: FollowListProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {users.map((user) => (
        <Link key={user.id} href={`/user/${user.id}`} className="group block">
          <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.05]">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.username}
                className="h-14 w-14 rounded-full object-cover shadow-[0_8px_24px_rgba(0,0,0,0.45)] ring-2 ring-white/10 transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-zinc-800 to-zinc-950 text-lg font-bold text-white ring-2 ring-white/10">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold text-white transition-colors group-hover:text-[#fa2d48]">
                {user.username}
              </p>
              <p className="text-sm text-zinc-500">View profile →</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
