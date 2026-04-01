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
interface GmailEmail { id: string; subject: string; from: string; snippet: string; }

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
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Google Calendar state
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalSyncResult, setGcalSyncResult] = useState<string | null>(null);

  // Outlook state
  const [outlookSyncing, setOutlookSyncing] = useState(false);
  const [outlookSyncResult, setOutlookSyncResult] = useState<string | null>(null);

  // Gmail state
  const [gmailEmails, setGmailEmails] = useState<GmailEmail[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailTaskCreating, setGmailTaskCreating] = useState<string | null>(null);

  useEffect(() => {
    const s = localStorage.getItem("theme");
    if (s) setIsDark(s === "dark");
  }, []);

  const toggleTheme = () =>
    setIsDark((p) => {
      localStorage.setItem("theme", !p ? "dark" : "light");
      return !p;
    });

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await getSessionSafe();
        if (!data.session) {
          router.push("/login");
          return;
        }

        setUserId(data.session.user.id);
        const name =
          data.session.user.user_metadata?.full_name ||
          data.session.user.email?.split("@")[0] ||
          "User";
        setDisplayName(name);

        const params = new URLSearchParams(window.location.search);
        const gcalConnected = params.get("gcal");
        const gmailConnected = params.get("gmail");
        const outlookConnected = params.get("outlook");
        const err = params.get("error");

        if (gcalConnected === "connected") {
          setStatusMsg("✅ Google Calendar connected successfully!");
        }
        if (gmailConnected === "connected") {
          setStatusMsg("✅ Gmail connected successfully!");
        }
        if (outlookConnected === "connected") {
          setStatusMsg("✅ Outlook Calendar connected successfully!");
        }
        if (err) {
          setStatusMsg(`❌ Connection error: ${err}`);
        }

        if (gcalConnected || gmailConnected || outlookConnected || err) {
          window.history.replaceState({}, "", "/integrations");
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setAuthReady(true);
      }
    };

    const { data: l } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) check();
      else {
        setAuthReady(true);
        router.push("/login");
      }
    });

    check();
    return () => l.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    const a = localStorage.getItem("avatar");
    const n = localStorage.getItem("displayName");
    if (a) setAvatarDataUrl(a);
    if (n) setDisplayName(n);
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !userId) return;
    const load = async () => {
      const { data } = await supabase
        .from("integrations_v2")
        .select("*")
        .eq("user_id", userId);

      if (!data) return;

      const map: Record<string, Integration> = {};
      data.forEach((row: any) => {
        map[row.service] = row;
      });
      setIntegrations(map);
    };
    load();
  }, [authReady, userId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getInitials = () =>
    displayName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  // ── GOOGLE CALENDAR ─────────────────────────────────────────────────────────
  const connectGoogleCalendar = () => {
    window.location.href = `/api/auth/google?userId=${userId}`;
  };

  const disconnectGoogleCalendar = async () => {
    if (!userId || !confirm("Disconnect Google Calendar?")) return;
    await supabase
      .from("integrations_v2")
      .delete()
      .eq("user_id", userId)
      .eq("service", "google_calendar");

    setIntegrations((prev) => {
      const n = { ...prev };
      delete n.google_calendar;
      return n;
    });
  };

  const syncGoogleCalendar = async () => {
    setGcalSyncing(true);
    setGcalSyncResult(null);
    try {
      const res = await fetch("/api/integrations/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setGcalSyncResult(
          `✅ Synced ${data.synced} task${data.synced !== 1 ? "s" : ""} to Google Calendar`
        );
      } else {
        setGcalSyncResult(`❌ Sync failed: ${data.error}`);
      }
    } catch {
      setGcalSyncResult("❌ Sync failed — check your connection");
    }
    setGcalSyncing(false);
  };

  // ── OUTLOOK CALENDAR ────────────────────────────────────────────────────────
  const connectOutlookCalendar = () => {
  window.location.href = `/api/auth/microsoft?userId=${userId}`;
  };

  const disconnectOutlookCalendar = async () => {
    if (!userId || !confirm("Disconnect Outlook Calendar?")) return;

    await supabase
      .from("integrations_v2")
      .delete()
      .eq("user_id", userId)
      .eq("service", "microsoft_outlook");

    setIntegrations((prev) => {
      const n = { ...prev };
      delete n.microsoft_outlook;
      return n;
    });

    setStatusMsg("✅ Outlook Calendar disconnected");
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const syncOutlookCalendar = async () => {
    setOutlookSyncing(true);
    setOutlookSyncResult(null);
    try {
      const res = await fetch("/api/integrations/outlook/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) {
        setOutlookSyncResult(
          `✅ Synced ${data.synced} task${data.synced !== 1 ? "s" : ""} to Outlook`
        );
      } else {
        setOutlookSyncResult(`❌ Sync failed: ${data.error}`);
      }
    } catch {
      setOutlookSyncResult("❌ Sync failed — check your connection");
    }
    setOutlookSyncing(false);
  };

  // ── GMAIL ───────────────────────────────────────────────────────────────────
  const connectGmail = () => {
    window.location.href = `/api/auth/gmail?userId=${userId}`;
  };

  const disconnectGmail = async () => {
    if (!userId || !confirm("Disconnect Gmail?")) return;
    await supabase
      .from("integrations_v2")
      .delete()
      .eq("user_id", userId)
      .eq("service", "gmail");

    setIntegrations((prev) => {
      const n = { ...prev };
      delete n.gmail;
      return n;
    });
    setGmailEmails([]);
  };

  const fetchGmailEmails = async () => {
    setGmailLoading(true);
    try {
      const res = await fetch("/api/integrations/gmail/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (res.ok) setGmailEmails(data.emails || []);
      else setStatusMsg(`❌ Failed to load emails: ${data.error}`);
    } catch {
      setStatusMsg("❌ Failed to load emails");
    }
    setGmailLoading(false);
  };

  const createTaskFromEmail = async (email: GmailEmail) => {
    if (!userId) return;
    setGmailTaskCreating(email.id);

    await supabase.from("tasks_v2").insert({
      user_id: userId,
      title: email.subject,
      description: email.snippet,
      is_completed: false,
      is_archived: false,
    });

    setStatusMsg(`✅ Task created: "${email.subject}"`);
    setTimeout(() => setStatusMsg(null), 3000);
    setGmailTaskCreating(null);
  };

  const gcal = integrations.google_calendar;
  const outlook = integrations.microsoft_outlook;
  const gmail = integrations.gmail;
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .fade-in { animation: fadeIn 0.2s ease-out; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
  `;

  if (!authReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: t.bg }}
      >
        <div className="text-center">
          <div className="text-5xl mb-4">🔌</div>
          <div className="text-sm" style={{ color: t.textDim }}>
            Loading integrations...
          </div>
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.text,
        transition: "background 0.3s ease",
      }}
    >
      <style>{inlineStyles}</style>

      <aside
        className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300"
        style={{
          background: t.surface,
          borderRight: `1px solid ${t.border}`,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐝</span>
              <span className="text-xl font-bold" style={{ color: t.accent }}>
                Do Bee
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t.surfaceHover }}
              >
                {isDark ? "☀️" : "🌙"}
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t.surfaceHover, color: t.textMuted }}
              >
                ✕
              </button>
            </div>
          </div>

          <div
            className="flex items-center gap-3 mb-8 p-3 rounded-2xl"
            style={{ background: t.surfaceHover }}
          >
            {avatarDataUrl ? (
              <img
                src={avatarDataUrl}
                alt="avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: t.accent, color: t.accentText }}
              >
                {getInitials()}
              </div>
            )}
            <div className="text-sm font-semibold truncate" style={{ color: t.text }}>
              {displayName}
            </div>
          </div>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: item.active ? t.accent : "transparent",
                  color: item.active ? t.accentText : t.textMuted,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>

        <div className="p-6" style={{ borderTop: `1px solid ${t.border}` }}>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: t.surfaceHover, color: t.danger }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <header
        className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{
          background: isDark
            ? "rgba(17,17,19,0.92)"
            : "rgba(255,250,243,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: t.surfaceHover, color: t.textMuted }}
          >
            ☰
          </button>
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: t.textDim }}
            >
              DO BEE
            </div>
            <div className="text-lg font-bold" style={{ color: t.text }}>
              Integrations
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden"
            style={{ background: t.accent, color: t.accentText }}
          >
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" />
            ) : (
              getInitials()
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {statusMsg && (
          <div
            className="mb-6 px-4 py-3 rounded-xl text-sm font-medium fade-in"
            style={{
              background: statusMsg.startsWith("✅")
                ? t.success + "20"
                : t.danger + "20",
              color: statusMsg.startsWith("✅") ? t.success : t.danger,
              border: `1px solid ${
                statusMsg.startsWith("✅")
                  ? t.success + "40"
                  : t.danger + "40"
              }`,
            }}
          >
            {statusMsg}
          </div>
        )}

        <h1 className="text-2xl font-bold mb-2" style={{ color: t.text }}>
          Connect your tools
        </h1>
        <p className="text-sm mb-8" style={{ color: t.textDim }}>
          Sync Do Bee with the apps you already use.
        </p>

        {/* GOOGLE CALENDAR */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: t.surfaceHover }}
              >
                📅
              </div>
              <div>
                <div className="font-bold" style={{ color: t.text }}>
                  Google Calendar
                </div>
                <div className="text-xs mt-0.5" style={{ color: t.textDim }}>
                  Sync tasks with due dates to your calendar
                </div>
              </div>
            </div>
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: gcal ? t.success + "20" : t.surfaceHover,
                color: gcal ? t.success : t.textDim,
              }}
            >
              {gcal ? "● Connected" : "Not connected"}
            </span>
          </div>

          {gcal ? (
            <div className="space-y-3">
              <div
                className="text-xs px-3 py-2 rounded-lg"
                style={{ background: t.surfaceHover, color: t.textDim }}
              >
                Calendar: {gcal.config?.calendar_id || "Primary calendar"}
              </div>

              {gcalSyncResult && (
                <div
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{
                    background: t.surfaceHover,
                    color: gcalSyncResult.startsWith("✅") ? t.success : t.danger,
                  }}
                >
                  {gcalSyncResult}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={syncGoogleCalendar}
                  disabled={gcalSyncing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{
                    background: t.accent,
                    color: t.accentText,
                    opacity: gcalSyncing ? 0.6 : 1,
                  }}
                >
                  {gcalSyncing ? "Syncing…" : "↻ Sync now"}
                </button>
                <button
                  onClick={disconnectGoogleCalendar}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: t.surfaceHover, color: t.danger }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={connectGoogleCalendar}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: "#4285F4", color: "white" }}
            >
              <span>G</span> Connect Google Calendar
            </button>
          )}
        </div>

        {/* OUTLOOK CALENDAR */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: t.surfaceHover }}
              >
                🗓️
              </div>
              <div>
                <div className="font-bold" style={{ color: t.text }}>
                  Outlook Calendar
                </div>
                <div className="text-xs mt-0.5" style={{ color: t.textDim }}>
                  Sync tasks with due dates to Microsoft Outlook Calendar
                </div>
              </div>
            </div>
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: outlook ? t.success + "20" : t.surfaceHover,
                color: outlook ? t.success : t.textDim,
              }}
            >
              {outlook ? "● Connected" : "Not connected"}
            </span>
          </div>

          {outlook ? (
            <div className="space-y-3">
              {outlookSyncResult && (
                <div
                  className="text-xs px-3 py-2 rounded-lg"
                  style={{
                    background: t.surfaceHover,
                    color: outlookSyncResult.startsWith("✅") ? t.success : t.danger,
                  }}
                >
                  {outlookSyncResult}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={syncOutlookCalendar}
                  disabled={outlookSyncing}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{
                    background: t.accent,
                    color: t.accentText,
                    opacity: outlookSyncing ? 0.6 : 1,
                  }}
                >
                  {outlookSyncing ? "Syncing…" : "↻ Sync now"}
                </button>
                <button
                  onClick={disconnectOutlookCalendar}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: t.surfaceHover, color: t.danger }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={connectOutlookCalendar}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: "#0078D4", color: "white" }}
            >
              <span>O</span> Connect Outlook Calendar
            </button>
          )}
        </div>

        {/* GMAIL */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{ background: t.surface, border: `1px solid ${t.border}` }}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: t.surfaceHover }}
              >
                📧
              </div>
              <div>
                <div className="font-bold" style={{ color: t.text }}>
                  Gmail
                </div>
                <div className="text-xs mt-0.5" style={{ color: t.textDim }}>
                  Turn emails into tasks
                </div>
              </div>
            </div>
            <span
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: gmail ? t.success + "20" : t.surfaceHover,
                color: gmail ? t.success : t.textDim,
              }}
            >
              {gmail ? "● Connected" : "Not connected"}
            </span>
          </div>

          {gmail ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={fetchGmailEmails}
                  disabled={gmailLoading}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                  style={{
                    background: t.accent,
                    color: t.accentText,
                    opacity: gmailLoading ? 0.6 : 1,
                  }}
                >
                  {gmailLoading ? "Loading…" : "📥 Load unread emails"}
                </button>
                <button
                  onClick={disconnectGmail}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium"
                  style={{ background: t.surfaceHover, color: t.danger }}
                >
                  Disconnect
                </button>
              </div>

              {gmailEmails.length > 0 && (
                <div className="space-y-2 mt-2">
                  {gmailEmails.map((email) => (
                    <div
                      key={email.id}
                      className="rounded-xl p-3 flex items-start justify-between gap-3"
                      style={{ background: t.surfaceHover }}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-semibold truncate"
                          style={{ color: t.text }}
                        >
                          {email.subject}
                        </div>
                        <div className="text-xs truncate mt-0.5" style={{ color: t.textDim }}>
                          {email.from}
                        </div>
                        <div
                          className="text-xs mt-1 line-clamp-2"
                          style={{ color: t.textMuted }}
                        >
                          {email.snippet}
                        </div>
                      </div>

                      <button
                        onClick={() => createTaskFromEmail(email)}
                        disabled={gmailTaskCreating === email.id}
                        className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold"
                        style={{
                          background: t.accent,
                          color: t.accentText,
                          opacity: gmailTaskCreating === email.id ? 0.6 : 1,
                        }}
                      >
                        {gmailTaskCreating === email.id ? "…" : "+ Task"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {gmailEmails.length === 0 && !gmailLoading && (
                <div className="text-xs text-center py-3" style={{ color: t.textDim }}>
                  Click "Load unread emails" to see your inbox
                </div>
              )}
            </div>
          ) : !googleClientId ? (
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: t.surfaceHover, color: t.textDim }}
            >
              Add <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to Vercel env vars to
              enable Gmail.
            </div>
          ) : (
            <button
              onClick={connectGmail}
              className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: "#EA4335", color: "white" }}
            >
              <span>✉</span> Connect Gmail
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
