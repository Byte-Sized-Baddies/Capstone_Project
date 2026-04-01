import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.redirect(`${appUrl}/integrations?error=missing_user`);
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;

  if (!clientId) {
    return NextResponse.redirect(
      `${appUrl}/integrations?error=missing_microsoft_client_id`
    );
  }

  const authUrl = new URL(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
  );

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set(
    "scope",
    "offline_access openid profile email User.Read Calendars.ReadWrite"
  );
  authUrl.searchParams.set("state", userId);

  return NextResponse.redirect(authUrl.toString());
}