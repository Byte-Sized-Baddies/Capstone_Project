// app/statistics/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { handleLogout } from "../auth/auth"; // adjust path
import { useRouter } from "next/navigation";
import { supabase } from "../auth/supabaseClient";

const LIGHT_PINK = "#ffd6e8";

export default function StatisticsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("User");

  const [invites, setInvites] = useState<string[]>([]);

  type Task = {
    category: string;
    done: boolean;
  };
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rawSearch, setRawSearch] = useState("");

  const [loading, setLoading] = useState(true);

  // Session Check
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.push("/login");
        return;
      }
      setLoading(false);
      const user = data.session.user;
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
      setDisplayName(name);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });

    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // ---------------------------------
  // LOAD FROM LOCAL STORAGE
  // ---------------------------------
  useEffect(() => {
    const a = localStorage.getItem("avatar");
    const n = localStorage.getItem("displayName");
    const i = localStorage.getItem("invites");
    const t = localStorage.getItem("tasks");

    if (a) setAvatarDataUrl(a);
    if (n) setDisplayName(n);
    if (i) try { setInvites(JSON.parse(i)); } catch {}
    if (t) try { setTasks(JSON.parse(t)); } catch {}
  }, []);

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("tasks");
    localStorage.removeItem("folders");
    localStorage.removeItem("categories");
    localStorage.removeItem("avatar");
    localStorage.removeItem("displayName");
    router.push("/login");
  };

  const getInitials = (name = displayName) =>
    name.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase();

  const inlineStyles = `
    @keyframes slideIn { from { transform: translateX(-10px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .animate-slide-in { animation: slideIn 240ms ease-out forwards; }
  `;

  // ---------------------------------
  // STATISTICS COMPUTATION
  // ---------------------------------
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.done).length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Top categories
  const categoryCounts: Record<string, number> = {};
  tasks.forEach(t => {
    if (!categoryCounts[t.category]) categoryCounts[t.category] = 0;
    categoryCounts[t.category]++;
  });
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  // Fake weekly chart (7-day)
  const weeklyData = [3, 6, 4, 8, 2, 7, 5]; // Replace with real daily stats later
  const maxVal = Math.max(...weeklyData, 10);

  if (loading) {
    return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">Loading...</div>;
  }

  return (
    <main
      className={`min-h-screen bg-[#fafafa] p-6 text-[#1a1a1a] transition-all ${
        sidebarOpen ? "ml-80" : "ml-0"
      }`}
    >
      <style>{inlineStyles}</style>

      {/* SIDEBAR (IDENTICAL TO DASHBOARD + SETTINGS) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-[#FFFDF2] p-6 shadow-2xl transition-transform duration-300 rounded-r-3xl border-r border-yellow-200 overflow-y-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-extrabold">Do Bee</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg bg-[#1a1a1a] text-[#fffbe6] hover:bg-[#ffd6e8] hover:text-black transition"
          >
            ✕
          </button>
        </div>

        {/* AVATAR */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover shadow" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center font-semibold shadow">
                {getInitials()}
              </div>
            )}
          </div>

          <div>
            <div className="font-medium text-sm">{displayName}</div>
          </div>
        </div>

        {/* NAVIGATION */}
        <nav className="space-y-3 animate-slide-in mb-6">
          {/* DASHBOARD */}
          <a
            href="/dashboard"
            className="flex items-center gap-3 bg-white shadow px-4 py-3 rounded-xl hover:bg-[#fff8d6] transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="#1a1a1a"/>
            </svg>
            <span className="font-medium">Dashboard</span>
          </a>

          {/* CALENDAR */}
          <a
            href="/calendar"
            className="flex items-center gap-3 bg-white shadow px-4 py-3 rounded-xl hover:bg-[#fff8d6] transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z" fill="#1a1a1a" />
            </svg>
            <span className="font-medium">Calendar</span>
          </a>

          {/* STATISTICS (ACTIVE) */}
          <a
            href="/statistics"
            className="flex items-center gap-3 bg-[#ffd6e8] shadow px-4 py-3 rounded-xl hover:bg-[#ffd6e8] transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 17h4V7H3v10zm6 0h4V3H9v14zm6 0h4v-4h-4v4z" fill="#1a1a1a"/>
            </svg>
            <span className="font-medium">Statistics</span>
          </a>

          {/* SETTINGS */}
          <a
            href="/settings"
            className="flex items-center gap-3 bg-white shadow px-4 py-3 rounded-xl hover:bg-[#fff8d6] transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8a4 4 0 100 8 4 4 0 000-8zM21.4 10.11c.04.29.06.58.06.89s-.02.6-.06.89l2.05 1.6a1 1 0 01.22 1.29l-1.94 3.36a1 1 0 01-1.22.44l-2.42-.97a7.4 7.4 0 01-1.55.9l-.78 2.41a1 1 0 01-.97.6h-5.26a1 1 0 01-.97-.6l-.78-2.41a7.36 7.36 0 01-1.55-.9l-2.42.97a1 1 0 01-1.22-.44L.48 13.18a1 1 0 01.22-1.29l2.05-1.6A7.3 7.3 0 003 9.11V8z"
                fill="#1a1a1a"
              />
            </svg>
            <span className="font-medium">Settings</span>
          </a>
        </nav>

        {/* INVITES */}
        <div className="mb-6">
          <h4 className="text-sm font-medium mb-2">Invited</h4>
          <ul className="text-xs text-[#1a1a1a] max-h-24 overflow-auto space-y-1">
            {invites.map((i) => (
              <li key={i}>{i}</li>
            ))}
            {invites.length === 0 && <li className="opacity-50">No invites yet</li>}
          </ul>
        </div>

        {/* LOGOUT BUTTON */}
        <div className="mt-auto pt-6 border-t border-yellow-200">
          <button 
            onClick={handleLogout} 
            className="w-full py-3 rounded-xl bg-red-100 text-red-700 font-medium hover:bg-red-200 transition shadow-sm"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* TOP BAR */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-3 rounded-lg bg-[#1a1a1a] text-[#fffbe6] hover:bg-[#ffd6e8] hover:text-black transition"
              >
                ☰
              </button>
            )}

            {/* Search bar */}
            <div className="relative">
              <div className="flex items-center bg-white rounded-3xl shadow-sm px-3 py-2 focus-within:ring-2 focus-within:ring-[#f5e99f] border transition">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-60 mr-2">
                  <path d="M21 21l-4.35-4.35" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round" fill="none" />
                </svg>

                <input
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  placeholder="Search..."
                  className="outline-none px-2 bg-transparent w-80 md:w-96"
                />

                {rawSearch && (
                  <button
                    onClick={() => setRawSearch("")}
                    className="text-xs px-2 py-1 rounded-full hover:bg-gray-100"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-right">
              <div className="font-semibold">Today</div>
              <div className="text-xs">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>

            <div className="w-10 h-10 rounded-full shadow bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center">
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="font-semibold">{getInitials()}</span>
              )}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-4xl mx-auto space-y-10">

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

          {/* WEEKLY PROGRESS GRAPH */}
          <section className="bg-white p-6 rounded-2xl border shadow">
            <h2 className="text-xl font-semibold mb-4">Weekly Activity</h2>

            <div className="flex items-end gap-4 h-40">
              {weeklyData.map((val, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full rounded-t-xl bg-[#ffd6e8]"
                    style={{
                      height: `${(val / maxVal) * 100}%`,
                    }}
                  ></div>
                  <span className="text-xs mt-2">
                    {["M", "T", "W", "Th", "F", "Sa", "Su"][i]}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* TOP CATEGORIES */}
          <section className="bg-white p-6 rounded-2xl border shadow">
            <h2 className="text-xl font-semibold mb-4">Top Categories</h2>

            {sortedCategories.length === 0 && (
              <p className="text-sm opacity-70">No tasks yet.</p>
            )}

            <ul className="space-y-3">
              {sortedCategories.map(([cat, count]) => (
                <li
                  key={cat}
                  className="flex items-center justify-between bg-[#fff6f9] p-3 rounded-xl border"
                >
                  <span className="font-medium">{cat}</span>
                  <span className="text-sm opacity-80">{count} tasks</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ACTIVITY SUMMARY */}
          <section className="bg-white p-6 rounded-2xl border shadow">
            <h2 className="text-xl font-semibold mb-3">Activity Summary</h2>
            <p className="text-sm opacity-80">
              You&apos;ve completed <b>{completedTasks}</b> out of <b>{totalTasks}</b> tasks so far.  
            </p>
            <p className="text-sm opacity-80 mt-2">
              Keep it up — consistency helps build strong habits!
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
