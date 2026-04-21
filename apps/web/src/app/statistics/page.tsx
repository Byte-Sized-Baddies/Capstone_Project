// app/statistics/page.tsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
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
  { href: "/statistics", label: "Statistics", icon: "📊", active: true },
  { href: "/archive", label: "Archive", icon: "📦", active: false },
  { href: "/timeblocking", label: "Time Block", icon: "⏱", active: false },
  { href: "/notes", label: "Notes", icon: "📝", active: false },
  { href: "/integrations", label: "Integrations", icon: "🔌", active: false },
  { href: "/settings", label: "Settings", icon: "⚙️", active: false },
];

// Convert any Date or ISO string to local YYYY-MM-DD
const toLocalDate = (d: Date | string): string => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return (
    dt.getFullYear() +
    "-" + String(dt.getMonth() + 1).padStart(2, "0") +
    "-" + String(dt.getDate()).padStart(2, "0")
  );
};

const todayLocal = () => toLocalDate(new Date());

// Get local date string for N days ago
const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toLocalDate(d);
};

export default function StatisticsPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [authReady, setAuthReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [tasks, setTasks] = useState<any[]>([]);
  const [dailyGoal, setDailyGoal] = useState(5);

  useEffect(() => { const saved = localStorage.getItem("theme"); if (saved) setIsDark(saved === "dark"); }, []);
  const toggleTheme = () => setIsDark(prev => { localStorage.setItem("theme", !prev ? "dark" : "light"); return !prev; });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await getSessionSafe();
        if (error || !data.session) { router.push("/login"); return; }
        const user = data.session.user;
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
        setDisplayName(name);
        setUserEmail(user.email ?? "");
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setAuthReady(true);
      }
    };
    const { data: authListener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) checkSession(); else { setAuthReady(true); router.push("/login"); }
    });
    checkSession();
    return () => { authListener.subscription.unsubscribe(); };
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    const a = localStorage.getItem("avatar");
    const n = localStorage.getItem("displayName");
    const g = localStorage.getItem("dailyGoal");
    if (a) setAvatarDataUrl(a);
    if (n) setDisplayName(n);
    if (g) setDailyGoal(Number(g));
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const { data: catRows } = await supabase.from("categories_v2").select("id, name").eq("user_id", user.id);
      const catMap = new Map((catRows ?? []).map((c: any) => [c.id, c.name]));
      const { data } = await supabase
        .from("tasks_v2")
        .select("id, title, is_completed, status, priority, category_id, due_date, created_at, updated_at, is_archived")
        .eq("user_id", user.id);
      setTasks((data ?? []).map((row: any) => ({
        id: row.id,
        text: row.title,
        done: row.is_completed,
        archived: row.is_archived ?? false,
        status: row.status,
        priority: row.priority,
        category: catMap.get(row.category_id) ?? "Other",
        due: row.due_date ?? null,
        createdAt: row.created_at,
        // Use updated_at as completion proxy — converted to local timezone
        completedLocalDate: row.is_completed ? toLocalDate(new Date(row.updated_at)) : null,
      })));
    };
    load();
  }, [authReady]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    ["tasks", "folders", "categories", "avatar", "displayName", "userEmail"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  const handleGoalChange = (delta: number) => {
    const next = Math.min(50, Math.max(1, dailyGoal + delta));
    setDailyGoal(next);
    localStorage.setItem("dailyGoal", String(next));
  };

  const getInitials = () => displayName.split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase();

  // ── Core stats (timezone-aware) ──────────────────────────────────────────
  const today = todayLocal();
  const activeTasks = tasks.filter(t => !t.archived);
  const completedTasks = activeTasks.filter(t => t.done);
  const pendingTasks = activeTasks.filter(t => !t.done);
  const totalActive = activeTasks.length;
  const completionRate = totalActive === 0 ? 0 : Math.round((completedTasks.length / totalActive) * 100);
  const countToday = completedTasks.filter(t => t.completedLocalDate === today).length;
  const progressPercent = Math.min(100, Math.round((countToday / Math.max(1, dailyGoal)) * 100));

  // Status breakdown
  const notStartedCount = pendingTasks.filter(t => t.status === "not_started").length;
  const inProgressCount = pendingTasks.filter(t => t.status === "in_progress").length;

  // ── Streak calculation (timezone-aware) ──────────────────────────────────
  const streak = useMemo(() => {
    const daysWithCompletion = new Set(completedTasks.map(t => t.completedLocalDate).filter(Boolean));
    let count = 0;
    let d = 0;
    // Check today first; if no tasks today, streak starts from yesterday
    if (!daysWithCompletion.has(today)) d = 1;
    while (daysWithCompletion.has(daysAgo(d))) { count++; d++; }
    return count;
  }, [completedTasks, today]);

  // ── Weekly bar chart (last 7 days, timezone-aware) ───────────────────────
  const weeklyData = useMemo(() => {
    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return Array.from({ length: 7 }, (_, i) => {
      const offset = 6 - i;
      const dateStr = daysAgo(offset);
      const d = new Date(dateStr + "T12:00:00");
      const count = completedTasks.filter(t => t.completedLocalDate === dateStr).length;
      return {
        label: offset === 0 ? "Today" : DAY_LABELS[d.getDay()],
        date: dateStr,
        count,
        isToday: offset === 0,
      };
    });
  }, [completedTasks]);

  const maxBar = Math.max(...weeklyData.map(d => d.count), 1);

  // ── Category breakdown ───────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {};
    activeTasks.forEach(t => {
      if (!counts[t.category]) counts[t.category] = { total: 0, done: 0 };
      counts[t.category].total++;
      if (t.done) counts[t.category].done++;
    });
    return Object.entries(counts).sort((a, b) => b[1].total - a[1].total).slice(0, 6);
  }, [activeTasks]);

  // ── Priority breakdown ───────────────────────────────────────────────────
  const priorityData = useMemo(() => {
    const counts = { High: 0, Medium: 0, Low: 0 };
    pendingTasks.forEach(t => {
      const p = t.priority === 2 ? "High" : t.priority === 1 ? "Medium" : "Low";
      counts[p]++;
    });
    return counts;
  }, [pendingTasks]);

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fillBar { from { height: 0; } to { } }
    .slide-up { animation: slideUp 0.35s ease-out forwards; }
    .fade-in { animation: fadeIn 0.25s ease-out forwards; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
  `;

  if (!authReady) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
      <div className="text-center"><div className="text-5xl mb-4">🐝</div><div className="text-sm font-medium" style={{ color: t.textDim }}>Loading your hive...</div></div>
    </div>
  );

  const StatCard = ({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) => (
    <div className="p-5 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textDim }}>{label}</div>
      <div className="text-4xl font-black" style={{ color }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: t.textDim }}>{sub}</div>}
    </div>
  );

  return (
    <main style={{ minHeight: "100vh", background: t.bg, color: t.text, transition: "background 0.3s ease, color 0.3s ease" }}>
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
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: t.text }}>{displayName}</div>
              <div className="text-xs truncate" style={{ color: t.textDim }}>{userEmail}</div>
            </div>
          </div>
          <nav className="space-y-1">
            {NAV_ITEMS.map(item => (
              <a key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all"
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
            <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>DO BEE</div>
            <div className="text-xl font-bold" style={{ color: t.text }}>Statistics</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>{isDark ? "☀️" : "🌙"}</button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: t.accent, color: t.accentText }}>
            {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" /> : getInitials()}
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-5 slide-up">

        {/* ── Row 1: Stat cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Tasks" value={totalActive} color={t.text} />
          <StatCard label="Completed" value={completedTasks.length} sub={`${completionRate}% rate`} color={t.success} />
          <StatCard label="Today" value={`${countToday}/${dailyGoal}`} sub={`${progressPercent}% of goal`} color={t.accent} />
          <StatCard label="Streak" value={`${streak}d`} sub={streak === 0 ? "Start today!" : streak === 1 ? "Keep it up!" : "On fire 🔥"} color={streak > 0 ? "#f97316" : t.textDim} />
        </div>

        {/* ── Row 2: Today's progress + Daily goal ─────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Today's Progress */}
          <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-bold" style={{ color: t.text }}>Today&apos;s Progress</div>
              <div className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: t.accent + "25", color: t.accent }}>
                {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
              </div>
            </div>
            {/* Progress arc */}
            <div className="flex items-center gap-5 mb-4">
              <div className="relative flex-shrink-0">
                <svg width="88" height="88" viewBox="0 0 88 88">
                  <circle cx="44" cy="44" r="36" fill="none" stroke={t.border} strokeWidth="8" />
                  <circle cx="44" cy="44" r="36" fill="none" stroke={t.accent} strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressPercent / 100)}`}
                    strokeLinecap="round"
                    style={{ transform: "rotate(-90deg)", transformOrigin: "44px 44px", transition: "stroke-dashoffset 0.6s ease" }} />
                  <text x="44" y="48" textAnchor="middle" fontSize="16" fontWeight="800" fill={t.text}>{progressPercent}%</text>
                </svg>
              </div>
              <div>
                <div className="text-3xl font-black" style={{ color: t.accent }}>{countToday}</div>
                <div className="text-sm" style={{ color: t.textDim }}>of {dailyGoal} tasks</div>
                <div className="text-xs mt-1" style={{ color: t.textDim }}>
                  {countToday >= dailyGoal ? "🎉 Goal reached!" : `${dailyGoal - countToday} more to go`}
                </div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: t.border }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, ${t.accent}, ${t.accent}cc)` }} />
            </div>
          </div>

          {/* Daily Goal + Status */}
          <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-sm font-bold mb-4" style={{ color: t.text }}>Daily Goal</div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => handleGoalChange(-1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-xl font-bold" style={{ background: t.surfaceHover, border: `1px solid ${t.border}`, color: t.text }}>−</button>
              <div className="flex-1 py-2.5 text-center font-bold text-lg rounded-xl" style={{ background: t.accent + "25", color: t.accent }}>{dailyGoal} tasks / day</div>
              <button onClick={() => handleGoalChange(1)} className="w-9 h-9 rounded-xl flex items-center justify-center text-xl font-bold" style={{ background: t.surfaceHover, border: `1px solid ${t.border}`, color: t.text }}>+</button>
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textDim }}>Current Status</div>
            <div className="space-y-2">
              {[
                { label: "In Progress", count: inProgressCount, color: t.accent },
                { label: "Not Started", count: notStartedCount, color: t.textMuted },
                { label: "Completed", count: completedTasks.length, color: t.success },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: t.textDim }}>{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: t.border }}>
                      <div className="h-full rounded-full" style={{ width: totalActive ? `${(count / totalActive) * 100}%` : "0%", background: color }} />
                    </div>
                    <span className="text-xs font-bold w-5 text-right" style={{ color }}>{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Row 3: Weekly Activity ────────────────────────────────────── */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="flex items-center justify-between mb-5">
            <div className="text-sm font-bold" style={{ color: t.text }}>Weekly Activity</div>
            <div className="text-xs" style={{ color: t.textDim }}>
              {weeklyData.reduce((s, d) => s + d.count, 0)} completed this week
            </div>
          </div>
          <div className="flex items-end gap-2 h-36">
            {weeklyData.map((d, i) => (
              <div key={i} className="flex flex-col items-center flex-1 gap-1">
                {d.count > 0 && (
                  <span className="text-xs font-bold" style={{ color: d.isToday ? t.accent : t.textDim }}>{d.count}</span>
                )}
                <div className="w-full rounded-t-lg transition-all duration-700 relative overflow-hidden"
                  style={{
                    height: `${Math.max((d.count / maxBar) * 100, d.count === 0 ? 4 : 8)}%`,
                    background: d.isToday ? t.accent : `${t.accent}45`,
                    opacity: d.count === 0 ? 0.25 : 1,
                    minHeight: 4,
                  }} />
                <span className="text-xs font-medium text-center leading-tight" style={{ color: d.isToday ? t.accent : t.textDim, fontSize: 10 }}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Row 4: Categories + Priority ─────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Categories */}
          <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-sm font-bold mb-4" style={{ color: t.text }}>By Category</div>
            {categoryData.length === 0 ? (
              <p className="text-xs" style={{ color: t.textDim }}>No tasks yet.</p>
            ) : (
              <div className="space-y-3">
                {categoryData.map(([cat, { total, done }]) => {
                  const rate = Math.round((done / total) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate max-w-[120px]" style={{ color: t.text }}>{cat}</span>
                        <span className="text-xs" style={{ color: t.textDim }}>{done}/{total}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: t.border }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${rate}%`, background: rate === 100 ? t.success : t.accent }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority breakdown */}
          <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-sm font-bold mb-4" style={{ color: t.text }}>Pending by Priority</div>
            {pendingTasks.length === 0 ? (
              <div className="py-6 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-xs font-semibold" style={{ color: t.success }}>All tasks complete!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {([
                  { label: "High", count: priorityData.High, color: t.danger },
                  { label: "Medium", count: priorityData.Medium, color: t.accent },
                  { label: "Low", count: priorityData.Low, color: t.success },
                ] as const).map(({ label, count, color }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-medium" style={{ color: t.text }}>{label}</span>
                        <span className="text-xs" style={{ color: t.textDim }}>{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: t.border }}>
                        <div className="h-full rounded-full" style={{ width: pendingTasks.length ? `${(count / pendingTasks.length) * 100}%` : "0%", background: color }} />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 text-xs text-center" style={{ borderTop: `1px solid ${t.border}`, color: t.textDim }}>
                  {pendingTasks.length} tasks remaining
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
