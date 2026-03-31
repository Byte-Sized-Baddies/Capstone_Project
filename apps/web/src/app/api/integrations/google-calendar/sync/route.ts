import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

async function refreshToken(config: any) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId, client_secret: clientSecret,
      refresh_token: config.refresh_token, grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error("Failed to refresh token");
  const data = await res.json();
  return {
    ...config,
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookieHeader = req.headers.get("cookie") || "";

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { cookie: cookieHeader } },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load Google Calendar integration
  const { data: integration } = await supabase
    .from("integrations_v2")
    .select("*")
    .eq("user_id", user.id)
    .eq("service", "google_calendar")
    .single();

  if (!integration) return NextResponse.json({ error: "Google Calendar not connected" }, { status: 400 });

  let config = integration.config;

  // Refresh token if expired
  if (Date.now() > config.expires_at - 60000) {
    try {
      config = await refreshToken(config);
      await supabase.from("integrations_v2").update({ config }).eq("user_id", user.id).eq("service", "google_calendar");
    } catch {
      return NextResponse.json({ error: "Token refresh failed — please reconnect Google Calendar" }, { status: 401 });
    }
  }

  // Load tasks with due dates
  const { data: tasks } = await supabase
    .from("tasks_v2")
    .select("id, title, description, due_date, is_completed")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .not("due_date", "is", null);

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ synced: 0 });
  }

  const calendarId = encodeURIComponent(config.calendar_id || "primary");
  let synced = 0;

  for (const task of tasks) {
    const event = {
      summary: task.title,
      description: task.description || "",
      start: { date: task.due_date },
      end: { date: task.due_date },
      extendedProperties: { private: { dobee_task_id: String(task.id) } },
    };

    // Check if event already exists
    const searchRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?privateExtendedProperty=doobe_task_id%3D${task.id}`,
      { headers: { Authorization: `Bearer ${config.access_token}` } }
    );
    const searchData = await searchRes.json();
    const existing = searchData.items?.[0];

    if (existing) {
      // Update existing event
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${existing.id}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${config.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify(event),
        }
      );
    } else {
      // Create new event
      const createRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${config.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify(event),
        }
      );
      if (createRes.ok) synced++;
    }
  }

  return NextResponse.json({ synced });
}
