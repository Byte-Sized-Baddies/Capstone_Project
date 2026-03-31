// app/archive/page.tsx
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

type Priority = "Low" | "Medium" | "High";
interface ArchivedTask {
  id: number; text: string; description: string; due: string;
  done: boolean; priority: Priority; category: string;
  categoryId: number | null; created: number; archivedAt?: string;
}

const intToPriority = (v: number): Priority => v === 2 ? "High" : v === 1 ? "Medium" : "Low";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞", active: false },
  { href: "/calendar", label: "Calendar", icon: "📅", active: false },
  { href: "/folders", label: "Folders", icon: "📁", active: false },
  { href: "/statistics", label: "Statistics", icon: "📊", active: false },
  { href: "/archive", label: "Archive", icon: "📦", active: true },
  { href: "/timeblocking", label: "Time Block", icon: "⏱", active: false },
  { href: "/notes", label: "Notes", icon: "📝", active: false },
  { href: "/integrations", label: "Integrations", icon: "🔌", active: false },
  { href: "/settings", label: "Settings", icon: "⚙️", active: false },
];

export default function ArchivePage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [authReady, setAuthReady] = useState(false);
  const [displayName, setDisplayName] = useState("User");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [tasks, setTasks] = useState<ArchivedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "alpha">("newest");

  useEffect(() => { const saved = localStorage.getItem("theme"); if (saved) setIsDark(saved === "dark"); }, []);
  const toggleTheme = () => setIsDark(prev => { localStorage.setItem("theme", !prev ? "dark" : "light"); return !prev; });

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) { router.push("/login"); return; }
      const user = data.session.user;
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
    if (a) setAvatarDataUrl(a);
    if (n) setDisplayName(n);
  }, [authReady]);

  const loadArchivedTasks = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    const { data: catRows } = await supabase.from("categories_v2").select("id, name").eq("user_id", user.id);
    const catMap = new Map((catRows ?? []).map(c => [c.id, c.name]));
    const { data, error } = await supabase.from("tasks_v2")
      .select("id, title, description, due_date, is_completed, priority, category_id, created_at, updated_at")
      .eq("user_id", user.id).eq("is_archived", true).order("updated_at", { ascending: false });
    if (error) { console.error("Archive load error:", error); setLoading(false); return; }
    setTasks((data ?? []).map(row => ({
      id: row.id, text: row.title, description: row.description ?? "",
      due: row.due_date ?? "No date", done: row.is_completed,
      priority: intToPriority(row.priority), category: catMap.get(row.category_id) ?? "Other",
      categoryId: row.category_id, created: new Date(row.created_at).getTime(), archivedAt: row.updated_at,
    })));
    setLoading(false);
  };

  useEffect(() => { if (authReady) loadArchivedTasks(); }, [authReady]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    ["tasks", "folders", "categories", "avatar", "displayName", "userEmail"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  const getInitials = (name = displayName) => name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  const restoreTask = async (id: number) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    await supabase.from("tasks_v2").update({ is_archived: false }).eq("id", id).eq("user_id", user.id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const restoreSelected = async () => {
    if (selected.size === 0) return;
    setActionLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setActionLoading(false); return; }
    await supabase.from("tasks_v2").update({ is_archived: false }).in("id", [...selected]).eq("user_id", user.id);
    setTasks(prev => prev.filter(t => !selected.has(t.id)));
    setSelected(new Set()); setActionLoading(false);
  };

  const deleteTask = async (id: number) => {
    if (!confirm("Permanently delete this task? This cannot be undone.")) return;
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    await supabase.from("tasks_v2").delete().eq("id", id).eq("user_id", user.id);
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} task${selected.size !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    setActionLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setActionLoading(false); return; }
    await supabase.from("tasks_v2").delete().in("id", [...selected]).eq("user_id", user.id);
    setTasks(prev => prev.filter(t => !selected.has(t.id)));
    setSelected(new Set()); setActionLoading(false);
  };

  const clearAllArchived = async () => {
    if (!confirm(`Permanently delete all ${tasks.length} archived tasks? This cannot be undone.`)) return;
    setActionLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setActionLoading(false); return; }
    await supabase.from("tasks_v2").delete().eq("user_id", user.id).eq("is_archived", true);
    setTasks([]); setSelected(new Set()); setActionLoading(false);
  };

  const toggleSelect = (id: number) => setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  const selectAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(t => t.id))); };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = tasks.filter(t => !q || `${t.text} ${t.description} ${t.category}`.toLowerCase().includes(q));
    return result.sort((a, b) => {
      if (sortBy === "newest") return b.created - a.created;
      if (sortBy === "oldest") return a.created - b.created;
      return a.text.localeCompare(b.text);
    });
  }, [tasks, search, sortBy]);

  const priorityColors = (priority: Priority) => isDark ? {
    High: { bg: "#ef444430", text: "#f87171", dot: "#ef4444" },
    Medium: { bg: "#FFC10730", text: "#FFC107", dot: "#FFC107" },
    Low: { bg: "#22c55e30", text: "#4ade80", dot: "#22c55e" },
  }[priority] : {
    High: { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
    Medium: { bg: "#fef9c3", text: "#a16207", dot: "#eab308" },
    Low: { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
  }[priority];

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .slide-up { animation: slideUp 0.35s ease-out forwards; }
    .fade-in { animation: fadeIn 0.25s ease-out forwards; }
    .task-row { transition: opacity 0.15s ease; }
    .task-row:hover { opacity: 0.95; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
    select option { background: ${t.surface}; color: ${t.text}; }
  `;

  if (!authReady) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
      <div className="text-center"><div className="text-5xl mb-4">🐝</div><div className="text-sm font-medium" style={{ color: t.textDim }}>Loading your archive...</div></div>
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
            <div className="text-lg font-bold" style={{ color: t.text }}>Archive</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>{isDark ? "☀️" : "🌙"}</button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: t.accent, color: t.accentText }}>
            {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" /> : getInitials()}
          </div>
        </div>
      </header>

      <div className="p-6 max-w-4xl mx-auto slide-up">
        {/* Info banner */}
        <div className="mb-6 p-4 rounded-2xl flex items-center gap-3" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <span className="text-2xl">📦</span>
          <div>
            <div className="text-sm font-semibold" style={{ color: t.text }}>Task Archive</div>
            <div className="text-xs" style={{ color: t.textDim }}>Archived tasks are hidden from your dashboard. Restore them anytime or delete permanently.</div>
          </div>
          <div className="ml-auto text-right flex-shrink-0">
            <div className="text-2xl font-bold" style={{ color: t.accent }}>{tasks.length}</div>
            <div className="text-xs" style={{ color: t.textDim }}>archived</div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-48" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={t.textDim} strokeWidth="2" /><path d="M20 20l-3-3" stroke={t.textDim} strokeWidth="2" strokeLinecap="round" /></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search archived tasks..." className="bg-transparent outline-none text-sm flex-1" style={{ color: t.text }} />
            {search && <button onClick={() => setSearch("")} style={{ color: t.textDim, fontSize: 12 }}>✕</button>}
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="px-3 py-2 rounded-xl text-sm outline-none" style={{ background: t.surface, color: t.text, border: `1px solid ${t.border}` }}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="alpha">A–Z</option>
          </select>
          {selected.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2" style={{ color: t.textMuted }}>{selected.size} selected</span>
              <button onClick={restoreSelected} disabled={actionLoading} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: t.success + "20", color: t.success }}>{actionLoading ? "…" : "↩ Restore"}</button>
              <button onClick={deleteSelected} disabled={actionLoading} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: t.danger + "20", color: t.danger }}>{actionLoading ? "…" : "🗑 Delete"}</button>
            </div>
          )}
          {tasks.length > 0 && selected.size === 0 && (
            <button onClick={clearAllArchived} disabled={actionLoading} className="px-3 py-2 rounded-xl text-xs font-medium ml-auto" style={{ background: t.danger + "15", color: t.danger }}>Clear all</button>
          )}
        </div>

        {/* Select all bar */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 mb-3 px-1">
            <button onClick={selectAll} className="flex items-center gap-2 text-xs font-medium" style={{ color: t.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              <div className="w-4 h-4 rounded border-2 flex items-center justify-center"
                style={{ borderColor: selected.size === filtered.length && filtered.length > 0 ? t.accent : t.borderStrong, background: selected.size === filtered.length && filtered.length > 0 ? t.accent : "transparent" }}>
                {selected.size === filtered.length && filtered.length > 0 && (
                  <svg width="9" height="9" viewBox="0 0 9 9"><path d="M1.5 4.5l2 2 4-4" stroke={t.accentText} strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>
                )}
              </div>
              {selected.size === filtered.length && filtered.length > 0 ? "Deselect all" : "Select all"}
            </button>
            <span className="text-xs" style={{ color: t.textDim }}>{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* Task list */}
        {loading ? (
          <div className="py-20 text-center"><div className="text-3xl mb-3">⏳</div><p className="text-sm" style={{ color: t.textDim }}>Loading archive...</p></div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: t.text }}>{search ? "No matching tasks" : "Archive is empty"}</h3>
            <p className="text-sm" style={{ color: t.textDim }}>{search ? "Try a different search term" : "Tasks you archive will appear here"}</p>
            <button onClick={() => router.push("/dashboard")} className="mt-6 px-6 py-3 rounded-xl text-sm font-bold" style={{ background: t.accent, color: t.accentText }}>Go to Dashboard</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(task => {
              const pc = priorityColors(task.priority);
              const isSelected = selected.has(task.id);
              return (
                <div key={task.id} className="task-row p-4 rounded-2xl flex items-start gap-3"
                  style={{ background: t.surface, border: `2px solid ${isSelected ? t.accent : t.border}`, opacity: 0.85, transition: "border-color 0.15s ease" }}>
                  <button onClick={() => toggleSelect(task.id)} className="mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: isSelected ? t.accent : t.borderStrong, background: isSelected ? t.accent : "transparent" }}>
                    {isSelected && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2 2 4-4" stroke={t.accentText} strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm line-through truncate" style={{ color: t.textMuted }}>{task.text}</h3>
                        {task.description && <p className="text-xs mt-0.5 truncate" style={{ color: t.textDim }}>{task.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: pc.bg, color: pc.text }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: pc.dot }} />{task.priority}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: t.surfaceHover, color: t.accent }}>{task.category}</span>
                          {task.due !== "No date" && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: t.surfaceHover, color: t.textDim }}>📅 {task.due}</span>}
                          {task.done && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: t.success + "20", color: t.success }}>✓ Completed</span>}
                          {task.archivedAt && <span className="text-xs" style={{ color: t.textDim }}>Archived {new Date(task.archivedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => restoreTask(task.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: t.success + "20", color: t.success }} title="Restore to dashboard">↩ Restore</button>
                        <button onClick={() => deleteTask(task.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: t.danger + "20", color: t.danger }} title="Delete permanently">🗑</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}