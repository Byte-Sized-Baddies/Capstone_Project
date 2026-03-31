// app/folders/page.tsx
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

type Collaborator = { user_id: string; email: string; role: string };
type Folder = {
  id: number; name: string; color: string; owner: string;
  isOwner: boolean; taskCount: number; collaborators: Collaborator[];
};

const FOLDER_COLORS = ["#FFC107","#22c55e","#3b82f6","#a855f7","#ef4444","#f97316","#ec4899","#14b8a6"];

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞", active: false },
  { href: "/calendar", label: "Calendar", icon: "📅", active: false },
  { href: "/folders", label: "Folders", icon: "📁", active: true },
  { href: "/statistics", label: "Statistics", icon: "📊", active: false },
  { href: "/archive", label: "Archive", icon: "📦", active: false },
  { href: "/timeblocking", label: "Time Block", icon: "⏱", active: false },
  { href: "/notes", label: "Notes", icon: "📝", active: false },
  { href: "/integrations", label: "Integrations", icon: "🔌", active: false },
  { href: "/settings", label: "Settings", icon: "⚙️", active: false },
];

export default function FoldersPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [displayName, setDisplayName] = useState("User");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeFolder, setActiveFolder] = useState<Folder | null>(null);

  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0]);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState<string | null>(null);

  useEffect(() => { const saved = localStorage.getItem("theme"); if (saved) setIsDark(saved === "dark"); }, []);
  const toggleTheme = () => setIsDark(prev => { localStorage.setItem("theme", !prev ? "dark" : "light"); return !prev; });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await getSessionSafe();
        if (error || !data.session) { router.push("/login"); return; }
        const user = data.session.user;
        setUserEmail(user.email ?? "");
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
        setDisplayName(name);
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
    if (a) setAvatarDataUrl(a);
    if (n) setDisplayName(n);
  }, [authReady]);

  const loadFolders = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;
    const { data: ownedRows } = await supabase.from("folders").select("id, user_id, name, color, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
    const { data: memberRows } = await supabase.from("folder_members").select("folder_id").eq("user_id", user.id);
    const sharedIds = [...new Set((memberRows ?? []).map((r: any) => r.folder_id))];
    const ownedIds = new Set((ownedRows ?? []).map((r: any) => r.id));
    const onlySharedIds = sharedIds.filter(id => !ownedIds.has(id));
    let sharedRows: any[] = [];
    if (onlySharedIds.length > 0) {
      const { data } = await supabase.from("folders").select("id, user_id, name, color, created_at").in("id", onlySharedIds).order("created_at", { ascending: false });
      sharedRows = data ?? [];
    }
    const allRows = [...(ownedRows ?? []), ...sharedRows];
    const { data: taskData } = await supabase.from("tasks_v2").select("id, folder_id").eq("user_id", user.id);
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
      id: row.id, name: row.name, color: row.color ?? FOLDER_COLORS[0],
      owner: row.user_id, isOwner: row.user_id === user.id,
      taskCount: taskCounts.get(row.id) ?? 0, collaborators: collaboratorsMap.get(row.id) ?? [],
    })));
    setLoading(false);
  };

  useEffect(() => { if (authReady) loadFolders(); }, [authReady]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    ["tasks", "folders", "categories", "avatar", "displayName", "userEmail"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  const getInitials = (name = displayName) => name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return alert("Please enter a folder name");
    setActionLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setActionLoading(false); return; }
    const { data, error } = await supabase.from("folders").insert({ name, color: newFolderColor, user_id: user.id }).select("id, name, color, created_at").single();
    if (error || !data) { alert(`Failed to create: ${error?.message}`); setActionLoading(false); return; }
    setFolders(prev => [{ id: data.id, name: data.name, color: data.color ?? newFolderColor, owner: user.id, isOwner: true, taskCount: 0, collaborators: [] }, ...prev]);
    setNewFolderName(""); setNewFolderColor(FOLDER_COLORS[0]); setShowCreateModal(false); setActionLoading(false);
  };

  const openEditModal = (folder: Folder) => { setActiveFolder(folder); setEditName(folder.name); setEditColor(folder.color); setShowEditModal(true); };

  const saveEdit = async () => {
    if (!activeFolder) return;
    const name = editName.trim();
    if (!name) return alert("Please enter a name");
    setActionLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setActionLoading(false); return; }
    const { error } = await supabase.from("folders").update({ name, color: editColor }).eq("id", activeFolder.id).eq("user_id", user.id);
    if (error) { alert(`Failed to save: ${error.message}`); setActionLoading(false); return; }
    setFolders(prev => prev.map(f => f.id === activeFolder.id ? { ...f, name, color: editColor } : f));
    setShowEditModal(false); setActiveFolder(null); setActionLoading(false);
  };

  const deleteFolder = async (folder: Folder) => {
    if (!confirm(`Delete "${folder.name}"? Tasks will be moved to All Tasks.`)) return;
    setActionLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setActionLoading(false); return; }
    await supabase.from("tasks_v2").update({ folder_id: null }).eq("folder_id", folder.id).eq("user_id", user.id);
    await supabase.from("folder_members").delete().eq("folder_id", folder.id);
    const { error } = await supabase.from("folders").delete().eq("id", folder.id).eq("user_id", user.id);
    if (error) alert(`Failed to delete: ${error.message}`);
    else setFolders(prev => prev.filter(f => f.id !== folder.id));
    setActionLoading(false);
  };

  const leaveFolder = async (folder: Folder) => {
    if (!confirm(`Leave "${folder.name}"?`)) return;
    setActionLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) { setActionLoading(false); return; }
    const { error } = await supabase.from("folder_members").delete().eq("folder_id", folder.id).eq("user_id", user.id);
    if (error) alert(`Failed to leave: ${error.message}`);
    else setFolders(prev => prev.filter(f => f.id !== folder.id));
    setActionLoading(false);
  };

  const openShareModal = (folder: Folder) => { setActiveFolder(folder); setShareEmail(""); setShowShareModal(true); };

  const addCollaborator = async () => {
    if (!activeFolder) return;
    const email = shareEmail.trim().toLowerCase();
    if (!email) return alert("Please enter an email");
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return alert("Please enter a valid email");
    if (email === userEmail.toLowerCase()) return alert("You can't share with yourself");
    if (activeFolder.collaborators.find(c => c.email.toLowerCase() === email)) return alert("Already has access");
    setShareLoading(true);
    const { data: invitedUser, error: lookupError } = await supabase.from("profiles").select("id, email").eq("email", email).single();
    if (lookupError || !invitedUser) { setShareLoading(false); return alert("No account found with that email"); }
    const { error } = await supabase.from("folder_members").insert({ folder_id: activeFolder.id, user_id: invitedUser.id, role: "editor" });
    if (error) { alert(`Failed to share: ${error.message}`); }
    else {
      const updated = { ...activeFolder, collaborators: [...activeFolder.collaborators, { user_id: invitedUser.id, email: invitedUser.email, role: "editor" }] };
      setActiveFolder(updated);
      setFolders(prev => prev.map(f => f.id === activeFolder.id ? updated : f));
      setShareEmail("");
    }
    setShareLoading(false);
  };

  const removeCollaborator = async (collabUserId: string, collabEmail: string) => {
    if (!activeFolder) return;
    if (!confirm(`Remove ${collabEmail}?`)) return;
    setRemoveLoading(collabUserId);
    const { error } = await supabase.from("folder_members").delete().eq("folder_id", activeFolder.id).eq("user_id", collabUserId);
    if (error) alert(`Failed to remove: ${error.message}`);
    else {
      const updated = { ...activeFolder, collaborators: activeFolder.collaborators.filter(c => c.user_id !== collabUserId) };
      setActiveFolder(updated);
      setFolders(prev => prev.map(f => f.id === activeFolder.id ? updated : f));
    }
    setRemoveLoading(null);
  };

  const inputStyle = { background: t.inputBg, color: t.text, border: `1px solid ${t.border}` };

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .slide-up { animation: slideUp 0.35s ease-out forwards; }
    .fade-in { animation: fadeIn 0.25s ease-out forwards; }
    .modal-in { animation: modalIn 0.22s ease-out forwards; }
    .folder-tile { transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .folder-tile:hover { transform: translateY(-2px); }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
    input:focus { outline: none; border-color: ${t.accent} !important; }
  `;

  if (!authReady) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
      <div className="text-center"><div className="text-5xl mb-4">🐝</div><div className="text-sm font-medium" style={{ color: t.textDim }}>Loading folders...</div></div>
    </div>
  );

  const ownedFolders = folders.filter(f => f.isOwner);
  const sharedFolders = folders.filter(f => !f.isOwner);

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
            <div className="text-lg font-bold" style={{ color: t.text }}>Folders</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>{isDark ? "☀️" : "🌙"}</button>
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2" style={{ background: t.accent, color: t.accentText }}>+ New Folder</button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: t.accent, color: t.accentText }}>
            {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" /> : getInitials()}
          </div>
        </div>
      </header>

      <div className="p-6 max-w-6xl mx-auto slide-up">
        {loading ? (
          <div className="py-24 text-center"><div className="text-4xl mb-4">📁</div><p className="text-sm" style={{ color: t.textDim }}>Loading folders...</p></div>
        ) : folders.length === 0 ? (
          <div className="py-24 text-center rounded-3xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-6xl mb-4">📂</div>
            <h2 className="text-xl font-bold mb-2" style={{ color: t.text }}>No folders yet</h2>
            <p className="text-sm mb-8" style={{ color: t.textDim }}>Create a folder to organize your tasks and share them with others</p>
            <button onClick={() => setShowCreateModal(true)} className="px-6 py-3 rounded-xl text-sm font-bold" style={{ background: t.accent, color: t.accentText }}>+ Create First Folder</button>
          </div>
        ) : (
          <div className="space-y-8">
            {ownedFolders.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>My Folders ({ownedFolders.length})</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ownedFolders.map(folder => (
                    <FolderTile key={folder.id} folder={folder} t={t}
                      onView={() => router.push(`/dashboard?folder=${folder.id}`)}
                      onEdit={() => openEditModal(folder)}
                      onShare={() => openShareModal(folder)}
                      onDelete={() => deleteFolder(folder)} />
                  ))}
                  <button onClick={() => setShowCreateModal(true)}
                    className="folder-tile flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed min-h-[180px]"
                    style={{ borderColor: t.borderStrong, color: t.textDim, background: "transparent" }}>
                    <span className="text-3xl">+</span>
                    <span className="text-sm font-medium">New Folder</span>
                  </button>
                </div>
              </section>
            )}
            {sharedFolders.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>Shared With Me ({sharedFolders.length})</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedFolders.map(folder => (
                    <FolderTile key={folder.id} folder={folder} t={t}
                      onView={() => router.push(`/dashboard?folder=${folder.id}`)}
                      onLeave={() => leaveFolder(folder)} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 fade-in" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl p-6 modal-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: t.text }}>Create New Folder</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: t.textDim }}>Folder Name</label>
                <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") createFolder(); }} placeholder="e.g. Work Projects" autoFocus className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-3" style={{ color: t.textDim }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {FOLDER_COLORS.map(color => (
                    <button key={color} onClick={() => setNewFolderColor(color)} className="w-8 h-8 rounded-full transition-all"
                      style={{ background: color, outline: newFolderColor === color ? `3px solid ${t.text}` : "none", outlineOffset: 2 }} />
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: t.surfaceHover }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: newFolderColor + "30", border: `2px solid ${newFolderColor}` }}>📁</div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: t.text }}>{newFolderName || "Folder Name"}</div>
                  <div className="text-xs" style={{ color: t.textDim }}>0 tasks</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: t.surfaceHover, color: t.textMuted }}>Cancel</button>
              <button onClick={createFolder} disabled={actionLoading} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: t.accent, color: t.accentText }}>{actionLoading ? "Creating…" : "Create Folder"}</button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && activeFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 fade-in" onClick={() => setShowEditModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl p-6 modal-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: t.text }}>Edit Folder</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: t.textDim }}>Folder Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveEdit(); }} autoFocus className="w-full px-4 py-3 rounded-xl text-sm" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-3" style={{ color: t.textDim }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {FOLDER_COLORS.map(color => (
                    <button key={color} onClick={() => setEditColor(color)} className="w-8 h-8 rounded-full transition-all"
                      style={{ background: color, outline: editColor === color ? `3px solid ${t.text}` : "none", outlineOffset: 2 }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: t.surfaceHover, color: t.textMuted }}>Cancel</button>
              <button onClick={saveEdit} disabled={actionLoading} className="flex-1 py-3 rounded-xl text-sm font-bold" style={{ background: t.accent, color: t.accentText }}>{actionLoading ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {showShareModal && activeFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 fade-in" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl p-6 modal-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: t.text }}>Share Folder</h2>
                <p className="text-xs mt-0.5" style={{ color: t.textDim }}>{activeFolder.name}</p>
              </div>
              <button onClick={() => setShowShareModal(false)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: t.surfaceHover, color: t.textMuted }}>✕</button>
            </div>
            <div className="mb-5">
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: t.textDim }}>Invite by Email</label>
              <div className="flex gap-2">
                <input value={shareEmail} onChange={e => setShareEmail(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addCollaborator(); }} placeholder="email@example.com" className="flex-1 px-3 py-2.5 rounded-xl text-sm" style={inputStyle} />
                <button onClick={addCollaborator} disabled={shareLoading} className="px-4 py-2.5 rounded-xl text-sm font-bold flex-shrink-0" style={{ background: t.accent, color: t.accentText }}>{shareLoading ? "…" : "Add"}</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-3" style={{ color: t.textDim }}>People with access ({activeFolder.collaborators.length})</label>
              {activeFolder.collaborators.length === 0 ? (
                <div className="py-6 text-center rounded-xl" style={{ background: t.surfaceHover }}><p className="text-sm" style={{ color: t.textDim }}>Only you have access</p></div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {activeFolder.collaborators.map(collab => (
                    <div key={collab.user_id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: t.surfaceHover }}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: t.accent + "30", color: t.accent }}>{collab.email[0]?.toUpperCase() ?? "?"}</div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: t.text }}>{collab.email}</div>
                          <div className="text-xs capitalize" style={{ color: t.textDim }}>{collab.role}</div>
                        </div>
                      </div>
                      <button onClick={() => removeCollaborator(collab.user_id, collab.email)} disabled={removeLoading === collab.user_id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ml-2" style={{ background: t.danger + "20", color: t.danger }}>
                        {removeLoading === collab.user_id ? "…" : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function FolderTile({ folder, t, onView, onEdit, onShare, onDelete, onLeave }: {
  folder: Folder; t: typeof darkTheme;
  onView: () => void; onEdit?: () => void; onShare?: () => void; onDelete?: () => void; onLeave?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="folder-tile relative rounded-2xl overflow-hidden min-h-[180px] flex flex-col"
      style={{ background: t.surface, border: `1px solid ${t.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
      <div className="h-2 w-full" style={{ background: folder.color }} />
      <div className="flex-1 p-5 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: folder.color + "25" }}>
              {folder.isOwner ? "📁" : "🤝"}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base truncate" style={{ color: t.text }}>{folder.name}</h3>
              <p className="text-xs" style={{ color: t.textDim }}>
                {folder.taskCount} task{folder.taskCount !== 1 ? "s" : ""}
                {folder.isOwner && folder.collaborators.length > 0 && ` · ${folder.collaborators.length} member${folder.collaborators.length !== 1 ? "s" : ""}`}
                {!folder.isOwner && " · Shared with you"}
              </p>
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <button onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-colors"
              style={{ background: menuOpen ? t.surfaceHover : "transparent", color: t.textMuted }}>⋯</button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-20 w-44 rounded-xl overflow-hidden shadow-2xl"
                style={{ background: t.surface, border: `1px solid ${t.border}` }}
                onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => { onView(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2" style={{ color: t.text }}>
                  <span>👀</span> View Tasks
                </button>
                {folder.isOwner && onEdit && (
                  <button onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2" style={{ color: t.text }}>
                    <span>✎</span> Rename
                  </button>
                )}
                {folder.isOwner && onShare && (
                  <button onClick={() => { onShare(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2" style={{ color: t.text }}>
                    <span>👥</span> Share
                  </button>
                )}
                <div style={{ height: 1, background: t.border }} />
                {folder.isOwner && onDelete && (
                  <button onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2" style={{ color: t.danger }}>
                    <span>🗑</span> Delete
                  </button>
                )}
                {!folder.isOwner && onLeave && (
                  <button onClick={() => { onLeave(); setMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2" style={{ color: t.danger }}>
                    <span>🚪</span> Leave Folder
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        {folder.isOwner && folder.collaborators.length > 0 && (
          <div className="flex items-center gap-1 mb-3">
            {folder.collaborators.slice(0, 4).map((c, i) => (
              <div key={c.user_id} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2"
                style={{ background: folder.color + "40", color: folder.color, borderColor: t.surface, marginLeft: i > 0 ? -6 : 0, zIndex: 4 - i }}>
                {c.email[0]?.toUpperCase()}
              </div>
            ))}
            {folder.collaborators.length > 4 && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2"
                style={{ background: t.surfaceHover, color: t.textDim, borderColor: t.surface, marginLeft: -6 }}>
                +{folder.collaborators.length - 4}
              </div>
            )}
          </div>
        )}
        <button onClick={onView} className="mt-auto w-full py-2 rounded-xl text-xs font-bold transition-all"
          style={{ background: folder.color + "20", color: folder.color, border: `1px solid ${folder.color}40` }}>
          Open Folder →
        </button>
      </div>
    </div>
  );
}