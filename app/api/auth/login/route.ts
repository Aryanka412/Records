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
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown }
    email = typeof body.email === "string" ? body.email.trim() : ""
    password = typeof body.password === "string" ? body.password : ""
  } catch {
    return Response.json({ error: "Enter an email and password." }, { status: 400 })
  }

  if (!email || !password) {
    return Response.json({ error: "Enter an email and password." }, { status: 400 })
  }

  try {
    const supabase = await createAuthServerClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return Response.json(
        { error: cleanSupabaseMessage(error.message, "Could not log in.") },
        { status: 400 }
      )
    }
    return Response.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    return Response.json(
      { error: cleanSupabaseMessage(message, "Could not log in.") },
      { status: 502 }
    )
  }
}
