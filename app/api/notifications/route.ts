import { supabaseRest } from "../../../lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("user_id")
    const unreadOnly = searchParams.get("unread") === "true"

    if (!userId) {
      return Response.json({ error: "Missing user_id" }, { status: 400 })
    }

    let path = `notifications?select=*&user_id=eq.${userId}&order=created_at.desc&limit=50`

    if (unreadOnly) {
      path += "&read=eq.false"
    }

    const result = await supabaseRest(path)

    if (!result.ok) {
      return Response.json({ error: JSON.stringify(result.data) }, { status: 500 })
    }

    const rows = Array.isArray(result.data) ? result.data : []
    const unreadCount = rows.filter((item: { read: boolean }) => !item.read).length

    return Response.json({
      notifications: rows,
      unreadCount,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Fetch failed"
    return Response.json({ error: "Fetch failed", message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()

    if (!body.user_id) {
      return Response.json({ error: "Missing user_id" }, { status: 400 })
    }

    if (body.mark_all_read) {
      const result = await supabaseRest(
        `notifications?user_id=eq.${body.user_id}&read=eq.false`,
        {
          method: "PATCH",
          prefer: "return=representation",
          body: { read: true },
        }
      )

      if (!result.ok) {
        return Response.json({ error: JSON.stringify(result.data) }, { status: 500 })
      }

      return Response.json({ success: true, data: result.data })
    }

    if (!body.id) {
      return Response.json({ error: "Missing notification id" }, { status: 400 })
    }

    const result = await supabaseRest(`notifications?id=eq.${body.id}`, {
      method: "PATCH",
      prefer: "return=representation",
      body: { read: body.read ?? true },
    })

    if (!result.ok) {
      return Response.json({ error: JSON.stringify(result.data) }, { status: 500 })
    }

    return Response.json({ success: true, data: result.data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Update failed"
    return Response.json({ error: "Update failed", message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const userId = searchParams.get("user_id")

    if (!id || !userId) {
      return Response.json({ error: "Missing id or user_id" }, { status: 400 })
    }

    const result = await supabaseRest(
      `notifications?id=eq.${id}&user_id=eq.${userId}`,
      { method: "DELETE", prefer: "return=representation" }
    )

    if (!result.ok) {
      return Response.json({ error: JSON.stringify(result.data) }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Delete failed"
    return Response.json({ error: "Delete failed", message }, { status: 500 })
  }
}
