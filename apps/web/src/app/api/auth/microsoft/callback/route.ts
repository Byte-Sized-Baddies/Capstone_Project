import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  return NextResponse.json({
    route_hit: "/api/auth/microsoft",
    userId,
    hasClientId: !!process.env.MICROSOFT_CLIENT_ID,
    hasClientSecret: !!process.env.MICROSOFT_CLIENT_SECRET,
    tenantId: process.env.MICROSOFT_TENANT_ID || null,
    appUrl,
    vercelUrl: process.env.VERCEL_URL || null,
  });
}