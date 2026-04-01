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
  const userId = searchParams.get("state");

  if (error || !code) {
    return NextResponse.redirect(
      `${appUrl}/integrations?error=${error || "no_code"}`
    );
  }

  if (!userId) {
    return NextResponse.redirect(`${appUrl}/integrations?error=missing_user`);
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      `${appUrl}/integrations?error=missing_microsoft_credentials`
    );
  }

  const tokenRes = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        scope: "offline_access openid profile email User.Read Calendars.ReadWrite",
      }),
    }
  );

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Microsoft token exchange failed:", text);

    return NextResponse.redirect(
      `${appUrl}/integrations?error=token_exchange_failed`
    );
  }

  const tokens = await tokenRes.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const expiresAt = Date.now() + (tokens.expires_in ?? 3600) * 1000;

  const upsertRes = await supabase.from("integrations_v2").upsert(
    {
      user_id: userId,
      service: "microsoft_outlook",
      config: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
      },
      enabled: true,
    },
    { onConflict: "user_id,service" }
  );

  if (upsertRes.error) {
    console.error("Supabase upsert failed:", upsertRes.error);
    return NextResponse.redirect(`${appUrl}/integrations?error=db_save_failed`);
  }

  return NextResponse.redirect(`${appUrl}/integrations?outlook=connected`);
}