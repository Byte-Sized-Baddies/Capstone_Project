// app/settings/page.tsx
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

type Category = { id: number; name: string };
type Collaborator = { user_id: string; email: string; role: string };
type Folder = {
  id: number; name: string; owner: string; taskCount: number;
  isOwner: boolean; collaborators: Collaborator[]; expanded: boolean;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞", active: false },
  { href: "/calendar", label: "Calendar", icon: "📅", active: false },
  { href: "/folders", label: "Folders", icon: "📁", active: false },
  { href: "/statistics", label: "Statistics", icon: "📊", active: false },
  { href: "/archive", label: "Archive", icon: "📦", active: false },
  { href: "/timeblocking", label: "Time Block", icon: "⏱", active: false },
  { href: "/notes", label: "Notes", icon: "📝", active: false },
  { href: "/integrations", label: "Integrations", icon: "🔌", active: false },
  { href: "/settings", label: "Settings", icon: "⚙️", active: true },
];

export default function SettingsPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("User");
  const [customCategories, setCustomCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [notifStatus, setNotifStatus] = useState("default");
  const [dailyGoal, setDailyGoal] = useState(5);

  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [folderLoading, setFolderLoading] = useState<number | null>(null);
  const [shareEmail, setShareEmail] = useState<Record<number, string>>({});
  const [shareLoading, setShareLoading] = useState<number | null>(null);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  useEffect(() => { const saved = localStorage.getItem("theme"); if (saved) setIsDark(saved === "dark"); }, []);
  const toggleTheme = () => setIsDark(prev => { localStorage.setItem("theme", !prev ? "dark" : "light"); return !prev; });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await getSessionSafe();
        if (error || !data.session) { router.push("/login"); return; }
        const user = data.session.user;
        setUserId(user.id);
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
        setDisplayName(name);
        localStorage.setItem("displayName", name);
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
    if (g) setDailyGoal(parseInt(g, 10));
    if (typeof Notification !== "undefined") setNotifStatus(Notification.permission);
  }, [authReady]);

  useEffect(() => { if (avatarDataUrl) localStorage.setItem("avatar", avatarDataUrl); }, [avatarDataUrl]);
  useEffect(() => { if (displayName) localStorage.setItem("displayName", displayName); }, [displayName]);

  useEffect(() => {
    if (!authReady) return;
    const loadCategories = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const { data } = await supabase.from("categories_v2").select("id, name").eq("user_id", user.id).order("id", { ascending: true });
      if (data) setCustomCategories(data);
    };
    loadCategories();
  }, [authReady]);

  const loadFolders = async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    const { data: taskData } = await supabase.from("tasks_v2").select("id, folder_id").eq("user_id", user.id);
    const { data: ownedRows } = await supabase.from("folders").select("id, user_id, name, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    const { data: memberRows } = await supabase.from("folder_members").select("folder_id").eq("user_id", user.id);
    const sharedFolderIds = [...new Set((memberRows ?? []).map((r: any) => r.folder_id))];
    const ownedIds = new Set((ownedRows ?? []).map((r: any) => r.id));
    const onlySharedIds = sharedFolderIds.filter(id => !ownedIds.has(id));
    let sharedRows: any[] = [];
    if (onlySharedIds.length > 0) {
      const { data } = await supabase.from("folders").select("id, user_id, name, created_at").in("id", onlySharedIds);
      sharedRows = data ?? [];
    }
    const allRows = [...(ownedRows ?? []), ...sharedRows];
    const taskCounts = new Map<number, number>();
    (taskData ?? []).forEach((tk: any) => { if (tk.folder_id) taskCounts.set(tk.folder_id, (taskCounts.get(tk.folder_id) ?? 0) + 1); });
    const collaboratorsMap = new Map<number, Collaborator[]>();
    if ((ownedRows ?? []).length > 0) {
      const ownedFolderIds = (ownedRows ?? []).map((r: any) => r.id);
      const { data: memberData } = await supabase.from("folder_members").select("folder_id, user_id, role").in("folder_id", ownedFolderIds);
      if (memberData && memberData.length > 0) {
        const collabUserIds = memberData.map((m: any) => m.user_id);
        const { data: profileData } = await supabase.from("profiles").select("id, email").in("id", collabUserIds);
        const profileMap = new Map((profileData ?? []).map((p: any) => [p.id, p.email]));
        memberData.forEach((m: any) => {
          if (!collaboratorsMap.has(m.folder_id)) collaboratorsMap.set(m.folder_id, []);
          collaboratorsMap.get(m.folder_id)!.push({ user_id: m.user_id, email: profileMap.get(m.user_id) ?? "Unknown", role: m.role });
        });
      }
    }
    setFolders(allRows.map(row => ({
      id: row.id, name: row.name, owner: row.user_id,
      taskCount: taskCounts.get(row.id) ?? 0, isOwner: row.user_id === user.id,
      collaborators: collaboratorsMap.get(row.id) ?? [], expanded: false,
    })));
  };

  useEffect(() => { if (authReady) loadFolders(); }, [authReady]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    ["tasks", "folders", "categories", "avatar", "displayName", "userEmail"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  const onAvatarUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getInitials = (n = displayName) => n.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase();

  const addCategory = async () => {
    const v = newCategory.trim();
    if (!v) return;
    if (customCategories.find(c => c.name.toLowerCase() === v.toLowerCase())) return alert("Category already exists");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    const { data, error } = await supabase.from("categories_v2").insert({ user_id: user.id, name: v }).select("id, name").single();
    if (error || !data) { alert(`Failed to create category: ${error?.message}`); return; }
    setCustomCategories(prev => [...prev, data]);
    setNewCategory("");
  };

  const removeCategory = async (cat: Category) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    const { error } = await supabase.from("categories_v2").delete().eq("id", cat.id).eq("user_id", user.id);
    if (error) { alert(`Failed to remove: ${error.message}`); return; }
    setCustomCategories(prev => prev.filter(c => c.id !== cat.id));
  };

  const toggleFolderExpanded = (folderId: number) => setFolders(prev => prev.map(f => f.id === folderId ? { ...f, expanded: !f.expanded } : f));

  const startEditFolder = (folder: Folder) => { setEditingFolderId(folder.id); setEditingFolderName(folder.name); };

  const saveEditFolder = async (folderId: number) => {
    const name = editingFolderName.trim();
    if (!name) return;
    setFolderLoading(folderId);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    const { error } = await supabase.from("folders").update({ name }).eq("id", folderId).eq("user_id", user.id);
    if (error) alert(`Failed to rename: ${error.message}`);
    else setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name } : f));
    setEditingFolderId(null); setFolderLoading(null);
  };

  const deleteFolder = async (folderId: number) => {
    if (!confirm("Delete this folder? Tasks inside will be moved to All Tasks.")) return;
    setFolderLoading(folderId);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setFolderLoading(null); return; }
    const res = await fetch("/api/delete-folder", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ folderId }),
    });
    const json = await res.json();
    if (!res.ok) alert(`Failed to delete: ${json.error}`);
    else setFolders(prev => prev.filter(f => f.id !== folderId));
    setFolderLoading(null);
  };

  const leaveFolder = async (folderId: number) => {
    if (!confirm("Leave this shared folder?")) return;
    setFolderLoading(folderId);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    const { error } = await supabase.from("folder_members").delete().eq("folder_id", folderId).eq("user_id", user.id);
    if (error) alert(`Failed to leave: ${error.message}`);
    else setFolders(prev => prev.filter(f => f.id !== folderId));
    setFolderLoading(null);
  };

  const addCollaborator = async (folderId: number) => {
    const email = (shareEmail[folderId] ?? "").trim().toLowerCase();
    if (!email) return alert("Please enter an email");
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return alert("Please enter a valid email");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    if (email === user.email?.toLowerCase()) return alert("You can't share with yourself");
    const folder = folders.find(f => f.id === folderId);
    if (folder?.collaborators.find(c => c.email.toLowerCase() === email)) return alert("This person already has access");
    setShareLoading(folderId);
    const { data: invitedUser, error: lookupError } = await supabase.from("profiles").select("id, email").eq("email", email).single();
    if (lookupError || !invitedUser) { setShareLoading(null); return alert("No account found with that email"); }
    const { error: insertError } = await supabase.from("folder_members").insert({ folder_id: folderId, user_id: invitedUser.id, role: "editor" });
    if (insertError) { alert(`Failed to add: ${insertError.message}`); }
    else {
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, collaborators: [...f.collaborators, { user_id: invitedUser.id, email: invitedUser.email, role: "editor" }] } : f));
      setShareEmail(prev => ({ ...prev, [folderId]: "" }));
    }
    setShareLoading(null);
  };

  const removeCollaborator = async (folderId: number, collaboratorUserId: string, collaboratorEmail: string) => {
    if (!confirm(`Remove ${collaboratorEmail}?`)) return;
    setRemoveLoading(`${folderId}-${collaboratorUserId}`);
    const { error } = await supabase.from("folder_members").delete().eq("folder_id", folderId).eq("user_id", collaboratorUserId);
    if (error) alert(`Failed to remove: ${error.message}`);
    else setFolders(prev => prev.map(f => f.id === folderId ? { ...f, collaborators: f.collaborators.filter(c => c.user_id !== collaboratorUserId) } : f));
    setRemoveLoading(null);
  };

  const enableNotifications = () => {
    Notification.requestPermission().then(p => {
      setNotifStatus(p);
      if (p === "granted") new Notification("Notifications Enabled", { body: "You will now receive task reminders." });
    });
  };

  const inputStyle = { background: t.inputBg, color: t.text, border: `1px solid ${t.border}` };

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
    .slide-up { animation: slideUp 0.35s ease-out forwards; }
    .fade-in { animation: fadeIn 0.25s ease-out forwards; }
    .slide-down { animation: slideDown 0.2s ease-out forwards; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
    input:focus { outline: none; border-color: ${t.accent} !important; }
  `;

  if (!authReady) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
      <div className="text-center"><div className="text-5xl mb-4">🐝</div><div className="text-sm font-medium" style={{ color: t.textDim }}>Loading your hive...</div></div>
    </div>
  );

  const ownedFolders = folders.filter(f => f.isOwner);
  const sharedFolders = folders.filter(f => !f.isOwner);

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
            <div className="relative">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" /> :
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: t.accent, color: t.accentText }}>{getInitials()}</div>}
              <label htmlFor="avatar-sidebar" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer text-xs" style={{ background: t.border, color: t.textMuted }}>✎</label>
              <input id="avatar-sidebar" type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onAvatarUpload(f); }} />
            </div>
            <div className="text-sm font-semibold" style={{ color: t.text }}>{displayName}</div>
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
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>DO BEE</div>
            <div className="text-xl font-bold" style={{ color: t.text }}>Settings</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>{isDark ? "☀️" : "🌙"}</button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: t.accent, color: t.accentText }}>
            {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" /> : getInitials()}
          </div>
        </div>
      </header>

      <div className="p-6 max-w-3xl mx-auto space-y-5 slide-up">

        {/* Profile */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: t.textDim }}>Profile</div>
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-20 h-20 rounded-full object-cover" /> :
                <div className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold" style={{ background: t.accent, color: t.accentText }}>{getInitials()}</div>}
              <label htmlFor="avatar-main" className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer text-xs shadow" style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted }}>✎</label>
              <input id="avatar-main" type="file" accept="image/*" className="hidden" onChange={e => onAvatarUpload(e.target.files?.[0])} />
            </div>
            <div className="flex-1">
              <label className="text-sm font-semibold uppercase tracking-wider block mb-2" style={{ color: t.textDim }}>Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: t.textDim }}>Appearance</div>
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: t.surfaceHover }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: t.text }}>{isDark ? "Dark Mode" : "Light Mode"}</div>
              <div className="text-xs" style={{ color: t.textDim }}>{isDark ? "Easy on the eyes at night" : "Bright and cheerful"}</div>
            </div>
            <button onClick={toggleTheme} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold" style={{ background: t.accent, color: t.accentText }}>
              {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>
        </div>

        {/* Daily Goal */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: t.textDim }}>Daily Goal</div>
          <p className="text-sm mb-4" style={{ color: t.textMuted }}>Set how many tasks you want to complete each day. Used in Dashboard and Statistics.</p>
          <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: t.surfaceHover }}>
            <button onClick={() => { const v = Math.max(1, dailyGoal - 1); setDailyGoal(v); localStorage.setItem("dailyGoal", String(v)); }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}>−</button>
            <div className="flex-1 text-center">
              <div className="text-3xl font-bold" style={{ color: t.accent }}>{dailyGoal}</div>
              <div className="text-xs" style={{ color: t.textDim }}>tasks per day</div>
            </div>
            <button onClick={() => { const v = Math.min(50, dailyGoal + 1); setDailyGoal(v); localStorage.setItem("dailyGoal", String(v)); }}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.text }}>+</button>
          </div>
        </div>

        {/* Notifications */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: t.textDim }}>Notifications</div>
          <p className="text-sm mb-4" style={{ color: t.textMuted }}>Enable notifications for reminders and task completion alerts.</p>
          <div className="flex gap-3">
            <button onClick={enableNotifications}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: notifStatus === "granted" ? t.success + "20" : t.surfaceHover, color: notifStatus === "granted" ? t.success : t.textMuted, border: `1px solid ${notifStatus === "granted" ? t.success + "40" : t.border}` }}>
              {notifStatus === "granted" ? "✓ Enabled" : "Enable Notifications"}
            </button>
            <button onClick={() => { if (Notification.permission === "denied") alert("Notifications are blocked."); else if (Notification.permission === "default") enableNotifications(); else new Notification("Test Notification", { body: "This is a test!" }); }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ background: t.accent, color: t.accentText }}>Test</button>
          </div>
          <div className="text-xs mt-3" style={{ color: t.textDim }}>Status: <span style={{ color: t.textMuted }}>{notifStatus}</span></div>
        </div>

        {/* Custom Categories */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: t.textDim }}>Custom Categories</div>
          <div className="flex gap-2 mb-4">
            <input value={newCategory} onChange={e => setNewCategory(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addCategory(); }} placeholder="New category name..." className="flex-1 px-4 py-2.5 rounded-xl text-sm" style={inputStyle} />
            <button onClick={addCategory} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: t.accent, color: t.accentText }}>Add</button>
          </div>
          {customCategories.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: t.textDim }}>No custom categories yet.</p>
          ) : (
            <div className="space-y-2">
              {customCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: t.surfaceHover }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: t.accent }} />
                    <span className="text-sm font-medium" style={{ color: t.text }}>{cat.name}</span>
                  </div>
                  <button onClick={() => removeCategory(cat)} className="text-xs px-3 py-1 rounded-lg" style={{ background: t.danger + "20", color: t.danger }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Folders */}
        <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>My Folders</div>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: t.surfaceHover, color: t.textMuted }}>{ownedFolders.length} folder{ownedFolders.length !== 1 ? "s" : ""}</span>
          </div>
          {ownedFolders.length === 0 ? (
            <div className="py-8 text-center">
              <div className="text-3xl mb-2">📂</div>
              <p className="text-sm" style={{ color: t.textDim }}>No folders yet. <a href="/folders" style={{ color: t.accent }}>Create one →</a></p>
            </div>
          ) : (
            <div className="space-y-3">
              {ownedFolders.map(folder => (
                <div key={folder.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
                  <div className="p-4" style={{ background: t.surfaceHover }}>
                    {editingFolderId === folder.id ? (
                      <div className="flex items-center gap-2">
                        <input value={editingFolderName} onChange={e => setEditingFolderName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEditFolder(folder.id); if (e.key === "Escape") setEditingFolderId(null); }}
                          autoFocus className="flex-1 px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                        <button onClick={() => saveEditFolder(folder.id)} disabled={folderLoading === folder.id} className="px-3 py-2 rounded-lg text-xs font-bold" style={{ background: t.accent, color: t.accentText }}>{folderLoading === folder.id ? "…" : "Save"}</button>
                        <button onClick={() => setEditingFolderId(null)} className="px-3 py-2 rounded-lg text-xs" style={{ background: t.border, color: t.textMuted }}>Cancel</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <button onClick={() => toggleFolderExpanded(folder.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                          <span className="text-xl">📁</span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold" style={{ color: t.text }}>{folder.name}</div>
                            <div className="text-xs" style={{ color: t.textDim }}>{folder.taskCount} task{folder.taskCount !== 1 ? "s" : ""} · {folder.collaborators.length} collaborator{folder.collaborators.length !== 1 ? "s" : ""}</div>
                          </div>
                          <span className="text-xs ml-1" style={{ color: t.textDim }}>{folder.expanded ? "▲" : "▼"}</span>
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => startEditFolder(folder)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: t.border, color: t.textMuted }}>✎ Rename</button>
                          <button onClick={() => deleteFolder(folder.id)} disabled={folderLoading === folder.id} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: t.danger + "20", color: t.danger }}>{folderLoading === folder.id ? "…" : "🗑 Delete"}</button>
                        </div>
                      </div>
                    )}
                  </div>
                  {folder.expanded && (
                    <div className="slide-down p-4 space-y-4" style={{ background: t.surface, borderTop: `1px solid ${t.border}` }}>
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: t.textDim }}>Share With</div>
                        <div className="flex gap-2">
                          <input value={shareEmail[folder.id] ?? ""} onChange={e => setShareEmail(prev => ({ ...prev, [folder.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") addCollaborator(folder.id); }}
                            placeholder="Enter email address..." className="flex-1 px-3 py-2.5 rounded-xl text-sm" style={inputStyle} />
                          <button onClick={() => addCollaborator(folder.id)} disabled={shareLoading === folder.id} className="px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0" style={{ background: t.accent, color: t.accentText }}>{shareLoading === folder.id ? "…" : "Add"}</button>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: t.textDim }}>People with access ({folder.collaborators.length})</div>
                        {folder.collaborators.length === 0 ? (
                          <p className="text-xs py-3 text-center" style={{ color: t.textDim }}>No one else has access yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {folder.collaborators.map(collab => {
                              const removeKey = `${folder.id}-${collab.user_id}`;
                              return (
                                <div key={collab.user_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: t.surfaceHover }}>
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: t.accent + "30", color: t.accent }}>{collab.email[0]?.toUpperCase() ?? "?"}</div>
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium truncate" style={{ color: t.text }}>{collab.email}</div>
                                      <div className="text-xs capitalize" style={{ color: t.textDim }}>{collab.role}</div>
                                    </div>
                                  </div>
                                  <button onClick={() => removeCollaborator(folder.id, collab.user_id, collab.email)} disabled={removeLoading === removeKey}
                                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ml-2" style={{ background: t.danger + "20", color: t.danger }}>
                                    {removeLoading === removeKey ? "…" : "Remove"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shared With Me */}
        {sharedFolders.length > 0 && (
          <div className="p-6 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>Shared With Me</div>
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: t.surfaceHover, color: t.textMuted }}>{sharedFolders.length} folder{sharedFolders.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="space-y-3">
              {sharedFolders.map(folder => (
                <div key={folder.id} className="p-4 rounded-xl flex items-center justify-between gap-3" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl">🤝</span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: t.text }}>{folder.name}</div>
                      <div className="text-xs" style={{ color: t.textDim }}>{folder.taskCount} task{folder.taskCount !== 1 ? "s" : ""} · Shared with you</div>
                    </div>
                  </div>
                  <button onClick={() => leaveFolder(folder.id)} disabled={folderLoading === folder.id} className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0" style={{ background: t.danger + "20", color: t.danger }}>
                    {folderLoading === folder.id ? "…" : "Leave"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}