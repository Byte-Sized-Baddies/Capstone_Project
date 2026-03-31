import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function refreshGmailToken(config: any) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: config.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh Gmail token");
  const data = await res.json();
  return { ...config, access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 };
}

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: integration } = await supabase
    .from("integrations_v2").select("*").eq("user_id", userId).eq("service", "gmail").single();

  if (!integration) return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });

  let config = integration.config;
  if (Date.now() > config.expires_at - 60000) {
    try {
      config = await refreshGmailToken(config);
      await supabase.from("integrations_v2").update({ config }).eq("user_id", userId).eq("service", "gmail");
    } catch {
      return NextResponse.json({ error: "Token refresh failed" }, { status: 401 });
    }
  }

  // Fetch 10 most recent unread messages
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:unread",
    { headers: { Authorization: `Bearer ${config.access_token}` } }
  );
  if (!listRes.ok) return NextResponse.json({ error: "Failed to fetch emails" }, { status: 502 });
  const listData = await listRes.json();
  const messages = listData.messages || [];

  // Fetch subject + snippet for each
  const emails = await Promise.all(messages.map(async (msg: { id: string }) => {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
      { headers: { Authorization: `Bearer ${config.access_token}` } }
    );
    if (!detailRes.ok) return null;
    const detail = await detailRes.json();
    const headers = detail.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === "Subject")?.value || "(No subject)";
    const from = headers.find((h: any) => h.name === "From")?.value || "";
    return { id: msg.id, subject, from, snippet: detail.snippet || "" };
  }));

  return NextResponse.json({ emails: emails.filter(Boolean) });
}
