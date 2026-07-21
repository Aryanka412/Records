"use client"

import { useState } from "react"
import Link from "next/link"

export type ReviewComment = {
  id: number
  review_type: "song" | "album" | "artist"
  review_id: number
  user_id?: string | null
  username: string
  comment: string
  created_at: string
}

type ReviewCommentsProps = {
  reviewType: "song" | "album" | "artist"
  reviewId: number
  comments: ReviewComment[]
  onCommentAdded: (comment: ReviewComment) => void
  loggedIn: boolean
  userId: string
  accountName: string
}

export default function ReviewComments({
  reviewType,
  reviewId,
  comments,
  onCommentAdded,
  loggedIn,
  userId,
  accountName,
}: ReviewCommentsProps) {
  const [text, setText] = useState("")
  const [posting, setPosting] = useState(false)

  async function postComment() {
    if (!text.trim()) {
      alert("Write a comment first.")
      return
    }

    if (!loggedIn) {
      alert("Log in to comment.")
      return
    }

    setPosting(true)

    try {
      const res = await fetch("/api/review-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_type: reviewType,
          review_id: reviewId,
          user_id: userId,
          username: accountName || "Anonymous",
          comment: text.trim(),
        }),
      })

      const data = await res.json()

      if (data.success) {
        const saved = Array.isArray(data.data) ? data.data[0] : null
        onCommentAdded({
          id: saved?.id || Date.now(),
          review_type: reviewType,
          review_id: reviewId,
          user_id: userId,
          username: accountName || "Anonymous",
          comment: text.trim(),
          created_at: saved?.created_at || new Date().toISOString(),
        })
        setText("")
      } else {
        alert(data.error || "Comment failed.")
      }
    } catch {
      alert("Comment failed. Try again.")
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="mt-5 border-t border-white/[0.06] pt-4">
      <p className="mb-3 text-sm font-medium text-zinc-500">
        Comments {comments.length > 0 ? `(${comments.length})` : ""}
      </p>

      <div className="mb-4 space-y-3">
        {comments.map((comment) => (
          <div
            key={comment.id}
            className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 transition-colors hover:border-white/10"
          >
            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                {comment.user_id ? (
                  <Link href={`/user/${comment.user_id}`} className="link-user text-sm">
                    {comment.username || "Anonymous"}
                  </Link>
                ) : (
                  <span>{comment.username || "Anonymous"}</span>
                )}
              </p>
              <p className="text-xs text-zinc-600">
                {new Date(comment.created_at).toLocaleDateString()}
              </p>
            </div>
            <p className="text-sm leading-6 text-zinc-300">{comment.comment}</p>
          </div>
        ))}
      </div>

      {loggedIn ? (
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                postComment()
              }
            }}
            placeholder="Write a comment..."
            className="input-field !rounded-full !py-3 text-sm flex-1"
          />
          <button
            onClick={postComment}
            disabled={posting}
            className="btn btn-primary !py-3 !px-5 !text-sm"
          >
            {posting ? "..." : "Post"}
          </button>
        </div>
      ) : (
        <p className="text-zinc-600 text-sm">Log in to comment.</p>
      )}
    </div>
  )
}
