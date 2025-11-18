// app/dashboard/page.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

type Status = "not_started" | "in_progress";
interface Task {
  id: number;
  text: string;
  description: string;
  due: string; // "YYYY-MM-DD" or "No date"
  done: boolean;
  status: Status;
  created: number;
  priority: "Low" | "Medium" | "High";
  category: string;
}

const presetCategories = ["School", "Work", "Personal", "Chores", "Fitness", "Other"];
const LIGHT_PINK = "#ffd6e8";

export default function DashboardPage() {
  // tasks & persistence
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const categoryList = [...presetCategories, ...customCategories];

  // UI
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [categoryPanelOpen, setCategoryPanelOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // form states
  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState<"Low" | "Medium" | "High">("Low");
  const [newCategory, setNewCategory] = useState("School");
  const [newStatus, setNewStatus] = useState<Status>("not_started");

  // invite
  const [invites, setInvites] = useState<string[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");

  // avatar
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("Kyathi Uyyala");

  // filters + search + sort (URL-synced)
  const [rawSearch, setRawSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"All" | string>("All");
  const [priorityFilter, setPriorityFilter] = useState<"All" | "Low" | "Medium" | "High">("All");
  const [dateFilter, setDateFilter] = useState<string>(""); // "" or YYYY-MM-DD or "today"
  const [sortBy, setSortBy] = useState("added");

  const searchRef = useRef<HTMLInputElement | null>(null);

  // debounce search UI (friendly)
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(rawSearch.trim()), 280);
    return () => clearTimeout(t);
  }, [rawSearch]);

  // load saved state
  useEffect(() => {
    const saved = localStorage.getItem("tasks");
    const savedCat = localStorage.getItem("categories");
    const savedInv = localStorage.getItem("invites");
    const savedAvatar = localStorage.getItem("avatar");
    const savedName = localStorage.getItem("displayName");
    if (saved) {
      try { setTasks(JSON.parse(saved)); } catch { setTasks([]); }
    }
    if (savedCat) {
      try { setCustomCategories(JSON.parse(savedCat)); } catch { setCustomCategories([]); }
    }
    if (savedInv) {
      try { setInvites(JSON.parse(savedInv)); } catch { setInvites([]); }
    }
    if (savedAvatar) setAvatarDataUrl(savedAvatar);
    if (savedName) setDisplayName(savedName);

    // load url params
    const params = new URLSearchParams(window.location.search);
    setRawSearch(params.get("q") ?? "");
    setCategoryFilter(params.get("cat") ?? "All");
    const pr = params.get("p") ?? "All";
    setPriorityFilter(["Low", "Medium", "High"].includes(pr) ? (pr as any) : "All");
    setDateFilter(params.get("d") ?? "");
    setSortBy(params.get("s") ?? "added");

    // request notification permission on first open (if default)
    if (typeof Notification !== "undefined") {
      if (Notification.permission === "default") {
        // prompt once
        Notification.requestPermission().then(() => {
          // after permission choose, if granted send due-today notifications
          sendDueTodayNotifications();
        }).catch(() => {});
      } else if (Notification.permission === "granted") {
        sendDueTodayNotifications();
      }
    }
  }, []);

  // persist
  useEffect(() => localStorage.setItem("tasks", JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem("categories", JSON.stringify(customCategories)), [customCategories]);
  useEffect(() => localStorage.setItem("invites", JSON.stringify(invites)), [invites]);
  useEffect(() => { if (avatarDataUrl) localStorage.setItem("avatar", avatarDataUrl); }, [avatarDataUrl]);
  useEffect(() => { if (displayName) localStorage.setItem("displayName", displayName); }, [displayName]);

  // sync filters to URL
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

  // helpers: reset form
  const resetForm = () => {
    setNewTask("");
    setNewDescription("");
    setNewDue("");
    setNewPriority("Low");
    setNewCategory(categoryList[0] ?? "School");
    setNewStatus("not_started");
    setEditId(null);
  };

  // add/edit
  const handleAddOrEdit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTask.trim()) return;
    if (editId !== null) {
      setTasks(prev => prev.map(t => t.id === editId ? {
        ...t,
        text: newTask.trim(),
        description: newDescription.trim(),
        due: newDue || "No date",
        priority: newPriority,
        category: newCategory,
        status: newStatus
      } : t));
      setEditId(null);
    } else {
      const t: Task = {
        id: Date.now(),
        text: newTask.trim(),
        description: newDescription.trim(),
        due: newDue || "No date",
        done: false,
        status: newStatus,
        created: Date.now(),
        priority: newPriority,
        category: newCategory
      };
      setTasks(prev => [t, ...prev]);
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
    setNewStatus(task.status);
    setShowModal(true);
  };

  const deleteTask = (id: number) => setTasks(prev => prev.filter(t => t.id !== id));
  const toggleDone = (id: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, done: !t.done };
        // send notification on completion
        if (!t.done && updated.done) sendNotification(`Task Completed`, `${t.text}`);
        return updated;
      }
      return t;
    }));
  };
  const setTaskStatus = (id: number, status: Status) => setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));

  // custom category add
  const addCustomCategory = (val: string) => {
    const v = val.trim();
    if (!v) return;
    setCustomCategories(prev => Array.from(new Set([v, ...prev])));
    setNewCategory(v);
  };

  // invite
  const addInvite = () => {
    const email = inviteEmail.trim();
    if (!email) return alert("Please enter an email");
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) return alert("Please enter a valid email");
    setInvites(prev => {
      if (prev.includes(email)) {
        alert("Already invited");
        return prev;
      }
      alert(`Invite sent to ${email} (simulated)`);
      return [email, ...prev];
    });
    setInviteEmail("");
    setShowInviteModal(false);
  };

  // avatar upload
  const onAvatarUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setAvatarDataUrl(res);
    };
    reader.readAsDataURL(file);
  };

  // filter + sort logic
  const filteredSorted = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const today = new Date().toISOString().split("T")[0];
    let result = tasks.filter(t => {
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
  }, [tasks, searchQuery, categoryFilter, priorityFilter, dateFilter, sortBy]);

  // stats
  const total = tasks.length;
  const completedCount = tasks.filter(t => t.done).length;
  const inProgressCount = tasks.filter(t => !t.done && t.status === "in_progress").length;
  const notStartedCount = tasks.filter(t => !t.done && t.status === "not_started").length;

  const overallPercent = total ? Math.round((completedCount / total) * 100) : 0;
  const inProgressPercent = total ? Math.round((inProgressCount / total) * 100) : 0;
  const notStartedPercent = total ? Math.round((notStartedCount / total) * 100) : 0;

  // small circular progress component
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
  const sendNotification = (title: string, body?: string) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    try {
      new Notification(title, { body });
    } catch (e) {
      // ignore
    }
  };

  const sendDueTodayNotifications = () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    const today = new Date().toISOString().split("T")[0];
    const dueToday = tasks.filter(t => t.due === today && !t.done);
    dueToday.forEach((t, i) => {
      setTimeout(() => sendNotification("Due Today", `${t.text} is due today`), i * 400);
    });
  };

  // manual test notification
  const sendTestNotification = () => {
    if (Notification.permission === "default") {
      Notification.requestPermission().then(p => { if (p === "granted") sendNotification("Test", "This is a test notification"); });
    } else if (Notification.permission === "granted") {
      sendNotification("Test", "This is a test notification");
    } else {
      alert("Notifications are blocked. Update browser settings to allow notifications.");
    }
  };

  // avatar initial fallback
  const getInitials = (name = displayName) => {
    return name.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase();
  };

  // inline small animations
  const inlineStyles = `
    @keyframes modalScaleIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .animate-modal-in { animation: modalScaleIn 220ms ease-out forwards; }
    @keyframes slideIn { from { transform: translateX(-12px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
    .animate-slide-in { animation: slideIn 260ms ease-out forwards; }
  `;

  // UI color helpers
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

  // friendly UI helpers
  const focusSearch = () => { searchRef.current?.focus(); };

  return (
    <main className={`min-h-screen bg-[#fafafa] p-6 relative text-[#1a1a1a] transition-all duration-300 ${sidebarOpen ? "ml-80" : "ml-0"}`}>
      <style>{inlineStyles}</style>

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-[#FFFDF2] p-6 shadow-2xl transition-transform duration-300 rounded-r-3xl border-r border-yellow-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} aria-hidden={!sidebarOpen}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-extrabold">Do Bee</h2>
            <p className="text-sm text-gray-600">Organize your day with a buzz</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg bg-[#1a1a1a] text-[#fffbe6] hover:bg-[#ffd6e8] hover:text-black transition">✕</button>
        </div>

        {/* Avatar + upload */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover shadow" />
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

        <nav className="space-y-3 animate-slide-in">
          <a className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow hover:bg-[#fff8d6] transition" href="/dashboard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="#1a1a1a" /></svg>
            <span className="font-medium">Dashboard</span>
          </a>

          <a className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow hover:bg-[#fff8d6] transition" href="/statistics">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 17h4V7H3v10zm6 0h4V3H9v14zm6 0h4v-4h-4v4z" fill="#1a1a1a" /></svg>
            <span className="font-medium">Statistics</span>
          </a>

          <a className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow hover:bg-[#ffd6e8] transition" href="/settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 8a4 4 0 100 8 4 4 0 000-8zM21.4 10.11c.04.29.06.58.06.89s-.02.6-.06.89l2.05 1.6a1 1 0 01.22 1.29l-1.94 3.36a1 1 0 01-1.22.44l-2.42-.97a7.4 7.4 0 01-1.55.9l-.78 2.41a1 1 0 01-.97.6h-5.26a1 1 0 01-.97-.6l-.78-2.41a7.36 7.36 0 01-1.55-.9l-2.42.97a1 1 0 01-1.22-.44L.48 13.18a1 1 0 01.22-1.29l2.05-1.6A7.3 7.3 0 003 9.11V8z" fill="#1a1a1a" /></svg>
            <span className="font-medium">Settings</span>
          </a>

        </nav>

        <div className="mt-6 border-t pt-6">
          <p className="text-xs text-gray-500">Notifications</p>
          <div className="mt-2 flex items-center gap-2">
            <button onClick={() => { if (Notification.permission === "default") Notification.requestPermission().then(p => { if (p === "granted") sendDueTodayNotifications(); }); else if (Notification.permission === "granted") sendDueTodayNotifications(); }} className="px-3 py-2 rounded-xl bg-white border">Enable / Check</button>
            <button onClick={sendTestNotification} className="px-3 py-2 rounded-xl" style={{ background: LIGHT_PINK }}>Send Test</button>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Invited</h4>
          <ul className="text-xs text-gray-600 space-y-1 max-h-28 overflow-auto pr-2">
            {invites.length === 0 && <li className="text-gray-400">No invites yet</li>}
            {invites.map(i => <li key={i} className="flex items-center justify-between"><span>{i}</span></li>)}
          </ul>
        </div>
      </aside>

      {/* TOPBAR */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-3 rounded-lg bg-[#1a1a1a] text-[#fffbe6] hover:bg-[#ffd6e8] hover:text-black transition">☰</button>}

            {/* friendly search UI */}
            <div className="relative">
              <div className="flex items-center bg-white rounded-3xl shadow-sm px-3 py-2 border border-transparent focus-within:ring-2 focus-within:ring-[#f5e99f] transition">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-60 mr-2"><path d="M21 21l-4.35-4.35" stroke="#6b6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
                <input
                  ref={searchRef}
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  placeholder="Search tasks, descriptions, categories..."
                  className="outline-none px-2 py-1 w-80 md:w-96 bg-transparent"
                />
                {rawSearch && <button onClick={() => { setRawSearch(""); focusSearch(); }} className="text-xs px-2 py-1 rounded-full hover:bg-gray-100">Clear</button>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 text-right">
              <div className="font-semibold">Today</div>
              <div className="text-xs">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
            </div>

            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center shadow">{avatarDataUrl ? <img src={avatarDataUrl} alt="avatar-mini" className="w-8 h-8 rounded-full object-cover" /> : <span className="font-semibold">{getInitials()}</span>}</div>
          </div>
        </div>

        {/* Welcome */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold">Your Tasks</h1>
          <p className="text-sm text-gray-600 mt-1">Organize, mark progress, and invite teammates — all saved locally.</p>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Task list area (span 2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded-xl p-2 bg-white">
                  <option value="added">Sort by Added</option>
                  <option value="due">Sort by Due Date</option>
                  <option value="alpha">Sort by A–Z</option>
                  <option value="category">Sort by Category</option>
                </select>

                <button onClick={() => { const today = new Date().toISOString().split("T")[0]; setDateFilter(prev => prev === today ? "" : today); }} className={`px-3 py-2 rounded-xl border ${dateFilter === new Date().toISOString().split("T")[0] ? "bg-[#f5e99f]" : "bg-white"}`}>
                  Today's Tasks
                </button>

                <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as any)} className="border rounded-xl p-2 bg-white">
                  <option value="All">Priority: All</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                Active:
                {rawSearch && <span className="ml-2 px-2 py-1 text-xs rounded-full bg-[#fff3f8]">{`q: "${rawSearch}"`}</span>}
                {categoryFilter !== "All" && <span className="ml-2 px-2 py-1 text-xs rounded-full bg-[#fff3f8]">{categoryFilter}</span>}
                {priorityFilter !== "All" && <span className="ml-2 px-2 py-1 text-xs rounded-full bg-[#fff3f8]">{priorityFilter}</span>}
                {dateFilter && <span className="ml-2 px-2 py-1 text-xs rounded-full bg-[#fff3f8]">{dateFilter === "today" ? "Today" : dateFilter}</span>}
              </div>
            </div>

            {/* Task list */}
            <section className="bg-white p-4 rounded-3xl shadow-md border border-[#ffd6e8]/30">
              {filteredSorted.length === 0 ? (
                <div className="py-12 text-center text-gray-400">No tasks — add one to get started.</div>
              ) : (
                <ul className="space-y-4">
                  {filteredSorted.map(task => (
                    <li key={task.id} className={`group flex gap-4 items-start p-4 rounded-2xl border ${task.done ? "opacity-60" : ""}`} style={{ background: task.done ? "#fffdf2" : "linear-gradient(180deg, #fff6f9 0%, #fffdf2 100%)", boxShadow: "0 8px 18px rgba(0,0,0,0.04)" }}>
                      {/* left: checkbox + due */}
                      <div className="shrink-0 flex flex-col items-center pt-1">
                        <input type="checkbox" checked={task.done} onChange={() => toggleDone(task.id)} className="w-5 h-5 accent-[#f5e99f]" />
                        <div className="text-xs text-gray-400 mt-2">{task.due === "No date" ? "No due" : task.due}</div>
                      </div>

                      {/* body */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className={`font-semibold text-lg ${task.done ? "line-through text-gray-500" : ""}`}>{task.text}</h3>
                            <p className="text-sm text-gray-600 mt-1">{task.description}</p>

                            <div className="flex items-center gap-2 mt-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${beePriorityColor[task.priority]}`}>{task.priority}</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${(beeCategoryColor as any)[task.category] || "bg-[#ffeeb3] text-[#4a3f00]"}`}>{task.category}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {/* status dropdown (hidden when done) */}
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

                            <div className="text-xs text-gray-400">{new Date(task.created).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* RIGHT: Task Status + Invite */}
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

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-[#ffd6e8]/40 text-center">
              <div className="text-sm font-semibold">Invite teammates</div>
              <div className="text-xs text-gray-500 mt-1">Share your board and collaborate</div>
              <button onClick={() => setShowInviteModal(true)} className="mt-3 px-4 py-2 rounded-xl" style={{ background: LIGHT_PINK }}>+ Invite</button>
            </div>
          </aside>
        </div>

        {/* floating add button */}
        <button onClick={() => { resetForm(); setShowModal(true); }} className="fixed bottom-8 right-8 bg-[#1a1a1a] text-[#fffbe6] text-3xl rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">➕</button>

        {/* Add/Edit Modal */}
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
                  <select className="w-full border p-2 rounded-xl" value={newPriority} onChange={e => setNewPriority(e.target.value as any)}>
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>

                  <select className="w-full border p-2 rounded-xl" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                    {categoryList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Initial Status</label>
                  <select className="w-full border p-2 rounded-xl mt-1" value={newStatus} onChange={e => setNewStatus(e.target.value as Status)}>
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>

                <input type="text" placeholder="Add custom category and press Enter" className="w-full border p-2 rounded-xl" onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const val = (e.currentTarget as HTMLInputElement).value.trim();
                    if (val) { addCustomCategory(val); (e.currentTarget as HTMLInputElement).value = ""; }
                  }
                }} />

                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="px-4 py-2 rounded-xl bg-gray-200">Cancel</button>
                  <button type="submit" className="px-4 py-2 rounded-xl" style={{ background: "#f5e99f" }}>{editId ? "Save" : "Add"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowInviteModal(false)} />
            <div className="relative bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#ffd6e8]/40 animate-modal-in">
              <h3 className="text-lg font-semibold mb-2">Invite Teammate</h3>
              <p className="text-xs text-gray-500 mb-4">Enter an email to send an invite (simulated)</p>
              <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full border p-2 rounded-xl" placeholder="email@example.com" />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 rounded-xl bg-gray-200">Cancel</button>
                <button onClick={addInvite} className="px-4 py-2 rounded-xl" style={{ background: LIGHT_PINK }}>Send</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
