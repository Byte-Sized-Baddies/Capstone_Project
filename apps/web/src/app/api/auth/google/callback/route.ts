import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/integrations?error=${error || "no_code"}`);
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/integrations?error=missing_credentials`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/integrations?error=token_exchange_failed`);
  }

  const tokens = await tokenRes.json();

  // Get the user's primary calendar ID
  let calendarId = "primary";
  try {
    const calRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList/primary", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (calRes.ok) {
      const calData = await calRes.json();
      calendarId = calData.id || "primary";
    }
  } catch { /* use primary as fallback */ }

  // Get the Supabase user from the session cookie
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  // We need the auth token from cookie to identify the user
  const cookieHeader = req.headers.get("cookie") || "";
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { cookie: cookieHeader } },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  // Store tokens in Supabase
  await supabase.from("integrations_v2").upsert({
    user_id: user.id,
    service: "google_calendar",
    config: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
      calendar_id: calendarId,
    },
    enabled: true,
  }, { onConflict: "user_id,service" });

  return NextResponse.redirect(`${appUrl}/integrations?gcal=connected`);
}
