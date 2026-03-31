import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { webhook_url, text } = await req.json();

  if (!webhook_url || !text) {
    return NextResponse.json({ error: "Missing webhook_url or text" }, { status: 400 });
  }

  if (!webhook_url.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json({ error: "Invalid Slack webhook URL" }, { status: 400 });
  }

  const res = await fetch(webhook_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Slack rejected the webhook" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
