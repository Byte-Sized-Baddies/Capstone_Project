import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      `${appUrl}/integrations?error=${error || "no_code"}`
    );
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const redirectUri = `${appUrl}/api/auth/outlook/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${appUrl}/integrations?error=missing_microsoft_credentials`
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "openid profile email offline_access User.Read Calendars.ReadWrite",
      }),
    }
  );

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${appUrl}/integrations?error=token_exchange_failed`
    );
  }

  const tokens = await tokenRes.json();

  // Get the user's primary Outlook calendar
  let calendarId = "primary";
  let calendarName = "Calendar";

  try {
    const calRes = await fetch("https://graph.microsoft.com/v1.0/me/calendar", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (calRes.ok) {
      const calData = await calRes.json();
      calendarId = calData.id || "primary";
      calendarName = calData.name || "Calendar";
    }
  } catch {
    // fallback values stay in place
  }

  // Optional: get Microsoft profile info
  let accountEmail = null;
  let displayName = null;

  try {
    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (profileRes.ok) {
      const profileData = await profileRes.json();
      accountEmail = profileData.mail || profileData.userPrincipalName || null;
      displayName = profileData.displayName || null;
    }
  } catch {
    // ignore profile failure
  }

  // Get userId from state parameter
  const userId = searchParams.get("state");
  if (!userId) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Store Outlook integration in Supabase
  await supabase.from("integrations_v2").upsert(
    {
      user_id: userId,
      service: "outlook_calendar",
      config: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + tokens.expires_in * 1000,
        calendar_id: calendarId,
        calendar_name: calendarName,
        account_email: accountEmail,
        display_name: displayName,
      },
      enabled: true,
    },
    { onConflict: "user_id,service" }
  );

  return NextResponse.redirect(`${appUrl}/integrations?outlook=connected`);
}