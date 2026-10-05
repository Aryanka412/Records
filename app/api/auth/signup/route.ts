import {
  cleanSupabaseMessage,
  CONFIG_MESSAGE,
  createAuthServerClient,
  getSupabaseServerConfigError,
} from "../../../../lib/supabaseServer"

export async function POST(request: Request) {
  const configError = getSupabaseServerConfigError()
  if (configError) {
    return Response.json({ error: CONFIG_MESSAGE }, { status: 500 })
  }

  let email = ""
  let password = ""
  let username = ""
  try {
    const body = (await request.json()) as {
      email?: unknown
      password?: unknown
      username?: unknown
    }
    email = typeof body.email === "string" ? body.email.trim() : ""
    password = typeof body.password === "string" ? body.password : ""
    username = typeof body.username === "string" ? body.username.trim() : ""
  } catch {
    return Response.json({ error: "Enter an email and password." }, { status: 400 })
  }

  if (!email || !password) {
    return Response.json({ error: "Enter an email and password." }, { status: 400 })
  }

  const displayName = username || "Anonymous"

  try {
    const supabase = await createAuthServerClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: displayName } },
    })

    if (error) {
      return Response.json(
        { error: cleanSupabaseMessage(error.message, "Could not create an account.") },
        { status: 400 }
      )
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        username: displayName,
        updated_at: new Date().toISOString(),
      })
      if (profileError) {
        return Response.json({
          ok: true,
          profileWarning: true,
        })
      }
    }

    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    return Response.json(
      { error: cleanSupabaseMessage(message, "Could not create an account.") },
      { status: 502 }
    )
  }
}
