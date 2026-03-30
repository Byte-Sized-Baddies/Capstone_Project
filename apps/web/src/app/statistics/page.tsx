// app/statistics/page.tsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../auth/supabaseClient";

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

type Folder = { id: number; name: string; owner: string; collaborators: string[]; created: number; };

function HoneycombLiquid({ percent, accentColor }: { percent: number; accentColor: string }) {
  const size = 180, cx = size / 2, cy = size / 2, r = 78;
  const points = Array.from({ length: 6 }, (_, i) => { const angle = (Math.PI / 180) * (60 * i - 30); return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]; });
  const polyPoints = points.map(p => p.join(",")).join(" ");
  const fillY = cy - r + r * 2 * (1 - percent / 100);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs><clipPath id="hex-clip"><polygon points={polyPoints} /></clipPath></defs>
      <polygon points={polyPoints} fill={`${accentColor}15`} stroke={accentColor} strokeWidth="3" />
      <rect x={cx - r} y={fillY} width={r * 2} height={r * 2} fill={accentColor} opacity="0.85" clipPath="url(#hex-clip)" style={{ transition: "y 0.8s ease" }} />
      <polygon points={polyPoints} fill="none" stroke="#fff" strokeWidth="2" opacity="0.3" />
    </svg>
  );
}

export default function StatisticsPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("User");
  const [tasks, setTasks] = useState<any[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [dailyGoal, setDailyGoal] = useState(5);

  useEffect(() => { const saved = localStorage.getItem("theme"); if (saved) setIsDark(saved === "dark"); }, []);
  const toggleTheme = () => setIsDark(prev => { localStorage.setItem("theme", !prev ? "dark" : "light"); return !prev; });

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) { router.push("/login"); return; }
      const user = data.session.user;
      setUserId(user.id);
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
      setDisplayName(name);
      setAuthReady(true);
    };
    const { data: authListener } = supabase.auth.onAuthStateChange(() => checkSession());
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
    const loadTasks = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const { data, error } = await supabase.from("tasks_v2").select("id, title, is_completed, status, priority, category_id, due_date, created_at, updated_at").eq("user_id", user.id);
      if (error) return;
      setTasks((data ?? []).map(row => ({ id: row.id, text: row.title, done: row.is_completed, status: row.status, category: row.category_id, due: row.due_date ?? "No date", completedAt: row.is_completed ? row.updated_at : null })));
    };
    loadTasks();
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    const loadFolders = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const { data: ownedRows } = await supabase.from("folders").select("id, user_id, name, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      const { data: memberRows } = await supabase.from("folder_members").select("folder_id").eq("user_id", user.id);
      const sharedFolderIds = [...new Set((memberRows ?? []).map(r => r.folder_id))];
      const ownedIds = new Set((ownedRows ?? []).map(r => r.id));
      const onlySharedIds = sharedFolderIds.filter(id => !ownedIds.has(id));
      let sharedRows: any[] = [];
      if (onlySharedIds.length > 0) { const { data } = await supabase.from("folders").select("id, user_id, name, created_at").in("id", onlySharedIds); sharedRows = data ?? []; }
      setFolders([...(ownedRows ?? []), ...sharedRows].map(row => ({ id: row.id, name: row.name, owner: row.user_id, collaborators: [], created: new Date(row.created_at).getTime() })));
    };
    loadFolders();
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

  const getInitials = (name = displayName) => name.split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase();

  const todayKey = new Date().toISOString().slice(0, 10);
  const completedTasksArr = tasks.filter(t => t.done);
  const totalTasks = tasks.length;
  const completedTasks = completedTasksArr.length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const countToday = completedTasksArr.filter(t => t.completedAt?.startsWith(todayKey)).length;
  const progressPercent = Math.min(100, Math.round((countToday / Math.max(1, dailyGoal)) * 100));

  const categoryCounts: Record<string, number> = {};
  tasks.forEach(t => { if (!categoryCounts[t.category]) categoryCounts[t.category] = 0; categoryCounts[t.category]++; });
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  const weeklyChartData = useMemo(() => {
    const labels = ["M", "T", "W", "Th", "F", "Sa", "Su"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const dKey = d.toISOString().slice(0, 10);
      const count = completedTasksArr.filter(t => t.completedAt?.startsWith(dKey)).length;
      return { day: labels[i], count, isToday: i === 6 };
    });
  }, [completedTasksArr]);

  const maxVal = Math.max(...weeklyChartData.map(d => d.count), 1);

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .slide-up { animation: slideUp 0.35s ease-out forwards; }
    .fade-in { animation: fadeIn 0.25s ease-out forwards; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
  `;

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
        <div className="text-center"><div className="text-5xl mb-4">🐝</div><div className="text-sm font-medium" style={{ color: t.textDim }}>Loading your hive...</div></div>
      </div>
    );
  }

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
            <div className="text-sm font-semibold" style={{ color: t.text }}>{displayName}</div>
          </div>
          <nav className="space-y-1 mb-8">
            {[{ href: "/dashboard", label: "Dashboard", icon: "⊞", active: false }, { href: "/calendar", label: "Calendar", icon: "📅", active: false }, { href: "/statistics", label: "Statistics", icon: "📊", active: true }, { href: "/settings", label: "Settings", icon: "⚙️", active: false }].map(item => (
              <a key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: item.active ? t.accent : "transparent", color: item.active ? t.accentText : t.textMuted }}>
                <span>{item.icon}</span><span>{item.label}</span>
              </a>
            ))}
          </nav>
          {/* Folders */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: t.textDim }}>Folders</div>
            <a href="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-1 text-sm" style={{ color: t.textDim }}>
              <span>📂</span><span>All Tasks</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: t.border, color: t.textMuted }}>{tasks.length}</span>
            </a>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {folders.map(folder => {
                const isOwner = folder.owner === userId;
                const taskCount = tasks.filter(tk => tk.folderId === folder.id).length;
                return (
                  <a key={folder.id} href="/dashboard" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ color: t.textDim }}>
                    <span>{isOwner ? "📁" : "🤝"}</span>
                    <span className="flex-1 truncate">{folder.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: t.border, color: t.textMuted }}>{taskCount}</span>
                  </a>
                );
              })}
            </div>
          </div>
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
            <div className="text-lg font-bold" style={{ color: t.text }}>Statistics</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>{isDark ? "☀️" : "🌙"}</button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: t.accent, color: t.accentText }}>
            {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" /> : getInitials()}
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto space-y-6 slide-up">
        {/* Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[{ label: "Total Tasks", value: totalTasks, color: t.accent }, { label: "Completed", value: completedTasks, color: t.success }, { label: "Completion Rate", value: `${completionRate}%`, color: t.accent }].map(({ label, value, color }) => (
            <div key={label} className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: t.textDim }}>{label}</div>
              <div className="text-4xl font-extrabold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Daily Goal + Hexagon */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <h2 className="text-lg font-bold text-center mb-6" style={{ color: t.text }}>Today&apos;s Progress</h2>
          <div className="flex items-center justify-between mb-8 p-4 rounded-xl" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: t.text }}>Daily Goal</div>
              <div className="text-xs" style={{ color: t.textDim }}>Tasks to complete each day</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleGoalChange(-1)} className="w-9 h-9 rounded-lg flex items-center justify-center text-xl font-bold" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}>−</button>
              <div className="px-5 py-2 min-w-[90px] text-center font-bold text-sm rounded-lg" style={{ background: t.accent, color: t.accentText }}>{dailyGoal} tasks</div>
              <button onClick={() => handleGoalChange(1)} className="w-9 h-9 rounded-lg flex items-center justify-center text-xl font-bold" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}>+</button>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <span style={{ position: "absolute", left: -52, top: 14, fontSize: 28, transform: "rotate(-15deg)" }}>🐝</span>
              <span style={{ position: "absolute", right: -52, top: 14, fontSize: 28, transform: "rotate(15deg)" }}>🐝</span>
              <HoneycombLiquid percent={progressPercent} accentColor={t.accent} />
              <div className="absolute text-center pointer-events-none">
                <div className="text-3xl font-black" style={{ color: t.text }}>{progressPercent}%</div>
                <div className="text-xs font-bold mt-1" style={{ color: t.textMuted }}>{countToday} / {dailyGoal} today</div>
              </div>
            </div>
            <p className="text-xs mt-4" style={{ color: t.textDim }}>Fill the honeycomb by completing your daily goal!</p>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <h2 className="text-lg font-bold mb-5" style={{ color: t.text }}>Weekly Activity</h2>
          <div className="flex items-end gap-3 h-40">
            {weeklyChartData.map((d, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                {d.count > 0 && <span className="text-xs mb-1" style={{ color: t.textDim }}>{d.count}</span>}
                <div className="w-full rounded-t-xl transition-all duration-500"
                  style={{ height: `${(d.count / maxVal) * 100}%`, minHeight: d.count > 0 ? 8 : 4, background: d.isToday ? t.accent : `${t.accent}50`, opacity: d.count === 0 ? 0.2 : 1 }} />
                <span className="text-xs mt-2 font-medium" style={{ color: d.isToday ? t.accent : t.textDim }}>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Categories */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>Top Categories</h2>
          {sortedCategories.length === 0 ? <p className="text-sm" style={{ color: t.textDim }}>No tasks yet.</p> : (
            <div className="space-y-3">
              {sortedCategories.map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between p-3 rounded-xl" style={{ background: t.surfaceHover }}>
                  <span className="font-medium text-sm" style={{ color: t.text }}>{cat}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: t.border }}>
                      <div className="h-full rounded-full" style={{ width: `${(count / totalTasks) * 100}%`, background: t.accent }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: t.accent }}>{count}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <h2 className="text-lg font-bold mb-3" style={{ color: t.text }}>Activity Summary</h2>
          <p className="text-sm" style={{ color: t.textMuted }}>You&apos;ve completed <span className="font-bold" style={{ color: t.success }}>{completedTasks}</span> out of <span className="font-bold" style={{ color: t.text }}>{totalTasks}</span> tasks so far.</p>
          <p className="text-sm mt-2" style={{ color: t.textMuted }}>Keep it up — every task fills the hive! 🍯</p>
        </div>
      </div>
    </main>
  );
}
