// app/dashboard/page.tsx
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "../auth/supabaseClient";

type Status = "not_started" | "in_progress";
type Priority = "Low" | "Medium" | "High";
type PriorityFilter = "All" | Priority;
interface Task {
  id: number;
  text: string;
  description: string;
  due: string;
  done: boolean;
  status: Status;
  created: number;
  priority: Priority;
  category: string;
  categoryId: number | null;
  folderId?: number | null;
}

type Category = { id: number; name: string };

const priorityToInt = (p: Priority) =>
  p === "Low" ? 0 : p === "Medium" ? 1 : 2;

const intToPriority = (v: number): Priority =>
  v === 2 ? "High" : v === 1 ? "Medium" : "Low";

const priorityOptions: Priority[] = ["Low", "Medium", "High"];

type Folder = {
  id: number;
  name: string;
  color?: string | null;
  owner: string;
  collaborators: string[];
  created: number;
};

// ─── Theme definitions ────────────────────────────────────────────────────
const darkTheme = {
  bg: "#111113",
  surface: "#18181b",
  surfaceHover: "#27272a",
  border: "#27272a",
  borderStrong: "#3f3f46",
  text: "#fafafa",
  textMuted: "#a1a1aa",
  textDim: "#71717a",
  accent: "#FFC107",
  accentText: "#18181b",
  danger: "#ef4444",
  success: "#22c55e",
  inputBg: "#27272a",
};

const lightTheme = {
  bg: "#fffaf3",
  surface: "#ffffff",
  surfaceHover: "#fff8e6",
  border: "#f5e99f",
  borderStrong: "#e6d870",
  text: "#1a1a1a",
  textMuted: "#6b6b6b",
  textDim: "#9a9a9a",
  accent: "#f5c800",
  accentText: "#1a1a1a",
  danger: "#dc2626",
  success: "#16a34a",
  inputBg: "#fffdf2",
};

export default function DashboardPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("User");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showShareFolderModal, setShowShareFolderModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [activeFolderForShare, setActiveFolderForShare] = useState<number | null>(null);

  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("Low");
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<Status>("not_started");
  const [newTaskFolder, setNewTaskFolder] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [shareEmail, setShareEmail] = useState("");

  const [rawSearch, setRawSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | string>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | "Low" | "Medium" | "High">("All");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState("added");
  const [dailyGoal] = useState(5);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const notifiedRef = useRef(false);

  // Load theme preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setIsDark(saved === "dark");
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      localStorage.setItem("theme", !prev ? "dark" : "light");
      return !prev;
    });
  };

  // ─── Session Check ────────────────────────────────────────────────────────
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) { router.push("/login"); return; }
      const user = data.session.user;
      setUserEmail(user.email || "");
      setUserId(user.id);
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";
      setDisplayName(name);
    };
    const { data: authListener } = supabase.auth.onAuthStateChange(() => { checkSession(); });
    checkSession();
    return () => { authListener.subscription.unsubscribe(); };
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    ["tasks", "folders", "categories", "avatar", "displayName"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  useEffect(() => {
    const tm = setTimeout(() => setSearchQuery(rawSearch.trim()), 280);
    return () => clearTimeout(tm);
  }, [rawSearch]);

  useEffect(() => {
    const savedAvatar = localStorage.getItem("avatar");
    const savedName = localStorage.getItem("displayName");
    if (savedAvatar) setAvatarDataUrl(savedAvatar);
    if (savedName) setDisplayName(savedName);
    const params = new URLSearchParams(window.location.search);
    setRawSearch(params.get("q") ?? "");
    setCategoryFilter(params.get("cat") ?? "All");
    const pr = params.get("p") ?? "All";
    setPriorityFilter(priorityOptions.includes(pr as Priority) ? (pr as Priority) : "All");
    setDateFilter(params.get("d") ?? "");
    setSortBy(params.get("s") ?? "added");
  }, []);

  useEffect(() => {
    const loadCategories = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userError || !user) return;
      const { data: catRows, error: catError } = await supabase
        .from("categories_v2").select("id, name").eq("user_id", user.id).order("id", { ascending: true });
      if (catError) { console.error("Category fetch error:", catError.message); return; }
      if (catRows) {
        setCategories(catRows);
        if (catRows.length > 0) { setNewCategoryId(catRows[0].id); setNewCategory(catRows[0].name); }
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;
      const { data: catRows } = await supabase.from("categories_v2").select("id, name").eq("user_id", user.id);
      const catMap = new Map((catRows ?? []).map(c => [c.id, c.name]));
      const { data: ownTasks, error: ownError } = await supabase
        .from("tasks_v2")
        .select("id, title, description, due_date, is_completed, status, created_at, priority, category_id, folder_id, user_id")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      if (ownError) { console.error("Task load error:", ownError); return; }
      const { data: memberRows } = await supabase.from("folder_members").select("folder_id").eq("user_id", user.id);
      const sharedFolderIds = (memberRows ?? []).map(r => r.folder_id);
      let sharedTasks: any[] = [];
      if (sharedFolderIds.length > 0) {
        const { data: shared } = await supabase
          .from("tasks_v2")
          .select("id, title, description, due_date, is_completed, status, created_at, priority, category_id, folder_id, user_id")
          .in("folder_id", sharedFolderIds).order("created_at", { ascending: false });
        sharedTasks = shared ?? [];
      }
      const allRows = [...(ownTasks ?? []), ...sharedTasks];
      const seen = new Set<number>();
      const unique = allRows.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      setTasks(unique.map(row => ({
        id: row.id, text: row.title, description: row.description ?? "",
        due: row.due_date ?? "No date", done: row.is_completed,
        status: row.status as Status, created: new Date(row.created_at).getTime(),
        priority: intToPriority(row.priority), category: catMap.get(row.category_id) ?? "Other",
        categoryId: row.category_id, folderId: row.folder_id ?? null,
      })));
    };
    loadTasks();
  }, []);

  useEffect(() => {
    const loadFolders = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userError || !user) return;
      const { data: ownedRows, error: ownedError } = await supabase
        .from("folders").select("id, user_id, name, color, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      if (ownedError) { alert(`Failed to load owned folders: ${ownedError.message}`); return; }
      const { data: memberRows, error: memberError } = await supabase
        .from("folder_members").select("folder_id, role").eq("user_id", user.id);
      if (memberError) { alert(`Failed to load shared folders: ${memberError.message}`); return; }
      const sharedFolderIds = [...new Set((memberRows ?? []).map(row => row.folder_id))];
      const ownedIds = new Set((ownedRows ?? []).map(row => row.id));
      const onlySharedIds = sharedFolderIds.filter(id => !ownedIds.has(id));
      let sharedRows: any[] = [];
      if (onlySharedIds.length > 0) {
        const { data, error } = await supabase
          .from("folders").select("id, user_id, name, color, created_at").in("id", onlySharedIds).order("created_at", { ascending: false });
        if (error) { alert(`Failed to load shared folders: ${error.message}`); return; }
        sharedRows = data ?? [];
      }
      const allRows = [...(ownedRows ?? []), ...sharedRows];
      setFolders(allRows.map(row => ({
        id: row.id, name: row.name, color: row.color, owner: row.user_id,
        collaborators: [], created: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      })));
    };
    loadFolders();
  }, []);

  useEffect(() => { if (avatarDataUrl) localStorage.setItem("avatar", avatarDataUrl); }, [avatarDataUrl]);
  useEffect(() => { if (displayName) localStorage.setItem("displayName", displayName); }, [displayName]);

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return alert("Please enter a folder name");
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return alert("You must be logged in");
    const { data, error } = await supabase.from("folders").insert({ name, color: "#FFC107", user_id: user.id }).select("id, name, color, created_at").single();
    if (error || !data) { alert(`Failed to create folder: ${error?.message ?? "Unknown error"}`); return; }
    setFolders(prev => [{ id: data.id, name: data.name, color: data.color, owner: user.id, collaborators: [], created: new Date(data.created_at).getTime() }, ...prev]);
    setNewFolderName(""); setShowCreateFolderModal(false);
  };

  const deleteFolder = async (folderId: number) => {
    if (!confirm("Delete this folder? Tasks will be moved to 'All Tasks'.")) return;
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const { error: taskUpdateError } = await supabase.from("tasks_v2").update({ folder_id: null }).eq("folder_id", folderId).eq("user_id", user.id);
    if (taskUpdateError) return alert("Could not update tasks");
    await supabase.from("folder_members").delete().eq("folder_id", folderId);
    const { error: folderDeleteError } = await supabase.from("folders").delete().eq("id", folderId).eq("user_id", user.id);
    if (folderDeleteError) return alert("Could not delete folder");
    setTasks(prev => prev.map(tk => tk.folderId === folderId ? { ...tk, folderId: null } : tk));
    setFolders(prev => prev.filter(f => f.id !== folderId));
    if (selectedFolder === folderId) setSelectedFolder(null);
  };

  const shareFolder = async () => {
    const email = shareEmail.trim().toLowerCase();
    if (!email) return alert("Please enter an email");
    if (!activeFolderForShare) return alert("No folder selected");
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return alert("Please enter a valid email");
    if (email === userEmail.toLowerCase()) return alert("You can't share with yourself");
    const { data: invitedUser, error: invitedUserError } = await supabase.from("profiles").select("id, email").eq("email", email).single();
    if (invitedUserError || !invitedUser) return alert("That user was not found");
    const { error: insertError } = await supabase.from("folder_members").insert({ folder_id: activeFolderForShare, user_id: invitedUser.id, role: "editor" });
    if (insertError) return alert(`Failed to share folder: ${insertError.message}`);
    alert(`Folder shared with ${email}`);
    setShareEmail(""); setShowShareFolderModal(false); setActiveFolderForShare(null);
  };

  const resetForm = () => {
    setNewTask(""); setNewDescription(""); setNewDue(""); setNewPriority("Low");
    setNewStatus("not_started"); setNewTaskFolder(selectedFolder); setEditId(null);
    setCategories(prev => { const first = prev[0]; if (first) { setNewCategory(first.name); setNewCategoryId(first.id); } return prev; });
  };

  const handleAddOrEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTask.trim()) return alert("Task name is required");
    if (!newCategoryId) return alert("Please select a category");
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return alert("User not authenticated");
    const payload = {
      user_id: user.id, category_id: newCategoryId, folder_id: newTaskFolder ?? null,
      title: newTask.trim(), description: newDescription.trim() || null,
      due_date: newDue || null, priority: priorityToInt(newPriority), is_completed: false, status: newStatus,
    };
    if (editId !== null) {
      const { error } = await supabase.from("tasks_v2").update(payload).eq("id", editId).eq("user_id", user.id);
      if (error) { alert(error.message); return; }
      setTasks(prev => prev.map(tk => tk.id === editId ? { ...tk, text: payload.title, description: payload.description ?? "", due: payload.due_date ?? "No date", done: payload.is_completed, priority: intToPriority(payload.priority), category: newCategory, categoryId: payload.category_id, folderId: payload.folder_id ?? null, status: payload.status as Status } : tk));
    } else {
      const { data, error } = await supabase.from("tasks_v2").insert(payload).select("id, created_at").single();
      if (error) { alert(error.message); return; }
      setTasks(prev => [{ id: data.id, text: payload.title, description: payload.description ?? "", due: payload.due_date ?? "No date", done: false, status: newStatus, created: new Date(data.created_at).getTime(), priority: newPriority, category: newCategory, categoryId: newCategoryId, folderId: newTaskFolder }, ...prev]);
    }
    resetForm(); setShowModal(false);
  };

  const handleEdit = (task: Task) => {
    setEditId(task.id); setNewTask(task.text); setNewDescription(task.description);
    setNewDue(task.due !== "No date" ? task.due : ""); setNewPriority(task.priority);
    setNewCategory(task.category); setNewCategoryId(task.categoryId ?? null);
    setNewStatus(task.status); setNewTaskFolder(task.folderId || null); setShowModal(true);
  };

  const deleteTask = async (id: number) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    await supabase.from("tasks_v2").delete().eq("id", id).eq("user_id", user.id);
    setTasks(prev => prev.filter(tk => tk.id !== id));
  };

  const toggleDone = async (id: number) => {
    const task = tasks.find(tk => tk.id === id);
    if (!task) return;
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;
    const nextDone = !task.done;
    await supabase.from("tasks_v2").update({ is_completed: nextDone }).eq("id", id).eq("user_id", user.id);
    setTasks(prev => prev.map(tk => {
      if (tk.id === id) {
        const updated = { ...tk, done: nextDone, status: nextDone ? "not_started" as Status : tk.status };
        if (!tk.done && updated.done) sendNotification("Task Completed", tk.text);
        return updated;
      }
      return tk;
    }));
  };

  const setTaskStatus = (id: number, status: Status) => {
    setTasks(prev => prev.map(tk => tk.id === id ? { ...tk, status } : tk));
  };

  const addCustomCategory = async (val: string) => {
    const v = val.trim();
    if (!v) return;
    const existing = categories.find(c => c.name.toLowerCase() === v.toLowerCase());
    if (existing) { setNewCategory(existing.name); setNewCategoryId(existing.id); return; }
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return alert("You must be logged in to create a category.");
    const { data, error } = await supabase.from("categories_v2").insert({ user_id: user.id, name: v }).select("id, name").single();
    if (error || !data) { alert(`Failed to create category: ${error?.message ?? "Unknown error"}`); return; }
    setCategories(prev => [...prev, data]);
    setNewCategory(data.name); setNewCategoryId(data.id);
  };

  const onAvatarUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const sendNotification = useCallback((title: string, body?: string) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try { new Notification(title, { body }); } catch {}
  }, []);

  const sendDueTodayNotifications = useCallback(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const today = new Date().toISOString().split("T")[0];
    tasks.filter(tk => tk.due === today && !tk.done).forEach((tk, i) => {
      setTimeout(() => sendNotification("Due Today", `${tk.text} is due today`), i * 400);
    });
  }, [sendNotification, tasks]);

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (!notifiedRef.current) {
      if (Notification.permission === "default") Notification.requestPermission().then(() => sendDueTodayNotifications());
      else if (Notification.permission === "granted") sendDueTodayNotifications();
      notifiedRef.current = true;
    }
  }, [sendDueTodayNotifications]);

  const tasksInView = useMemo(() => {
    if (selectedFolder === null) {
      const ownedFolderIds = new Set(folders.filter(f => f.owner === userId).map(f => f.id));
      return tasks.filter(tk => tk.folderId === null || ownedFolderIds.has(tk.folderId!));
    }
    return tasks.filter(tk => tk.folderId === selectedFolder);
  }, [tasks, selectedFolder, folders, userId]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const today = new Date().toISOString().split("T")[0];
    let result = tasksInView.filter(tk => {
      if (q && !`${tk.text} ${tk.description} ${tk.category}`.toLowerCase().includes(q)) return false;
      if (categoryFilter !== "All" && tk.category !== categoryFilter) return false;
      if (priorityFilter !== "All" && tk.priority !== priorityFilter) return false;
      if (dateFilter) { if (dateFilter === "today") { if (tk.due !== today) return false; } else { if (tk.due !== dateFilter) return false; } }
      return true;
    });
    return result.sort((a, b) => {
      if (sortBy === "added") return b.created - a.created;
      if (sortBy === "due") { const da = a.due === "No date" ? 8640000000000000 : new Date(a.due).getTime(); const db = b.due === "No date" ? 8640000000000000 : new Date(b.due).getTime(); return da - db; }
      if (sortBy === "alpha") return a.text.localeCompare(b.text);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      return 0;
    });
  }, [tasksInView, searchQuery, categoryFilter, priorityFilter, dateFilter, sortBy]);

  const total = tasksInView.length;
  const completedCount = tasksInView.filter(tk => tk.done).length;
  const inProgressCount = tasksInView.filter(tk => !tk.done && tk.status === "in_progress").length;
  const notStartedCount = tasksInView.filter(tk => !tk.done && tk.status === "not_started").length;

  const getInitials = (name = displayName) => name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const activeFolderName = selectedFolder ? folders.find(f => f.id === selectedFolder)?.name || "Unknown" : "All Tasks";

  const priorityColors: Record<Priority, { bg: string; text: string; dot: string }> = isDark ? {
    Low: { bg: "#14532d20", text: "#4ade80", dot: "#22c55e" },
    Medium: { bg: "#FFC10720", text: "#FFC107", dot: "#FFC107" },
    High: { bg: "#dc262620", text: "#f87171", dot: "#ef4444" },
  } : {
    Low: { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
    Medium: { bg: "#fef9c3", text: "#a16207", dot: "#eab308" },
    High: { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
  };

  const NectarDots = ({ filled, total: tot }: { filled: number; total: number }) => (
    <div className="flex gap-2">
      {Array.from({ length: tot }).map((_, i) => (
        <div key={i} className="w-5 h-5 rounded-full border-2 transition-all duration-300"
          style={{ background: i < filled ? t.accent : "transparent", borderColor: i < filled ? t.accent : t.borderStrong, boxShadow: i < filled ? `0 0 8px ${t.accent}60` : "none" }} />
      ))}
    </div>
  );

  const inputStyle = {
    background: t.inputBg,
    color: t.text,
    border: `1px solid ${t.border}`,
  };

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .slide-up { animation: slideUp 0.35s ease-out forwards; }
    .fade-in { animation: fadeIn 0.25s ease-out forwards; }
    .modal-in { animation: modalIn 0.22s ease-out forwards; }
    .task-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .task-card:hover { transform: translateY(-1px); }
    .theme-toggle { transition: all 0.3s ease; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
    select option { background: ${t.surface}; color: ${t.text}; }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: ${isDark ? "invert(1)" : "none"}; opacity: 0.5; }
  `;

  return (
    <main style={{ minHeight: "100vh", background: t.bg, color: t.text, transition: "background 0.3s ease, color 0.3s ease" }}>
      <style>{inlineStyles}</style>

      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300"
        style={{ background: t.surface, borderRight: `1px solid ${t.border}`, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" }}>
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Logo + theme toggle */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐝</span>
              <span className="text-xl font-bold" style={{ color: t.accent }}>Do Bee</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button onClick={toggleTheme} className="theme-toggle w-8 h-8 rounded-lg flex items-center justify-center text-base"
                style={{ background: t.surfaceHover, color: t.textMuted }} title={isDark ? "Switch to Light" : "Switch to Dark"}>
                {isDark ? "☀️" : "🌙"}
              </button>
              <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t.surfaceHover, color: t.textMuted }}>✕</button>
            </div>
          </div>

          {/* User card */}
          <div className="flex items-center gap-3 mb-8 p-3 rounded-2xl" style={{ background: t.surfaceHover }}>
            <div className="relative">
              {avatarDataUrl ? (
                <img src={avatarDataUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: t.accent, color: t.accentText }}>{getInitials()}</div>
              )}
              <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer text-xs"
                style={{ background: t.border, color: t.textMuted }}>✎</label>
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onAvatarUpload(f); }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: t.text }}>{displayName}</div>
              <div className="text-xs truncate" style={{ color: t.textDim }}>{userEmail}</div>
            </div>
          </div>

          {/* Nav */}
          <nav className="space-y-1 mb-8">
            {[
              { href: "/dashboard", label: "Dashboard", icon: "⊞", active: true },
              { href: "/calendar", label: "Calendar", icon: "📅", active: false },
              { href: "/statistics", label: "Statistics", icon: "📊", active: false },
              { href: "/settings", label: "Settings", icon: "⚙️", active: false },
            ].map(item => (
              <a key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{ background: item.active ? t.accent : "transparent", color: item.active ? t.accentText : t.textMuted }}>
                <span>{item.icon}</span><span>{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Folders */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>Folders</span>
              <button onClick={() => setShowCreateFolderModal(true)} className="text-xs px-2 py-1 rounded-lg font-medium"
                style={{ background: t.surfaceHover, color: t.accent }}>+ New</button>
            </div>
            <button onClick={() => setSelectedFolder(null)}
              className="w-full text-left px-3 py-2.5 rounded-xl mb-1 text-sm font-medium flex items-center gap-2 transition-all"
              style={{ background: selectedFolder === null ? t.surfaceHover : "transparent", color: selectedFolder === null ? t.text : t.textDim }}>
              <span>📂</span><span>All Tasks</span>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: t.border, color: t.textMuted }}>{tasks.length}</span>
            </button>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {folders.map(folder => {
                const isOwner = folder.owner === userId;
                const taskCount = tasks.filter(tk => tk.folderId === folder.id).length;
                return (
                  <div key={folder.id} className="group flex items-center gap-1">
                    <button onClick={() => setSelectedFolder(folder.id)}
                      className="flex-1 text-left px-3 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all"
                      style={{ background: selectedFolder === folder.id ? t.surfaceHover : "transparent", color: selectedFolder === folder.id ? t.text : t.textDim }}>
                      <span>{isOwner ? "📁" : "🤝"}</span>
                      <span className="flex-1 truncate">{folder.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: t.border, color: t.textMuted }}>{taskCount}</span>
                    </button>
                    {isOwner && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                        <button onClick={() => { setActiveFolderForShare(folder.id); setShowShareFolderModal(true); }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                          style={{ background: t.surfaceHover, color: t.accent }}>➕</button>
                        <button onClick={() => deleteFolder(folder.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                          style={{ background: t.surfaceHover, color: t.textDim }}>🗑️</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6" style={{ borderTop: `1px solid ${t.border}` }}>
          <button onClick={handleLogout} className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ background: t.surfaceHover, color: t.danger }}>Sign Out</button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 fade-in" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN */}
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
          style={{ background: isDark ? "rgba(17,17,19,0.92)" : "rgba(255,250,243,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${t.border}` }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: t.surfaceHover, color: t.textMuted }}>☰</button>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={t.textDim} strokeWidth="2" /><path d="M20 20l-3-3" stroke={t.textDim} strokeWidth="2" strokeLinecap="round" /></svg>
              <input ref={searchRef} value={rawSearch} onChange={e => setRawSearch(e.target.value)} placeholder="Search tasks..."
                className="bg-transparent outline-none text-sm w-52" style={{ color: t.text }} />
              {rawSearch && <button onClick={() => setRawSearch("")} className="text-xs" style={{ color: t.textDim }}>✕</button>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme toggle in header too */}
            <button onClick={toggleTheme} className="theme-toggle w-9 h-9 rounded-xl flex items-center justify-center text-base"
              style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }} title={isDark ? "Light mode" : "Dark mode"}>
              {isDark ? "☀️" : "🌙"}
            </button>
            <div className="text-right">
              <div className="text-xs font-medium" style={{ color: t.textDim }}>Today</div>
              <div className="text-sm font-semibold" style={{ color: t.text }}>{new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</div>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: t.accent, color: t.accentText }}>
              {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" /> : getInitials()}
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {/* Page header */}
          <div className="mb-8 slide-up">
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: t.textDim }}>DO BEE</div>
            <h1 className="text-3xl font-bold mb-1" style={{ color: t.text }}>{activeFolderName}</h1>
            {selectedFolder && <p className="text-sm" style={{ color: t.textDim }}>{folders.find(f => f.id === selectedFolder)?.owner === userId ? "Your folder" : "Shared with you"}</p>}

            {/* Daily Nectar */}
            <div className="mt-5 p-5 rounded-2xl flex items-center justify-between"
              style={{ background: t.surface, border: `1px solid ${t.border}` }}>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: t.textDim }}>Daily Nectar</div>
                <div className="text-2xl font-bold">
                  <span style={{ color: t.accent }}>{completedCount}</span>
                  <span className="text-lg font-normal" style={{ color: t.textDim }}>/{dailyGoal}</span>
                </div>
              </div>
              <NectarDots filled={Math.min(completedCount, dailyGoal)} total={dailyGoal} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Task List */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  <select key="sort" value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="text-sm px-3 py-2 rounded-xl outline-none" style={inputStyle}>
                    <option value="added">Sort: Added</option>
                    <option value="due">Sort: Due Date</option>
                    <option value="alpha">Sort: A–Z</option>
                    <option value="category">Sort: Category</option>
                  </select>,
                  <button key="today" onClick={() => { const today = new Date().toISOString().split("T")[0]; setDateFilter(prev => prev === today ? "" : today); }}
                    className="text-sm px-3 py-2 rounded-xl font-medium border transition-all"
                    style={{ background: dateFilter === new Date().toISOString().split("T")[0] ? t.accent : t.surface, color: dateFilter === new Date().toISOString().split("T")[0] ? t.accentText : t.textMuted, borderColor: t.border }}>
                    Today
                  </button>,
                  <select key="priority" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)}
                    className="text-sm px-3 py-2 rounded-xl outline-none" style={inputStyle}>
                    <option value="All">All Priority</option>
                    <option value="High">🔴 High</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Low">🟢 Low</option>
                  </select>
                ]}
              </div>

              {/* Tasks */}
              <div>
                <div className="text-sm font-semibold mb-3" style={{ color: t.textDim }}>Your Tasks</div>
                {filteredSorted.length === 0 ? (
                  <div className="py-16 text-center rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                    <div className="text-3xl mb-3">🐝</div>
                    <div className="text-sm" style={{ color: t.textDim }}>No tasks found. Time to relax or add a new one!</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredSorted.map((task, idx) => {
                      const pc = priorityColors[task.priority];
                      return (
                        <div key={task.id} className="task-card p-4 rounded-2xl" style={{ background: t.surface, border: `1px solid ${task.done ? t.border : t.borderStrong}`, opacity: task.done ? 0.6 : 1 }}>
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggleDone(task.id)}
                              className="mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={{ borderColor: task.done ? t.accent : t.borderStrong, background: task.done ? t.accent : "transparent" }}>
                              {task.done && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke={t.accentText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h3 className={`font-semibold text-base leading-tight ${task.done ? "line-through" : ""}`}
                                    style={{ color: task.done ? t.textDim : t.text }}>{task.text}</h3>
                                  {task.description && <p className="text-sm mt-1" style={{ color: t.textDim }}>{task.description}</p>}
                                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                                      style={{ background: pc.bg, color: pc.text }}>
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: pc.dot }} />
                                      {task.priority}
                                    </span>
                                    {task.due !== "No date" && (
                                      <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: t.surfaceHover, color: t.textMuted }}>
                                        📅 {task.due}
                                      </span>
                                    )}
                                    <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: t.surfaceHover, color: t.accent }}>
                                      {task.category}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {!task.done && (
                                    <select value={task.status} onChange={e => setTaskStatus(task.id, e.target.value as Status)}
                                      className="text-xs px-2 py-1.5 rounded-lg outline-none" style={inputStyle}>
                                      <option value="not_started">Not Started</option>
                                      <option value="in_progress">In Progress</option>
                                    </select>
                                  )}
                                  <button onClick={() => handleEdit(task)} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                                    style={{ background: t.surfaceHover, color: t.textMuted }}>✎</button>
                                  <button onClick={() => deleteTask(task.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs"
                                    style={{ background: t.surfaceHover, color: t.danger }}>🗑</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: t.textDim }}>Task Status</div>
                <div className="space-y-3">
                  {[
                    { label: "Completed", count: completedCount, color: t.success },
                    { label: "In Progress", count: inProgressCount, color: t.accent },
                    { label: "Not Started", count: notStartedCount, color: t.textMuted },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: t.surfaceHover }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: t.text }}>{label}</div>
                        <div className="text-xs" style={{ color: t.textDim }}>{count} tasks</div>
                      </div>
                      <div className="text-xl font-bold" style={{ color }}>{total ? Math.round((count / total) * 100) : 0}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: t.textDim }}>Summary</div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 rounded-xl text-center" style={{ background: t.surfaceHover }}>
                    <div className="text-2xl font-bold" style={{ color: t.accent }}>{total}</div>
                    <div className="text-xs" style={{ color: t.textDim }}>Total</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: t.surfaceHover }}>
                    <div className="text-2xl font-bold" style={{ color: t.success }}>{completedCount}</div>
                    <div className="text-xs" style={{ color: t.textDim }}>Done</div>
                  </div>
                </div>
                <div className="p-3 rounded-xl" style={{ background: t.surfaceHover }}>
                  <div className="text-xs mb-2 text-center" style={{ color: t.textDim }}>Completion Rate</div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: t.border }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${total ? Math.round((completedCount / total) * 100) : 0}%`, background: t.accent }} />
                  </div>
                  <div className="text-sm font-bold mt-1 text-center" style={{ color: t.accent }}>{total ? Math.round((completedCount / total) * 100) : 0}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => { resetForm(); setShowModal(true); }}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all hover:scale-110 active:scale-95 shadow-2xl"
        style={{ background: t.accent, color: t.accentText, boxShadow: `0 0 30px ${t.accent}50` }}>
        +
      </button>

      {/* Task Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 fade-in" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="relative w-full max-w-md rounded-3xl p-6 modal-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: t.text }}>{editId ? "Edit Task" : "Add Task"}</h2>
            <form onSubmit={e => { e.preventDefault(); handleAddOrEdit(); }} className="space-y-3">
              <input className="w-full px-4 py-3 rounded-xl outline-none text-sm" style={inputStyle}
                value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Task name" />
              <textarea className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-none" style={inputStyle}
                value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description" rows={2} />
              <input type="date" className="w-full px-4 py-3 rounded-xl outline-none text-sm" style={inputStyle}
                value={newDue} onChange={e => setNewDue(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <select className="px-4 py-3 rounded-xl outline-none text-sm" style={inputStyle}
                  value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}>
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
                <div className="flex gap-1">
                  <select className="flex-1 px-3 py-3 rounded-xl outline-none text-sm" style={inputStyle}
                    value={newCategoryId ?? ""} onChange={e => { const id = Number(e.target.value); const cat = categories.find(c => c.id === id); setNewCategoryId(id); setNewCategory(cat?.name ?? ""); }}>
                    <option value="">Category...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="button" className="w-11 rounded-xl font-bold text-lg"
                    style={{ background: t.surfaceHover, color: t.accent }}
                    onClick={async () => { const name = prompt("New category name:"); if (name) await addCustomCategory(name); }}>+</button>
                </div>
              </div>
              <select className="w-full px-4 py-3 rounded-xl outline-none text-sm" style={inputStyle}
                value={newTaskFolder || ""} onChange={e => setNewTaskFolder(e.target.value ? Number(e.target.value) : null)}>
                <option value="">No Folder</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <select className="w-full px-4 py-3 rounded-xl outline-none text-sm" style={inputStyle}
                value={newStatus} onChange={e => setNewStatus(e.target.value as Status)}>
                <option value="not_started">Not Started</option>
                <option value="in_progress">In Progress</option>
              </select>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: t.surfaceHover, color: t.textMuted }}>Cancel</button>
                <button type="submit" className="flex-1 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                  style={{ background: t.accent, color: t.accentText }}>{editId ? "Save Changes" : "Add Task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 fade-in" onClick={() => setShowCreateFolderModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl p-6 modal-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: t.text }}>New Folder</h3>
            <p className="text-sm mb-5" style={{ color: t.textDim }}>Organize your tasks</p>
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl outline-none text-sm mb-4" style={inputStyle} placeholder="Folder name" />
            <div className="flex gap-3">
              <button onClick={() => setShowCreateFolderModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ background: t.surfaceHover, color: t.textMuted }}>Cancel</button>
              <button onClick={createFolder} className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: t.accent, color: t.accentText }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Folder Modal */}
      {showShareFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 fade-in" onClick={() => { setShowShareFolderModal(false); setActiveFolderForShare(null); }} />
          <div className="relative w-full max-w-sm rounded-3xl p-6 modal-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: t.text }}>Share Folder</h3>
            <p className="text-sm mb-5" style={{ color: t.textDim }}>Invite a collaborator</p>
            <input value={shareEmail} onChange={e => setShareEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl outline-none text-sm mb-4" style={inputStyle} placeholder="email@example.com" />
            <div className="flex gap-3">
              <button onClick={() => { setShowShareFolderModal(false); setActiveFolderForShare(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: t.surfaceHover, color: t.textMuted }}>Cancel</button>
              <button onClick={shareFolder} className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: t.accent, color: t.accentText }}>Share</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
