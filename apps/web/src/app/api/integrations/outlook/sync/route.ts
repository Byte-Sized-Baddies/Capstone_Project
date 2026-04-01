import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function refreshOutlookToken(config: any) {
  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: config.refresh_token,
      grant_type: "refresh_token",
      scope: "https://graph.microsoft.com/Calendars.ReadWrite offline_access",
    }),
  });
  if (!res.ok) throw new Error("Failed to refresh Outlook token");
  const data = await res.json();
  return { ...config, access_token: data.access_token, expires_at: Date.now() + data.expires_in * 1000 };
}

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: integration } = await supabase
    .from("integrations_v2").select("*").eq("user_id", userId).eq("service", "outlook_calendar").single();

  if (!integration) return NextResponse.json({ error: "Outlook not connected" }, { status: 400 });

  let config = integration.config;
  if (Date.now() > config.expires_at - 60000) {
    try {
      config = await refreshOutlookToken(config);
      await supabase.from("integrations_v2").update({ config }).eq("user_id", userId).eq("service", "outlook_calendar");
    } catch {
      return NextResponse.json({ error: "Token refresh failed — please reconnect Outlook" }, { status: 401 });
    }
  }

  const { data: tasks } = await supabase
    .from("tasks_v2").select("id, title, description, due_date")
    .eq("user_id", userId).eq("is_archived", false).not("due_date", "is", null);

  if (!tasks || tasks.length === 0) return NextResponse.json({ synced: 0 });

  let synced = 0;
  for (const task of tasks) {
    const event = {
      subject: task.title,
      body: { contentType: "text", content: task.description || "" },
      start: { dateTime: `${task.due_date}T09:00:00`, timeZone: "UTC" },
      end: { dateTime: `${task.due_date}T10:00:00`, timeZone: "UTC" },
      singleValueExtendedProperties: [{ id: "String {00020329-0000-0000-C000-000000000046} Name dobee_task_id", value: String(task.id) }],
    };

    const res = await fetch("https://graph.microsoft.com/v1.0/me/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    if (res.ok) synced++;
  }

  return NextResponse.json({ synced });
}
