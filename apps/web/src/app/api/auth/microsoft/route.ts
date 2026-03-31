import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId) {
    return NextResponse.redirect(new URL("/integrations?error=missing_microsoft_client_id", appUrl));
  }

  const userId = new URL(req.url).searchParams.get("userId") || "";
  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;

  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://graph.microsoft.com/Calendars.ReadWrite offline_access");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("state", userId);

  return NextResponse.redirect(url.toString());
}
