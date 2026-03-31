"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getSessionSafe } from "../auth/supabaseClient";

const darkTheme = {
  bg: "#111113", surface: "#18181b", surfaceHover: "#27272a",
  border: "#27272a", borderStrong: "#3f3f46", text: "#fafafa",
  textMuted: "#a1a1aa", textDim: "#71717a", accent: "#FFC107",
  accentText: "#18181b", danger: "#ef4444", success: "#22c55e", inputBg: "#27272a",
};
const lightTheme = {
  bg: "#fffaf3", surface: "#ffffff", surfaceHover: "#fff8e6",
  border: "#f5e99f", borderStrong: "#e6d870", text: "#1a1a1a",
  textMuted: "#6b6b6b", textDim: "#9a9a9a", accent: "#f5c800",
  accentText: "#1a1a1a", danger: "#dc2626", success: "#16a34a", inputBg: "#fffdf2",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞", active: false },
  { href: "/calendar", label: "Calendar", icon: "📅", active: false },
  { href: "/folders", label: "Folders", icon: "📁", active: false },
  { href: "/statistics", label: "Statistics", icon: "📊", active: false },
  { href: "/archive", label: "Archive", icon: "📦", active: false },
  { href: "/timeblocking", label: "Time Block", icon: "⏱", active: false },
  { href: "/notes", label: "Notes", icon: "📝", active: false },
  { href: "/integrations", label: "Integrations", icon: "🔌", active: true },
  { href: "/settings", label: "Settings", icon: "⚙️", active: false },
];

interface Integration { service: string; config: any; enabled: boolean; }

export default function IntegrationsPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("User");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [integrations, setIntegrations] = useState<Record<string, Integration>>({});
  const [slackWebhook, setSlackWebhook] = useState("");
  const [slackSaving, setSlackSaving] = useState(false);
  const [slackTesting, setSlackTesting] = useState(false);
  const [slackTestResult, setSlackTestResult] = useState<"success" | "error" | null>(null);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalSyncResult, setGcalSyncResult] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => { const s = localStorage.getItem("theme"); if (s) setIsDark(s === "dark"); }, []);
  const toggleTheme = () => setIsDark(p => { localStorage.setItem("theme", !p ? "dark" : "light"); return !p; });

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await getSessionSafe();
        if (!data.session) { router.push("/login"); return; }
        setUserId(data.session.user.id);
        const name = data.session.user.user_metadata?.full_name || data.session.user.email?.split("@")[0] || "User";
        setDisplayName(name);

        // Check for Google OAuth callback
        const params = new URLSearchParams(window.location.search);
        const gcalConnected = params.get("gcal");
        const gcalError = params.get("error");
        if (gcalConnected === "connected") setStatusMsg("✅ Google Calendar connected successfully!");
        if (gcalError) setStatusMsg(`❌ Google Calendar error: ${gcalError}`);
        if (gcalConnected || gcalError) window.history.replaceState({}, "", "/integrations");
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setAuthReady(true);
      }
    };
    const { data: l } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) check(); else { setAuthReady(true); router.push("/login"); }
    });
    check();
    return () => l.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    const a = localStorage.getItem("avatar"); const n = localStorage.getItem("displayName");
    if (a) setAvatarDataUrl(a); if (n) setDisplayName(n);
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !userId) return;
    const load = async () => {
      const { data } = await supabase.from("integrations_v2").select("*").eq("user_id", userId);
      if (!data) return;
      const map: Record<string, Integration> = {};
      data.forEach((row: any) => { map[row.service] = row; });
      setIntegrations(map);
      if (map.slack?.config?.webhook_url) setSlackWebhook(map.slack.config.webhook_url);
    };
    load();
  }, [authReady, userId]);

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };
  const getInitials = () => displayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  // ── SLACK ──────────────────────────────────────────────────────────────────
  const saveSlack = async () => {
    if (!userId) return;
    setSlackSaving(true);
    await supabase.from("integrations_v2").upsert({
      user_id: userId, service: "slack",
      config: { webhook_url: slackWebhook }, enabled: true,
    }, { onConflict: "user_id,service" });
    setIntegrations(prev => ({ ...prev, slack: { service: "slack", config: { webhook_url: slackWebhook }, enabled: true } }));
    setSlackSaving(false);
    setStatusMsg("✅ Slack webhook saved!");
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const testSlack = async () => {
    if (!slackWebhook) return;
    setSlackTesting(true); setSlackTestResult(null);
    try {
      const res = await fetch("/api/integrations/slack/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: slackWebhook, text: "🐝 Do Bee integration test — it works!" }),
      });
      setSlackTestResult(res.ok ? "success" : "error");
    } catch { setSlackTestResult("error"); }
    setSlackTesting(false);
  };

  const disconnectSlack = async () => {
    if (!userId || !confirm("Disconnect Slack?")) return;
    await supabase.from("integrations_v2").delete().eq("user_id", userId).eq("service", "slack");
    setIntegrations(prev => { const n = { ...prev }; delete n.slack; return n; });
    setSlackWebhook("");
  };

  // ── GOOGLE CALENDAR ────────────────────────────────────────────────────────
  const connectGoogleCalendar = () => {
    window.location.href = `/api/auth/google?userId=${userId}`;
  };

  const disconnectGoogleCalendar = async () => {
    if (!userId || !confirm("Disconnect Google Calendar?")) return;
    await supabase.from("integrations_v2").delete().eq("user_id", userId).eq("service", "google_calendar");
    setIntegrations(prev => { const n = { ...prev }; delete n.google_calendar; return n; });
  };

  const syncGoogleCalendar = async () => {
    setGcalSyncing(true); setGcalSyncResult(null);
    try {
      const res = await fetch("/api/integrations/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) setGcalSyncResult(`✅ Synced ${data.synced} task${data.synced !== 1 ? "s" : ""} to Google Calendar`);
      else setGcalSyncResult(`❌ Sync failed: ${data.error || "Unknown error"}`);
    } catch { setGcalSyncResult("❌ Sync failed — check your connection"); }
    setGcalSyncing(false);
  };

  const gcal = integrations.google_calendar;
  const slack = integrations.slack;
  const gcalClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .fade-in { animation: fadeIn 0.2s ease-out; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
  `;

  if (!authReady) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
      <div className="text-center"><div className="text-5xl mb-4">🔌</div><div className="text-sm" style={{ color: t.textDim }}>Loading integrations...</div></div>
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: t.bg, color: t.text, transition: "background 0.3s ease" }}>
      <style>{inlineStyles}</style>

      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300"
        style={{ background: t.surface, borderRight: `1px solid ${t.border}`, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2"><span className="text-2xl">🐝</span><span className="text-xl font-bold" style={{ color: t.accent }}>Do Bee</span></div>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.surfaceHover }}>{isDark ? "☀️" : "🌙"}</button>
              <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.surfaceHover, color: t.textMuted }}>✕</button>
            </div>
          </div>
          <div className="flex items-center gap-3 mb-8 p-3 rounded-2xl" style={{ background: t.surfaceHover }}>
            {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" /> :
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: t.accent, color: t.accentText }}>{getInitials()}</div>}
            <div className="text-sm font-semibold truncate" style={{ color: t.text }}>{displayName}</div>
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map(item => (
              <a key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: item.active ? t.accent : "transparent", color: item.active ? t.accentText : t.textMuted }}>
                <span>{item.icon}</span><span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="p-6" style={{ borderTop: `1px solid ${t.border}` }}>
          <button onClick={handleLogout} className="w-full py-2.5 rounded-xl text-sm font-medium" style={{ background: t.surfaceHover, color: t.danger }}>Sign Out</button>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 fade-in" onClick={() => setSidebarOpen(false)} />}

      {/* HEADER */}
      <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: isDark ? "rgba(17,17,19,0.92)" : "rgba(255,250,243,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${t.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, color: t.textMuted }}>☰</button>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>DO BEE</div>
            <div className="text-lg font-bold" style={{ color: t.text }}>Integrations</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>{isDark ? "☀️" : "🌙"}</button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: t.accent, color: t.accentText }}>
            {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" /> : getInitials()}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {statusMsg && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium fade-in"
            style={{ background: statusMsg.startsWith("✅") ? t.success + "20" : t.danger + "20", color: statusMsg.startsWith("✅") ? t.success : t.danger, border: `1px solid ${statusMsg.startsWith("✅") ? t.success + "40" : t.danger + "40"}` }}>
            {statusMsg}
          </div>
        )}

        <h1 className="text-2xl font-bold mb-2" style={{ color: t.text }}>Connect your tools</h1>
        <p className="text-sm mb-8" style={{ color: t.textDim }}>Sync Do Bee with the apps you already use.</p>

        {/* ── GOOGLE CALENDAR ── */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: t.surfaceHover }}>📅</div>
              <div>
                <div className="font-bold" style={{ color: t.text }}>Google Calendar</div>
                <div className="text-xs mt-0.5" style={{ color: t.textDim }}>Sync tasks with due dates to your calendar</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {gcal ? (
                <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: t.success + "20", color: t.success }}>● Connected</span>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: t.surfaceHover, color: t.textDim }}>Not connected</span>
              )}
            </div>
          </div>

          {gcal ? (
            <div className="space-y-3">
              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: t.surfaceHover, color: t.textDim }}>
                Calendar: {gcal.config?.calendar_id || "Primary calendar"}
              </div>
              {gcalSyncResult && (
                <div className="text-xs px-3 py-2 rounded-lg" style={{ background: t.surfaceHover, color: gcalSyncResult.startsWith("✅") ? t.success : t.danger }}>
                  {gcalSyncResult}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={syncGoogleCalendar} disabled={gcalSyncing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: t.accent, color: t.accentText, opacity: gcalSyncing ? 0.6 : 1 }}>
                  {gcalSyncing ? "Syncing…" : "↻ Sync now"}
                </button>
                <button onClick={disconnectGoogleCalendar}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: t.surfaceHover, color: t.danger }}>
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div>
              {!gcalClientId ? (
                <div className="rounded-xl p-4 mb-4 text-sm" style={{ background: t.surfaceHover, color: t.textMuted }}>
                  <p className="font-semibold mb-2" style={{ color: t.text }}>Setup required (one-time, ~5 mins)</p>
                  <ol className="space-y-1.5 list-decimal list-inside text-xs">
                    <li>Go to <strong>console.cloud.google.com</strong></li>
                    <li>Create a project → Enable <strong>Google Calendar API</strong></li>
                    <li>Create <strong>OAuth 2.0 credentials</strong> (Web application)</li>
                    <li>Add redirect URI: <code className="px-1 rounded" style={{ background: t.border }}>{typeof window !== "undefined" ? window.location.origin : "https://yourapp.vercel.app"}/api/auth/google/callback</code></li>
                    <li>Add to Vercel env vars: <code className="px-1 rounded" style={{ background: t.border }}>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> and <code className="px-1 rounded" style={{ background: t.border }}>GOOGLE_CLIENT_SECRET</code></li>
                    <li>Redeploy, then come back here</li>
                  </ol>
                </div>
              ) : (
                <button onClick={connectGoogleCalendar}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ background: "#4285F4", color: "white" }}>
                  <span>G</span> Connect Google Calendar
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── SLACK ── */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: t.surfaceHover }}>💬</div>
              <div>
                <div className="font-bold" style={{ color: t.text }}>Slack</div>
                <div className="text-xs mt-0.5" style={{ color: t.textDim }}>Get notified in Slack when tasks are completed</div>
              </div>
            </div>
            {slack && (
              <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: t.success + "20", color: t.success }}>● Connected</span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: t.textDim }}>
                Incoming Webhook URL
              </label>
              <input value={slackWebhook} onChange={e => setSlackWebhook(e.target.value)}
                placeholder="https://hooks.slack.com/services/…"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: t.inputBg, color: t.text, border: `1px solid ${t.border}` }} />
              <p className="text-xs mt-1.5" style={{ color: t.textDim }}>
                Get a webhook URL from your Slack workspace → Apps → Incoming Webhooks
              </p>
            </div>
            {slackTestResult && (
              <div className="text-xs px-3 py-2 rounded-lg"
                style={{ background: slackTestResult === "success" ? t.success + "20" : t.danger + "20", color: slackTestResult === "success" ? t.success : t.danger }}>
                {slackTestResult === "success" ? "✅ Test message sent!" : "❌ Failed — check your webhook URL"}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={saveSlack} disabled={!slackWebhook || slackSaving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: slackWebhook ? t.accent : t.surfaceHover, color: slackWebhook ? t.accentText : t.textDim, opacity: slackSaving ? 0.6 : 1 }}>
                {slackSaving ? "Saving…" : "Save"}
              </button>
              <button onClick={testSlack} disabled={!slackWebhook || slackTesting}
                className="px-4 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: t.surfaceHover, color: t.textMuted }}>
                {slackTesting ? "Testing…" : "Test"}
              </button>
              {slack && (
                <button onClick={disconnectSlack}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: t.surfaceHover, color: t.danger }}>
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── COMING SOON ── */}
        {[
          { icon: "📧", name: "Gmail", desc: "Turn emails into tasks" },
          { icon: "🗓️", name: "Microsoft Outlook", desc: "Sync with Outlook calendar & tasks" },
          { icon: "🎮", name: "Discord", desc: "Create tasks from Discord messages" },
          { icon: "📁", name: "Google Drive", desc: "Attach Drive files to tasks" },
        ].map(item => (
          <div key={item.name} className="rounded-2xl p-5 mb-4 flex items-center justify-between"
            style={{ background: t.surface, border: `1px solid ${t.border}`, opacity: 0.6 }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: t.surfaceHover }}>{item.icon}</div>
              <div>
                <div className="font-bold" style={{ color: t.text }}>{item.name}</div>
                <div className="text-xs mt-0.5" style={{ color: t.textDim }}>{item.desc}</div>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: t.surfaceHover, color: t.textDim }}>Coming soon</span>
          </div>
        ))}
      </div>
    </main>
  );
}
