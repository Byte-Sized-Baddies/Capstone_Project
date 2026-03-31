import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const userId = searchParams.get("state");

  if (error || !code) return NextResponse.redirect(`${appUrl}/integrations?error=${error || "no_code"}`);
  if (!userId) return NextResponse.redirect(`${appUrl}/login`);

  const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID!;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET!;
  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;

  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: "authorization_code",
      scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
    }),
  });

  if (!tokenRes.ok) return NextResponse.redirect(`${appUrl}/integrations?error=token_exchange_failed`);
  const tokens = await tokenRes.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  await supabase.from("integrations_v2").upsert({
    user_id: userId,
    service: "microsoft_outlook",
    config: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    },
    enabled: true,
  }, { onConflict: "user_id,service" });

  return NextResponse.redirect(`${appUrl}/integrations?outlook=connected`);
}
