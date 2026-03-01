// app/statistics/page.tsx
"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../auth/supabaseClient";

const LIGHT_PINK = "#ffd6e8";

function HoneycombLiquid({ percent }: { percent: number }) {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  const polyPoints = points.map((p) => p.join(",")).join(" ");
  const clipId = "hex-clip-stats";
  const fillY = cy - r + r * 2 * (1 - percent / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <clipPath id={clipId}>
          <polygon points={polyPoints} />
        </clipPath>
      </defs>
      <polygon points={polyPoints} fill="#fff6f9" stroke={LIGHT_PINK} strokeWidth="3" />
      <rect x={cx - r} y={fillY} width={r * 2} height={r * 2} fill={LIGHT_PINK} opacity="0.9" clipPath={`url(#${clipId})`} style={{ transition: "y 0.8s ease" }} />
      <polygon points={polyPoints} fill="none" stroke="#fff" strokeWidth="2" opacity="0.4" />
    </svg>
  );
}

export default function StatisticsPage() {
  const router = useRouter();

  // Auth state
  const [authReady, setAuthReady] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("User");
  const [invites, setInvites] = useState<string[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [rawSearch, setRawSearch] = useState("");
  const [dailyGoal, setDailyGoal] = useState(5);

  // ─── Session Check ────────────────────────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) { router.push("/login"); return; }

      const user = data.session.user;

      // Wipe stale cache if a different user logged in
      const cachedEmail = localStorage.getItem("userEmail");
      if (cachedEmail && cachedEmail !== user.email) {
        localStorage.removeItem("tasks");
        localStorage.removeItem("folders");
        localStorage.removeItem("categories");
        localStorage.removeItem("avatar");
        localStorage.removeItem("displayName");
        setTasks([]);
        setAvatarDataUrl(null);
      }
      localStorage.setItem("userEmail", user.email ?? "");

      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
      setDisplayName(name);
      setAuthReady(true); // ✅ auth confirmed
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(() => { checkSession(); });
    checkSession();
    return () => { authListener.subscription.unsubscribe(); };
  }, [router]);

  // ─── Load from storage (only after auth) ─────────────────────────────────
  useEffect(() => {
    if (!authReady) return; // ✅ gate

    const a = localStorage.getItem("avatar");
    const n = localStorage.getItem("displayName");
    const i = localStorage.getItem("invites");
    const t = localStorage.getItem("tasks");
    const g = localStorage.getItem("dailyGoal");

    if (a) setAvatarDataUrl(a);
    if (n) setDisplayName(n);
    if (i) { try { setInvites(JSON.parse(i)); } catch {} }
    if (t) { try { setTasks(JSON.parse(t)); } catch {} }
    if (g) setDailyGoal(Number(g));
  }, [authReady]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    ["tasks", "folders", "categories", "avatar", "displayName", "userEmail"].forEach((k) =>
      localStorage.removeItem(k)
    );
    router.push("/login");
  };

  const handleGoalChange = (delta: number) => {
    const next = Math.min(50, Math.max(1, dailyGoal + delta));
    setDailyGoal(next);
    localStorage.setItem("dailyGoal", String(next));
  };

  const getInitials = (name = displayName) =>
    name.split(" ").map((x: string) => x[0]).slice(0, 2).join("").toUpperCase();

  const inlineStyles = `
    @keyframes slideIn { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .animate-slide-in { animation: slideIn 240ms ease-out forwards; }
  `;

  // ─── Stats ────────────────────────────────────────────────────────────────
  const todayKey = new Date().toISOString().slice(0, 10);
  const completedTasksArr = tasks.filter((t) => t.done);
  const totalTasks = tasks.length;
  const completedTasks = completedTasksArr.length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  const countToday = completedTasksArr.filter((t) => t.completedAt?.startsWith(todayKey)).length;
  const progressPercent = Math.min(100, Math.round((countToday / Math.max(1, dailyGoal)) * 100));

  const categoryCounts: Record<string, number> = {};
  tasks.forEach((t) => {
    if (!categoryCounts[t.category]) categoryCounts[t.category] = 0;
    categoryCounts[t.category]++;
  });
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  const weeklyChartData = useMemo(() => {
    const labels = ["M", "T", "W", "Th", "F", "Sa", "Su"];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dKey = d.toISOString().slice(0, 10);
      const count = completedTasksArr.filter((t) => t.completedAt?.startsWith(dKey)).length;
      return { day: labels[i], count, isToday: i === 6 };
    });
  }, [completedTasksArr]);

  const maxVal = Math.max(...weeklyChartData.map((d) => d.count), 1);

  // ─── Loading screen ───────────────────────────────────────────────────────
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🐝</div>
          <div className="text-gray-500 text-sm font-medium">Loading your tasks...</div>
        </div>
      </div>
    );
  }

  return (
    <main className={`min-h-screen bg-[#fafafa] p-6 text-[#1a1a1a] transition-all ${sidebarOpen ? "ml-80" : "ml-0"}`}>
      <style>{inlineStyles}</style>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-[#FFFDF2] p-6 shadow-2xl transition-transform duration-300 rounded-r-3xl border-r border-yellow-200 overflow-y-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-extrabold">Do Bee</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg bg-[#1a1a1a] text-[#fffbe6] hover:bg-[#ffd6e8] hover:text-black transition">✕</button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          {avatarDataUrl ? (
            <img src={avatarDataUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover shadow" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center font-semibold shadow">{getInitials()}</div>
          )}
          <div className="font-medium text-sm">{displayName}</div>
        </div>

        <nav className="space-y-3 animate-slide-in mb-6">
          <a href="/dashboard" className="flex items-center gap-3 bg-white shadow px-4 py-3 rounded-xl hover:bg-[#fff8d6] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="#1a1a1a" /></svg>
            <span className="font-medium">Dashboard</span>
          </a>
          <a href="/calendar" className="flex items-center gap-3 bg-white shadow px-4 py-3 rounded-xl hover:bg-[#fff8d6] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z" fill="#1a1a1a" /></svg>
            <span className="font-medium">Calendar</span>
          </a>
          <a href="/statistics" className="flex items-center gap-3 bg-[#ffd6e8] shadow px-4 py-3 rounded-xl transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 17h4V7H3v10zm6 0h4V3H9v14zm6 0h4v-4h-4v4z" fill="#1a1a1a" /></svg>
            <span className="font-medium">Statistics</span>
          </a>
          <a href="/settings" className="flex items-center gap-3 bg-white shadow px-4 py-3 rounded-xl hover:bg-[#fff8d6] transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zM21.4 10.11c.04.29.06.58.06.89s-.02.6-.06.89l2.05 1.6a1 1 0 01.22 1.29l-1.94 3.36a1 1 0 01-1.22.44l-2.42-.97a7.4 7.4 0 01-1.55.9l-.78 2.41a1 1 0 01-.97.6h-5.26a1 1 0 01-.97-.6l-.78-2.41a7.36 7.36 0 01-1.55-.9l-2.42.97a1 1 0 01-1.22-.44L.48 13.18a1 1 0 01.22-1.29l2.05-1.6A7.3 7.3 0 013 9.11V8z" fill="#1a1a1a" /></svg>
            <span className="font-medium">Settings</span>
          </a>
        </nav>

        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Invited</h4>
          <ul className="text-xs text-[#1a1a1a] max-h-24 overflow-auto space-y-1">
            {invites.map((i) => <li key={i}>{i}</li>)}
            {invites.length === 0 && <li className="opacity-50">No invites yet</li>}
          </ul>
        </div>

        <div className="mt-auto pt-6 border-t border-yellow-200">
          <button onClick={handleLogout} className="w-full py-3 rounded-xl bg-red-100 text-red-700 font-medium hover:bg-red-200 transition shadow-sm">Logout</button>
        </div>
      </aside>

      {/* TOP BAR */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="p-3 rounded-lg bg-[#1a1a1a] text-[#fffbe6] hover:bg-[#ffd6e8] hover:text-black transition">☰</button>
            )}
            <div className="relative">
              <div className="flex items-center bg-white rounded-3xl shadow-sm px-3 py-2 focus-within:ring-2 focus-within:ring-[#f5e99f] border transition">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-60 mr-2">
                  <circle cx="11" cy="11" r="8" stroke="#6b6b6b" strokeWidth="2" fill="none" />
                  <path d="M21 21l-4.35-4.35" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>
                <input value={rawSearch} onChange={(e) => setRawSearch(e.target.value)} placeholder="Search..." className="outline-none px-2 bg-transparent w-80 md:w-96" />
                {rawSearch && <button onClick={() => setRawSearch("")} className="text-xs px-2 py-1 rounded-full hover:bg-gray-100">Clear</button>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-right">
              <div className="font-semibold">Today</div>
              <div className="text-xs">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
            </div>
            <div className="w-10 h-10 rounded-full shadow bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" /> : <span className="font-semibold">{getInitials()}</span>}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-4xl mx-auto space-y-8">

          {/* OVERVIEW CARDS */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border shadow">
              <h3 className="text-lg font-semibold">Total Tasks</h3>
              <p className="text-4xl font-extrabold mt-2">{totalTasks}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow">
              <h3 className="text-lg font-semibold">Completed</h3>
              <p className="text-4xl font-extrabold mt-2 text-green-600">{completedTasks}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border shadow">
              <h3 className="text-lg font-semibold">Completion Rate</h3>
              <p className="text-4xl font-extrabold mt-2">{completionRate}%</p>
            </div>
          </section>

          {/* DAILY GOAL + NECTAR HEXAGON */}
          <section className="bg-white rounded-2xl border shadow p-6">
            <h2 className="text-xl font-semibold mb-6 text-center">Today&apos;s Progress</h2>
            <div className="flex items-center justify-between mb-8 bg-[#fff6f9] rounded-xl p-4 border border-[#ffd6e8]">
              <div>
                <div className="font-semibold text-sm">Daily Goal</div>
                <div className="text-xs text-gray-500 mt-0.5">Tasks to complete each day</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleGoalChange(-1)} className="w-9 h-9 rounded-lg bg-white border border-[#ffd6e8] text-xl font-bold flex items-center justify-center hover:bg-[#ffd6e8] transition">−</button>
                <div className="bg-[#ffd6e8] rounded-lg px-5 py-2 min-w-[90px] text-center font-bold text-sm">{dailyGoal} tasks</div>
                <button onClick={() => handleGoalChange(1)} className="w-9 h-9 rounded-lg bg-white border border-[#ffd6e8] text-xl font-bold flex items-center justify-center hover:bg-[#ffd6e8] transition">+</button>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <span style={{ position: "absolute", left: -52, top: 14, fontSize: 28, transform: "rotate(-15deg)" }}>🐝</span>
                <span style={{ position: "absolute", right: -52, top: 14, fontSize: 28, transform: "rotate(15deg)" }}>🐝</span>
                <HoneycombLiquid percent={progressPercent} />
                <div className="absolute text-center pointer-events-none">
                  <div className="text-3xl font-black text-[#1a1a1a]">{progressPercent}%</div>
                  <div className="text-xs font-bold text-gray-500 mt-1">{countToday} / {dailyGoal} today</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-4">Fill the honeycomb by completing your daily goal!</p>
            </div>
          </section>

          {/* WEEKLY PROGRESS GRAPH */}
          <section className="bg-white p-6 rounded-2xl border shadow">
            <h2 className="text-xl font-semibold mb-4">Weekly Activity</h2>
            <div className="flex items-end gap-3 h-40">
              {weeklyChartData.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  {d.count > 0 && <span className="text-xs text-gray-400 mb-1">{d.count}</span>}
                  <div
                    className="w-full rounded-t-xl transition-all duration-500"
                    style={{ height: `${(d.count / maxVal) * 100}%`, minHeight: d.count > 0 ? 8 : 0, background: d.isToday ? "#f9a8c9" : LIGHT_PINK, opacity: d.count === 0 ? 0.2 : 1 }}
                  />
                  <span className={`text-xs mt-2 ${d.isToday ? "font-bold text-pink-500" : "text-gray-400"}`}>{d.day}</span>
                </div>
              ))}
            </div>
          </section>

          {/* TOP CATEGORIES */}
          <section className="bg-white p-6 rounded-2xl border shadow">
            <h2 className="text-xl font-semibold mb-4">Top Categories</h2>
            {sortedCategories.length === 0 && <p className="text-sm opacity-70">No tasks yet.</p>}
            <ul className="space-y-3">
              {sortedCategories.map(([cat, count]) => (
                <li key={cat} className="flex items-center justify-between bg-[#fff6f9] p-3 rounded-xl border">
                  <span className="font-medium">{cat}</span>
                  <span className="text-sm opacity-80">{count} tasks</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ACTIVITY SUMMARY */}
          <section className="bg-white p-6 rounded-2xl border shadow">
            <h2 className="text-xl font-semibold mb-3">Activity Summary</h2>
            <p className="text-sm opacity-80">You&apos;ve completed <b>{completedTasks}</b> out of <b>{totalTasks}</b> tasks so far.</p>
            <p className="text-sm opacity-80 mt-2">Keep it up — every task fills the hive! 🍯</p>
          </section>

        </div>
      </div>
    </main>
  );
}
