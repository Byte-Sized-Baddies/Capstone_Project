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
  owner: string;
  collaborators: string[];
  created: number;
};

const presetCategories = ["School", "Work", "Personal", "Chores", "Fitness", "Other"];
const LIGHT_PINK = "#ffd6e8";

export default function DashboardPage() {
  const router = useRouter();
  
  // User state
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("User");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  // Tasks & folders
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const categoryList = [...presetCategories, ...customCategories];

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showShareFolderModal, setShowShareFolderModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [activeFolderForShare, setActiveFolderForShare] = useState<number | null>(null);

  // Form states
  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("Low");
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<Status>("not_started");
  const [newTaskFolder, setNewTaskFolder] = useState<number | null>(null);

  // Folder form
  const [newFolderName, setNewFolderName] = useState("");
  const [shareEmail, setShareEmail] = useState("");

  // Filters
  const [rawSearch, setRawSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | string>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | "Low" | "Medium" | "High">("All");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState("added");

  const searchRef = useRef<HTMLInputElement | null>(null);

  // Session Check
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.push("/login");
        return;
      }
      const user = data.session.user;
      setUserEmail(user.email || "");
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

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(rawSearch.trim()), 280);
    return () => clearTimeout(t);
  }, [rawSearch]);

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem("tasks");
    const savedFolders = localStorage.getItem("folders");
    const savedCat = localStorage.getItem("categories");
    const savedAvatar = localStorage.getItem("avatar");
    const savedName = localStorage.getItem("displayName");
    
    if (saved) {
      try { setTasks(JSON.parse(saved)); } catch { setTasks([]); }
    }
    if (savedFolders) {
      try { setFolders(JSON.parse(savedFolders)); } catch { setFolders([]); }
    }
    if (savedCat) {
      try { setCustomCategories(JSON.parse(savedCat)); } catch { setCustomCategories([]); }
    }
    if (savedAvatar) setAvatarDataUrl(savedAvatar);
    if (savedName) setDisplayName(savedName);

    // Load URL params
    const params = new URLSearchParams(window.location.search);
    setRawSearch(params.get("q") ?? "");
    setCategoryFilter(params.get("cat") ?? "All");
    const pr = params.get("p") ?? "All";
    setPriorityFilter(priorityOptions.includes(pr as Priority) ? (pr as Priority) : "All");
    setDateFilter(params.get("d") ?? "");
    setSortBy(params.get("s") ?? "added");


  }, []);

  // load categories + tasks from Supabase
  useEffect(() => {
    const loadCategoriesAndTasks = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;

      const { data: catRows, error: catError } = await supabase
        .from("categories_v2")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      const categoryMap = new Map<number, string>();
      if (!catError && catRows) {
        setCategories(catRows);
        catRows.forEach((c) => categoryMap.set(c.id, c.name));
        if (catRows.length && newCategoryId === null) {
          setNewCategoryId(catRows[0].id);
          setNewCategory(catRows[0].name);
        }
      }

      const { data: taskRows, error: taskError } = await supabase
        .from("tasks_v2")
        .select("id, title, description, due_date, priority, is_completed, created_at, category_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!taskError && taskRows) {
        const mapped: Task[] = taskRows.map((row) => {
          const categoryName = row.category_id ? categoryMap.get(row.category_id) ?? "Uncategorized" : "Uncategorized";
          return {
            id: row.id,
            text: row.title,
            description: row.description ?? "",
            due: row.due_date ?? "No date",
            done: !!row.is_completed,
            status: row.is_completed ? "in_progress" : "not_started",
            created: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            priority: intToPriority(row.priority ?? 0),
            category: categoryName,
            categoryId: row.category_id ?? null,
          };
        });
        setTasks(mapped);
      }
    };

    loadCategoriesAndTasks();
  }, [newCategoryId]);


  // Persist state
  useEffect(() => localStorage.setItem("tasks", JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem("folders", JSON.stringify(folders)), [folders]);
  useEffect(() => localStorage.setItem("categories", JSON.stringify(customCategories)), [customCategories]);
  useEffect(() => { if (avatarDataUrl) localStorage.setItem("avatar", avatarDataUrl); }, [avatarDataUrl]);
  useEffect(() => { if (displayName) localStorage.setItem("displayName", displayName); }, [displayName]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (rawSearch) params.set("q", rawSearch);
    else params.delete("q");
    if (categoryFilter && categoryFilter !== "All") params.set("cat", categoryFilter);
    else params.delete("cat");
    if (priorityFilter && priorityFilter !== "All") params.set("p", priorityFilter);
    else params.delete("p");
    if (dateFilter) params.set("d", dateFilter);
    else params.delete("d");
    if (sortBy) params.set("s", sortBy);
    else params.delete("s");
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [rawSearch, categoryFilter, priorityFilter, dateFilter, sortBy]);

  // Folder management
  const createFolder = () => {
    const name = newFolderName.trim();
    if (!name) return alert("Please enter a folder name");
    
    const folder: Folder = {
      id: Date.now(),
      name,
      owner: userEmail,
      collaborators: [],
      created: Date.now()
    };
    
    setFolders(prev => [folder, ...prev]);
    setNewFolderName("");
    setShowCreateFolderModal(false);
  };

  const deleteFolder = (folderId: number) => {
    if (!confirm("Delete this folder? Tasks will be moved to 'All Tasks'.")) return;
    
    // Move tasks out of folder
    setTasks(prev => prev.map(t => t.folderId === folderId ? { ...t, folderId: null } : t));
    setFolders(prev => prev.filter(f => f.id !== folderId));
    
    if (selectedFolder === folderId) {
      setSelectedFolder(null);
    }
  };

  const shareFolder = () => {
    const email = shareEmail.trim().toLowerCase();
    if (!email) return alert("Please enter an email");
    if (!activeFolderForShare) return;
    
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return alert("Please enter a valid email");
    
    if (email === userEmail) return alert("You can't share with yourself");
    
    setFolders(prev => prev.map(f => {
      if (f.id === activeFolderForShare) {
        if (f.collaborators.includes(email)) {
          alert("Already shared with this user");
          return f;
        }
        alert(`Folder shared with ${email}`);
        return { ...f, collaborators: [...f.collaborators, email] };
      }
      return f;
    }));
    
    setShareEmail("");
    setShowShareFolderModal(false);
    setActiveFolderForShare(null);
  };

  const removeCollaborator = (folderId: number, email: string) => {
    if (!confirm(`Remove ${email} from this folder?`)) return;
    
    setFolders(prev => prev.map(f => {
      if (f.id === folderId) {
        return { ...f, collaborators: f.collaborators.filter(c => c !== email) };
      }
      return f;
    }));
  };

  const canEditFolder = (folder: Folder) => {
    return folder.owner === userEmail || folder.collaborators.includes(userEmail);
  };

  // Task management
  const resetForm = () => {
    setNewTask("");
    setNewDescription("");
    setNewDue("");
    setNewPriority("Low");
    const firstCategory = categories[0];
    setNewCategory(firstCategory?.name ?? "");
    setNewCategoryId(firstCategory?.id ?? null);
    setNewStatus("not_started");
    setNewTaskFolder(selectedFolder);
    setEditId(null);
  };

  // add/edit
  const handleAddOrEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTask.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const existingTask = editId !== null ? tasks.find((t) => t.id === editId) : null;

    const payload = {
      user_id: user.id,
      category_id: newCategoryId,
      title: newTask.trim(),
      description: newDescription.trim() || null,
      due_date: newDue || null,
      priority: priorityToInt(newPriority),
      is_completed: existingTask?.done ?? false,
    };

    if (editId !== null) {
      await supabase
        .from("tasks_v2")
        .update(payload)
        .eq("id", editId)
        .eq("user_id", user.id);

      setTasks(prev => prev.map(t => t.id === editId ? {
        ...t,
        text: payload.title,
        description: payload.description ?? "",
        due: payload.due_date ?? "No date",
        priority: newPriority,
        category: newCategory,
        categoryId: newCategoryId,
        status: newStatus
      } : t));
      setEditId(null);
    } else {
      const { data, error } = await supabase
        .from("tasks_v2")
        .insert(payload)
        .select("id, created_at")
        .single();

      if (!error && data) {
        const t: Task = {
          id: data.id,
          text: payload.title,
          description: payload.description ?? "",
          due: payload.due_date ?? "No date",
          done: false,
          status: newStatus,
          created: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
          priority: newPriority,
          category: newCategory,
          categoryId: newCategoryId,
          folderId: newTaskFolder
        };
        setTasks(prev => [t, ...prev]);
      }
    }
    resetForm();
    setShowModal(false);
  };

  const handleEdit = (task: Task) => {
    setEditId(task.id);
    setNewTask(task.text);
    setNewDescription(task.description);
    setNewDue(task.due !== "No date" ? task.due : "");
    setNewPriority(task.priority);
    setNewCategory(task.category);
    setNewCategoryId(task.categoryId ?? null);
    setNewStatus(task.status);
    setNewTaskFolder(task.folderId || null);
    setShowModal(true);
  };

  const deleteTask = async (id: number) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    await supabase
      .from("tasks_v2")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleDone = async (id: number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const nextDone = !task.done;
    await supabase
      .from("tasks_v2")
      .update({ is_completed: nextDone })
      .eq("id", id)
      .eq("user_id", user.id);

    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, done: nextDone };
        // send notification on completion
        if (!t.done && updated.done) sendNotification(`Task Completed`, `${t.text}`);
        return updated;
      }
      return t;
    }));
  };
  
  const setTaskStatus = (id: number, status: Status) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
  };

  // custom category add
  const addCustomCategory = async (val: string) => {
    const v = val.trim();
    if (!v) return;

    const existing = categories.find((c) => c.name.toLowerCase() === v.toLowerCase());
    if (existing) {
      setNewCategory(existing.name);
      setNewCategoryId(existing.id);
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) {
      alert("You must be logged in to create a category.");
      return;
    }

    const { data, error } = await supabase
      .from("categories_v2")
      .insert({ user_id: user.id, name: v })
      .select("id, name")
      .single();

    if (error || !data) {
      console.error("Category insert failed:", error);
      alert(`Failed to create category: ${error?.message ?? "Unknown error"}`);
      return;
    }

    setCategories((prev) => [...prev, data]);
    setNewCategory(data.name);
    setNewCategoryId(data.id);
  };

  const onAvatarUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setAvatarDataUrl(res);
    };
    reader.readAsDataURL(file);
  };

  // Filter tasks by folder
  const tasksInView = useMemo(() => {
    if (selectedFolder === null) {
      return tasks;
    }
    return tasks.filter(t => t.folderId === selectedFolder);
  }, [tasks, selectedFolder]);

  // Apply search and filters
  const filteredSorted = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const today = new Date().toISOString().split("T")[0];
    
    let result = tasksInView.filter(t => {
      if (q) {
        const hay = `${t.text} ${t.description} ${t.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (categoryFilter !== "All" && t.category !== categoryFilter) return false;
      if (priorityFilter !== "All" && t.priority !== priorityFilter) return false;
      if (dateFilter) {
        if (dateFilter === "today") {
          if (t.due !== today) return false;
        } else {
          if (t.due !== dateFilter) return false;
        }
      }
      return true;
    });

    result = result.sort((a, b) => {
      if (sortBy === "added") return b.created - a.created;
      if (sortBy === "due") {
        const da = a.due === "No date" ? 8640000000000000 : new Date(a.due).getTime();
        const db = b.due === "No date" ? 8640000000000000 : new Date(b.due).getTime();
        return da - db;
      }
      if (sortBy === "alpha") return a.text.localeCompare(b.text);
      if (sortBy === "category") return a.category.localeCompare(b.category);
      return 0;
    });

    return result;
  }, [tasksInView, searchQuery, categoryFilter, priorityFilter, dateFilter, sortBy]);

  // Stats
  const total = tasksInView.length;
  const completedCount = tasksInView.filter(t => t.done).length;
  const inProgressCount = tasksInView.filter(t => !t.done && t.status === "in_progress").length;
  const notStartedCount = tasksInView.filter(t => !t.done && t.status === "not_started").length;

  const overallPercent = total ? Math.round((completedCount / total) * 100) : 0;
  const inProgressPercent = total ? Math.round((inProgressCount / total) * 100) : 0;
  const notStartedPercent = total ? Math.round((notStartedCount / total) * 100) : 0;

  // Progress component
  const CircleProgress: React.FC<{ percent: number; size?: number }> = ({ percent, size = 64 }) => {
    const r = (size / 2) - 6;
    const c = 2 * Math.PI * r;
    const dash = (percent / 100) * c;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="gp2" x1="0" x2="1">
            <stop offset="0%" stopColor="#F5E99F" />
            <stop offset="100%" stopColor="#FFD36E" />
          </linearGradient>
        </defs>
        <g transform={`translate(${size/2},${size/2})`}>
          <circle r={r} cx={0} cy={0} fill="transparent" stroke="#fff3c4" strokeWidth="8" />
          <circle r={r} cx={0} cy={0} fill="transparent" stroke="url(#gp2)" strokeWidth="8"
            strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" transform="rotate(-90)" />
          <text x="0" y="4" textAnchor="middle" fontSize={size/5} fontWeight={700} fill="#1a1a1a">{percent}%</text>
        </g>
      </svg>
    );
  };

  // notifications helpers
  const sendNotification = useCallback((title: string, body?: string) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, { body });
    } catch {
      // ignore
    }
  }, []);

  const sendDueTodayNotifications = useCallback(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const today = new Date().toISOString().split("T")[0];
    const dueToday = tasks.filter(t => t.due === today && !t.done);
    dueToday.forEach((t, i) => {
      setTimeout(() => sendNotification("Due Today", `${t.text} is due today`), i * 400);
    });
  }, [sendNotification, tasks]);

  // request notification permission on first open (if default)
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      // prompt once
      Notification.requestPermission().then(() => {
        // after permission choose, if granted send due-today notifications
        sendDueTodayNotifications();
      }).catch(() => {});
    } else if (Notification.permission === "granted") {
      sendDueTodayNotifications();
    }
  }, [sendDueTodayNotifications]);

  // avatar initial fallback
  const getInitials = (name = displayName) => {
    return name.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase();
  };

  const inlineStyles = `
    @keyframes modalScaleIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .animate-modal-in { animation: modalScaleIn 220ms ease-out forwards; }
    @keyframes slideIn { from { transform: translateX(-12px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
    .animate-slide-in { animation: slideIn 260ms ease-out forwards; }
  `;

  const beePriorityColor = {
    Low: "bg-[#fff8c2] text-[#5a5000]",
    Medium: "bg-[#f5e99f] text-[#3a3200]",
    High: "bg-[#1a1a1a] text-[#fffbe6]"
  };

  const beeCategoryColor: Record<string, string> = {
    School: "bg-[#fff8c2] text-[#5a5000]",
    Work: "bg-[#f5e99f] text-[#3a3200]",
    Personal: "bg-[#ffe680] text-[#4a3f00]",
    Chores: "bg-[#fff4a6] text-[#4a3f00]",
    Fitness: "bg-[#ffec70] text-[#4a3f00]",
    Other: "bg-[#ffeeb3] text-[#4a3f00]"
  };

  const focusSearch = () => { searchRef.current?.focus(); };

  const activeFolderName = selectedFolder ? folders.find(f => f.id === selectedFolder)?.name || "Unknown" : "All Tasks";

  return (
    <main className={`min-h-screen bg-[#fafafa] p-6 relative text-[#1a1a1a] transition-all duration-300 ${sidebarOpen ? "ml-80" : "ml-0"}`}>
      <style>{inlineStyles}</style>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-[#FFFDF2] p-6 shadow-2xl transition-transform duration-300 rounded-r-3xl border-r border-yellow-200 overflow-y-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-extrabold">Do Bee</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg bg-[#1a1a1a] text-[#fffbe6] hover:bg-[#ffd6e8] hover:text-black transition">✕</button>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            {avatarDataUrl ? (
              <Image
                src={avatarDataUrl}
                alt="User avatar"
                width={56}
                height={56}
                unoptimized
                className="w-14 h-14 rounded-full object-cover shadow"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center font-semibold text-sm shadow">{getInitials()}</div>
            )}
            <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full border shadow cursor-pointer text-xs">✎</label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatarUpload(f); }} />
          </div>
          <div>
            <div className="text-sm font-medium">{displayName}</div>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="text-xs mt-1 border rounded px-2 py-1" />
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-3 animate-slide-in mb-6">
          <a className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow bg-[#ffd6e8] hover:bg-[#ffd6e8] transition" href="/dashboard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="#1a1a1a" /></svg>
            <span className="font-medium">Dashboard</span>
          </a>

          {/* CALENDAR */}
          <a
            href="/calendar"
            className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow hover:bg-[#fff8d6] transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5z" fill="#1a1a1a" />
            </svg>
            <span className="font-medium">Calendar</span>
          </a>

          {/* STATISTICS */}
          <a
            href="/statistics"
            className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow hover:bg-[#fff8d6] transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 17h4V7H3v10zm6 0h4V3H9v14zm6 0h4v-4h-4v4z" fill="#1a1a1a" />
            </svg>
            <span className="font-medium">Statistics</span>
          </a>

          {/* SETTINGS */}
          <a
            href="/settings"
            className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow hover:bg-[#fff8d6] transition"
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

        {/* Folders Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Folders</h4>
            <button onClick={() => setShowCreateFolderModal(true)} className="text-xs bg-[#f5e99f] px-3 py-1 rounded-lg hover:bg-[#ffe680] transition">+ New</button>
          </div>

          <button 
            onClick={() => setSelectedFolder(null)}
            className={`w-full text-left px-3 py-2 rounded-lg mb-2 transition ${selectedFolder === null ? "bg-[#fff8d6] font-medium" : "hover:bg-white"}`}
          >
            📂 All Tasks ({tasks.length})
          </button>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {folders.map(folder => {
              const isOwner = folder.owner === userEmail;
              const isCollaborator = folder.collaborators.includes(userEmail);
              const taskCount = tasks.filter(t => t.folderId === folder.id).length;
              
              return (
                <div key={folder.id} className={`group px-3 py-2 rounded-lg transition ${selectedFolder === folder.id ? "bg-[#fff8d6]" : "hover:bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setSelectedFolder(folder.id)}
                      className="flex-1 text-left text-sm"
                    >
                      <span className="font-medium">{isOwner ? "📁" : "🤝"} {folder.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({taskCount})</span>
                    </button>
                    
                    {isOwner && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button 
                          onClick={() => { setActiveFolderForShare(folder.id); setShowShareFolderModal(true); }}
                          className="p-1 rounded hover:bg-[#ffd6e8] text-xs"
                          title="Share folder"
                        >
                          ➕
                        </button>
                        <button 
                          onClick={() => deleteFolder(folder.id)}
                          className="p-1 rounded hover:bg-red-100 text-xs"
                          title="Delete folder"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {folder.collaborators.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      <div className="font-medium mb-1">Shared with:</div>
                      {folder.collaborators.map(email => (
                        <div key={email} className="flex items-center justify-between py-1">
                          <span>{email}</span>
                          {isOwner && (
                            <button 
                              onClick={() => removeCollaborator(folder.id, email)}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-auto pt-6 border-t border-yellow-200">
          <button 
            onClick={handleLogout} 
            className="w-full py-3 rounded-xl bg-red-100 text-red-700 font-medium hover:bg-red-200 transition shadow-sm"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-3 rounded-lg bg-[#1a1a1a] text-[#fffbe6] hover:bg-[#ffd6e8] hover:text-black transition">☰</button>}

            <div className="relative">
              <div className="flex items-center bg-white rounded-3xl shadow-sm px-3 py-2 border border-transparent focus-within:ring-2 focus-within:ring-[#f5e99f] transition">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-60 mr-2"><path d="M21 21l-4.35-4.35" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                <input
                  ref={searchRef}
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="outline-none px-2 py-1 w-80 md:w-96 bg-transparent"
                />
                {rawSearch && <button onClick={() => { setRawSearch(""); focusSearch(); }} className="text-xs px-2 py-1 rounded-full hover:bg-gray-100">Clear</button>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 text-right">
              <div className="font-semibold">Today</div>
              <div className="text-xs">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "long" })}</div>
            </div>

            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center shadow">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar-mini" className="w-8 h-8 rounded-full object-cover" /> : <span className="font-semibold">{getInitials()}</span>}
            </div>
          </div>
        </div>

        {/* Current Folder */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold">{activeFolderName}</h1>
          {selectedFolder && folders.find(f => f.id === selectedFolder) && (
            <p className="text-sm text-gray-500 mt-1">
              {folders.find(f => f.id === selectedFolder)?.owner === userEmail ? "You own this folder" : "Shared with you"}
            </p>
          )}
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Task List */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded-xl p-2 bg-white">
                  <option value="added">Sort by Added</option>
                  <option value="due">Sort by Due Date</option>
                  <option value="alpha">Sort by A–Z</option>
                  <option value="category">Sort by Category</option>
                </select>

                <button onClick={() => { const today = new Date().toISOString().split("T")[0]; setDateFilter(prev => prev === today ? "" : today); }} className={`px-3 py-2 rounded-xl border ${dateFilter === new Date().toISOString().split("T")[0] ? "bg-[#f5e99f]" : "bg-white"}`}>
                  Today&apos;s Tasks
                </button>

                <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as PriorityFilter)} className="border rounded-xl p-2 bg-white">
                  <option value="All">Priority: All</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            {/* Task Cards */}
            <section className="bg-white p-4 rounded-3xl shadow-md border border-[#ffd6e8]/30">
              {filteredSorted.length === 0 ? (
                <div className="py-12 text-center text-gray-400">No tasks — add one to get started.</div>
              ) : (
                <ul className="space-y-4">
                  {filteredSorted.map(task => (
                    <li key={task.id} className={`group flex gap-4 items-start p-4 rounded-2xl border ${task.done ? "opacity-60" : ""}`} style={{ background: task.done ? "#fffdf2" : "linear-gradient(180deg, #fff6f9 0%, #fffdf2 100%)", boxShadow: "0 8px 18px rgba(0,0,0,0.04)" }}>
                      <div className="shrink-0 flex flex-col items-center pt-1">
                        <input type="checkbox" checked={task.done} onChange={() => toggleDone(task.id)} className="w-5 h-5 accent-[#f5e99f]" />
                        <div className="text-xs text-gray-400 mt-2">{task.due === "No date" ? "No due" : task.due}</div>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className={`font-semibold text-lg ${task.done ? "line-through text-gray-500" : ""}`}>{task.text}</h3>
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>

                            <div className="flex items-center gap-2 mt-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${beePriorityColor[task.priority]}`}>{task.priority}</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${beeCategoryColor[task.category] ?? "bg-[#ffeeb3] text-[#4a3f00]"}`}>{task.category}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {!task.done ? (
                              <select value={task.status} onChange={(e) => setTaskStatus(task.id, e.target.value as Status)} className="border rounded-xl p-2 bg-white text-sm">
                                <option value="not_started">Not Started</option>
                                <option value="in_progress">In Progress</option>
                              </select>
                            ) : (
                              <div className="text-xs text-gray-500">Completed</div>
                            )}

                            <div className="flex items-center gap-2 mt-2">
                              <button onClick={() => handleEdit(task)} className="p-2 rounded-lg bg-[#fff3f8] hover:bg-[#ffd6e8] transition">Edit</button>
                              <button onClick={() => deleteTask(task.id)} className="p-2 rounded-lg bg-[#ffecec] hover:bg-red-200 transition">Delete</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Stats Panel */}
          <aside className="space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-md border border-[#f5e99f]/30">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Task Status</h3>
                <div className="text-xs text-gray-500">Overview</div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#fff8c2] text-[#5a5000] font-semibold">C</div>
                    <div>
                      <div className="text-sm font-medium">Completed</div>
                      <div className="text-xs text-gray-500">{completedCount} tasks</div>
                    </div>
                  </div>
                  <CircleProgress percent={overallPercent} size={64} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#f5e99f] text-[#3a3200] font-semibold">P</div>
                    <div>
                      <div className="text-sm font-medium">In Progress</div>
                      <div className="text-xs text-gray-500">{inProgressCount} tasks</div>
                    </div>
                  </div>
                  <CircleProgress percent={inProgressPercent} size={64} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-[#d94b4b] font-semibold border">N</div>
                    <div>
                      <div className="text-sm font-medium">Not Started</div>
                      <div className="text-xs text-gray-500">{notStartedCount} tasks</div>
                    </div>
                  </div>
                  <CircleProgress percent={notStartedPercent} size={64} />
                </div>
              </div>
            </section>
          </aside>
        </div>

        {/* Floating Add Button */}
        <button onClick={() => { resetForm(); setShowModal(true); }} className="fixed bottom-8 right-8 bg-[#1a1a1a] text-[#fffbe6] text-3xl rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">➕</button>

        {/* Task Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setShowModal(false); resetForm(); }} />
            <div className="relative bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#f5e99f]/30 animate-modal-in">
              <h2 className="text-lg font-semibold mb-3">{editId ? "Edit Task" : "Add Task"}</h2>
              <form onSubmit={(e) => { e.preventDefault(); handleAddOrEdit(); }} className="space-y-3">
                <input className="w-full border p-2 rounded-xl" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Task name" />
                <textarea className="w-full border p-2 rounded-xl" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description" />
                <input type="date" className="w-full border p-2 rounded-xl" value={newDue} onChange={e => setNewDue(e.target.value)} />

                <div className="grid grid-cols-2 gap-3">
                  <select className="w-full border p-2 rounded-xl" value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}>
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>

                  <select
                    className="w-full border p-2 rounded-xl"
                    value={newCategoryId ?? ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const cat = categories.find((c) => c.id === id);
                      setNewCategoryId(id);
                      setNewCategory(cat?.name ?? "");
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <select className="w-full border p-2 rounded-xl" value={newTaskFolder || ""} onChange={e => setNewTaskFolder(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">No Folder (All Tasks)</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>

                <select className="w-full border p-2 rounded-xl" value={newStatus} onChange={e => setNewStatus(e.target.value as Status)}>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                </select>

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 rounded-xl bg-gray-200">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl" style={{ background: "#f5e99f" }}>{editId ? "Save" : "Add"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Folder Modal */}
        {showCreateFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateFolderModal(false)} />
            <div className="relative bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#f5e99f]/30 animate-modal-in">
              <h3 className="text-lg font-semibold mb-2">Create Folder</h3>
              <p className="text-xs text-gray-500 mb-4">Organize your tasks into folders</p>
              <input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="w-full border p-2 rounded-xl mb-4" placeholder="Folder name" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCreateFolderModal(false)} className="px-4 py-2 rounded-xl bg-gray-200">Cancel</button>
                <button onClick={createFolder} className="px-4 py-2 rounded-xl" style={{ background: "#f5e99f" }}>Create</button>
              </div>
            </div>
          </div>
        )}

        {/* Share Folder Modal */}
        {showShareFolderModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => { setShowShareFolderModal(false); setActiveFolderForShare(null); }} />
            <div className="relative bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#ffd6e8]/40 animate-modal-in">
              <h3 className="text-lg font-semibold mb-2">Share Folder</h3>
              <p className="text-xs text-gray-500 mb-4">Invite someone to collaborate on this folder</p>
              <input value={shareEmail} onChange={(e) => setShareEmail(e.target.value)} className="w-full border p-2 rounded-xl" placeholder="email@example.com" />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setShowShareFolderModal(false); setActiveFolderForShare(null); }} className="px-4 py-2 rounded-xl bg-gray-200">Cancel</button>
                <button onClick={shareFolder} className="px-4 py-2 rounded-xl" style={{ background: LIGHT_PINK }}>Share</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
