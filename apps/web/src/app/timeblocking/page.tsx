"use client";
import React, { useEffect, useState, useRef, useCallback } from "react";
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

type Priority = "Low" | "Medium" | "High";
type Status = "not_started" | "in_progress";

interface Task {
  id: number;
  text: string;
  description: string;
  priority: Priority;
  category: string;
  done: boolean;
  due: string;
  categoryId?: number | null;
  folderId?: number | null;
  status?: Status;
  created?: number;
}

interface TimeBlock {
  id: string;
  taskId: number;
  startHour: number;
  startMin: number;
  durationMins: number;
  color: string;
}

type Category = { id: number; name: string };
type Folder = { id: number; name: string };

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 80;
const intToPriority = (v: number): Priority => v === 2 ? "High" : v === 1 ? "Medium" : "Low";
const priorityToInt = (p: Priority) => p === "Low" ? 0 : p === "Medium" ? 1 : 2;

const priorityColor = (p: Priority, dark: boolean) => dark
  ? ({ High: "#ef4444", Medium: "#FFC107", Low: "#22c55e" }[p])
  : ({ High: "#dc2626", Medium: "#d97706", Low: "#16a34a" }[p]);

const BLOCK_COLORS = ["#FFC107","#22c55e","#3b82f6","#a855f7","#ef4444","#f97316","#ec4899","#14b8a6"];

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞", active: false },
  { href: "/calendar", label: "Calendar", icon: "📅", active: false },
  { href: "/folders", label: "Folders", icon: "📁", active: false },
  { href: "/statistics", label: "Statistics", icon: "📊", active: false },
  { href: "/archive", label: "Archive", icon: "📦", active: false },
  { href: "/timeblocking", label: "Time Block", icon: "⏱", active: true },
  { href: "/notes", label: "Notes", icon: "📝", active: false },
  { href: "/integrations", label: "Integrations", icon: "🔌", active: false },
  { href: "/settings", label: "Settings", icon: "⚙️", active: false },
];

function formatHour(h: number) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TimeBlockingPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [authReady, setAuthReady] = useState(false);
  const [displayName, setDisplayName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [mobileTab, setMobileTab] = useState<"tasks" | "schedule">("schedule");

  const [draggingTask, setDraggingTask] = useState<Task | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<TimeBlock | null>(null);
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);
  const [dragOverMin, setDragOverMin] = useState<number>(0);

  const draggingTaskRef = useRef<Task | null>(null);
  const draggingBlockRef = useRef<TimeBlock | null>(null);
  const dragOverHourRef = useRef<number | null>(null);
  const dragOverMinRef = useRef<number>(0);
  const blocksRef = useRef<TimeBlock[]>([]);
  const isTouchDraggingRef = useRef(false);

  const [hideCompleted, setHideCompleted] = useState(true);

  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  const [pendingHour, setPendingHour] = useState(0);
  const [pendingMin, setPendingMin] = useState(0);
  const [durationHrs, setDurationHrs] = useState(1);
  const [durationMins, setDurationMins] = useState(0);
  const [blockColor, setBlockColor] = useState(BLOCK_COLORS[0]);
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictDays, setConflictDays] = useState<string[]>([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState(selectedDate);
  const [newPriority, setNewPriority] = useState<Priority>("Low");
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<Status>("not_started");
  const [newTaskFolder, setNewTaskFolder] = useState<number | null>(null);

  const scheduleRef = useRef<HTMLDivElement>(null);

  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setIsDark(saved === "dark");
  }, []);

  const toggleTheme = () => setIsDark(prev => {
    localStorage.setItem("theme", !prev ? "dark" : "light");
    return !prev;
  });

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
    const { data: l } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) checkSession(); else { setAuthReady(true); router.push("/login"); }
    });
    checkSession();
    return () => { l.subscription.unsubscribe(); };
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    const a = localStorage.getItem("avatar");
    const n = localStorage.getItem("displayName");
    if (a) setAvatarDataUrl(a);
    if (n) setDisplayName(n);
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data: catRows } = await supabase
        .from("categories_v2")
        .select("id, name")
        .eq("user_id", user.id)
        .order("id", { ascending: true });

      const catMap = new Map((catRows ?? []).map((c: any) => [c.id, c.name]));
      setCategories(catRows ?? []);
      if ((catRows ?? []).length > 0 && !newCategoryId) {
        setNewCategoryId(catRows![0].id);
        setNewCategory(catRows![0].name);
      }

      const { data: folderRows } = await supabase
        .from("folders")
        .select("id, name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setFolders(folderRows ?? []);

      const { data } = await supabase.from("tasks_v2")
        .select("id, title, description, priority, category_id, is_completed, due_date, folder_id, status, created_at")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      setTasks((data ?? []).map((row: any) => ({
        id: row.id,
        text: row.title,
        description: row.description ?? "",
        priority: intToPriority(row.priority),
        category: catMap.get(row.category_id) ?? "Other",
        done: row.is_completed,
        due: row.due_date ?? "",
        categoryId: row.category_id,
        folderId: row.folder_id ?? null,
        status: row.status ?? "not_started",
        created: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      })));
    };
    load();
  }, [authReady, newCategoryId]);

  useEffect(() => {
    const saved = localStorage.getItem(`timeblocks_${selectedDate}`);
    if (saved) {
      try { setBlocks(JSON.parse(saved)); }
      catch { setBlocks([]); }
    } else setBlocks([]);
  }, [selectedDate]);

  useEffect(() => {
    setNewDue(selectedDate);
  }, [selectedDate]);

  const saveBlocks = (newBlocks: TimeBlock[]) => {
    setBlocks(newBlocks);
    blocksRef.current = newBlocks;
    localStorage.setItem(`timeblocks_${selectedDate}`, JSON.stringify(newBlocks));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    ["tasks","folders","categories","avatar","displayName","userEmail"].forEach(k => localStorage.removeItem(k));
    router.push("/login");
  };

  const getInitials = (name = displayName) =>
    name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  const formatDateLabel = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

  const getTaskScheduledDays = (taskId: number): string[] => {
    const days: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("timeblocks_")) continue;
      const date = key.replace("timeblocks_", "");
      if (date === selectedDate) continue;
      try {
        const stored = JSON.parse(localStorage.getItem(key) || "[]") as TimeBlock[];
        if (stored.some(b => b.taskId === taskId)) days.push(date);
      } catch {}
    }
    return days;
  };

  const resetAddForm = () => {
    setNewTask("");
    setNewDescription("");
    setNewDue(selectedDate);
    setNewPriority("Low");
    setNewStatus("not_started");
    setNewTaskFolder(null);
    if (categories.length > 0) {
      setNewCategoryId(categories[0].id);
      setNewCategory(categories[0].name);
    } else {
      setNewCategoryId(null);
      setNewCategory("");
    }
  };

  const openAddModal = () => {
    resetAddForm();
    setShowAddModal(true);
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) {
      alert("Task name is required");
      return;
    }
    if (!newCategoryId) {
      alert("Please select a category");
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return;

    const payload = {
      user_id: user.id,
      category_id: newCategoryId,
      folder_id: newTaskFolder ?? null,
      title: newTask.trim(),
      description: newDescription.trim() || null,
      due_date: newDue || null,
      priority: priorityToInt(newPriority),
      is_completed: false,
      status: newStatus,
    };

    const { data, error } = await supabase
      .from("tasks_v2")
      .insert(payload)
      .select("id, created_at")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setTasks(prev => [
      {
        id: data.id,
        text: payload.title,
        description: payload.description ?? "",
        priority: newPriority,
        category: newCategory,
        done: false,
        due: payload.due_date ?? "",
        categoryId: newCategoryId,
        folderId: newTaskFolder ?? null,
        status: newStatus,
        created: new Date(data.created_at).getTime(),
      },
      ...prev,
    ]);

    setShowAddModal(false);
    resetAddForm();
    setMobileTab("tasks");
  };

  const handleTaskDragStart = (e: React.DragEvent, task: Task) => {
    setDraggingTask(task); draggingTaskRef.current = task;
    setDraggingBlock(null); draggingBlockRef.current = null;
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleBlockDragStart = (e: React.DragEvent, block: TimeBlock) => {
    e.stopPropagation();
    setDraggingBlock(block); draggingBlockRef.current = block;
    setDraggingTask(null); draggingTaskRef.current = null;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleScheduleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!scheduleRef.current) return;
    const rect = scheduleRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + scheduleRef.current.scrollTop;
    const totalMins = (y / HOUR_HEIGHT) * 60;
    const snapped = Math.round(totalMins / 15) * 15;
    const h = Math.floor(snapped / 60);
    const m = snapped % 60;
    setDragOverHour(Math.min(h, 23));
    setDragOverMin(Math.min(m, 45));
  };

  const handleScheduleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const h = dragOverHour ?? 9;
    const m = dragOverMin;
    if (draggingBlock) {
      saveBlocks(blocks.map(b => b.id === draggingBlock.id ? { ...b, startHour: h, startMin: m } : b));
      setDraggingBlock(null); draggingBlockRef.current = null;
    } else if (draggingTask) {
      const scheduled = getTaskScheduledDays(draggingTask.id);
      setPendingTask(draggingTask); setPendingHour(h); setPendingMin(m);
      setDurationHrs(1); setDurationMins(0);
      setBlockColor(BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)]);
      setDraggingTask(null); draggingTaskRef.current = null;
      if (scheduled.length > 0) {
        setConflictDays(scheduled);
        setShowConflictModal(true);
      } else {
        setShowDurationModal(true);
      }
    }
    setDragOverHour(null);
    dragOverHourRef.current = null;
  };

  const computeHourMin = useCallback((clientY: number) => {
    if (!scheduleRef.current) return { h: 9, m: 0 };
    const rect = scheduleRef.current.getBoundingClientRect();
    const y = clientY - rect.top + scheduleRef.current.scrollTop;
    const totalMins = (y / HOUR_HEIGHT) * 60;
    const snapped = Math.round(totalMins / 15) * 15;
    const h = Math.min(Math.floor(snapped / 60), 23);
    const m = Math.min(snapped % 60, 45);
    return { h, m };
  }, []);

  const handleTaskTouchStart = useCallback((_e: React.TouchEvent, task: Task) => {
    isTouchDraggingRef.current = true;
    draggingTaskRef.current = task;
    draggingBlockRef.current = null;
    setDraggingTask(task);
    setDraggingBlock(null);
  }, []);

  const handleBlockTouchStart = useCallback((e: React.TouchEvent, block: TimeBlock) => {
    e.stopPropagation();
    isTouchDraggingRef.current = true;
    draggingBlockRef.current = block;
    draggingTaskRef.current = null;
    setDraggingBlock(block);
    setDraggingTask(null);
  }, []);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!isTouchDraggingRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (!scheduleRef.current) return;
      const rect = scheduleRef.current.getBoundingClientRect();
      if (
        touch.clientX >= rect.left && touch.clientX <= rect.right &&
        touch.clientY >= rect.top && touch.clientY <= rect.bottom
      ) {
        const { h, m } = computeHourMin(touch.clientY);
        dragOverHourRef.current = h;
        dragOverMinRef.current = m;
        setDragOverHour(h);
        setDragOverMin(m);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!isTouchDraggingRef.current) return;
      isTouchDraggingRef.current = false;

      const touch = e.changedTouches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const scheduleEl = scheduleRef.current;
      const overSchedule = scheduleEl && (scheduleEl === el || scheduleEl.contains(el as Node));

      if (overSchedule) {
        const h = dragOverHourRef.current ?? 9;
        const m = dragOverMinRef.current;
        const currentDraggingBlock = draggingBlockRef.current;
        const currentDraggingTask = draggingTaskRef.current;

        if (currentDraggingBlock) {
          saveBlocks(blocksRef.current.map(b =>
            b.id === currentDraggingBlock.id ? { ...b, startHour: h, startMin: m } : b
          ));
          setDraggingBlock(null); draggingBlockRef.current = null;
        } else if (currentDraggingTask) {
          const scheduled = getTaskScheduledDays(currentDraggingTask.id);
          setPendingTask(currentDraggingTask); setPendingHour(h); setPendingMin(m);
          setDurationHrs(1); setDurationMins(0);
          setBlockColor(BLOCK_COLORS[Math.floor(Math.random() * BLOCK_COLORS.length)]);
          setDraggingTask(null); draggingTaskRef.current = null;
          if (scheduled.length > 0) {
            setConflictDays(scheduled);
            setShowConflictModal(true);
          } else {
            setShowDurationModal(true);
          }
          setMobileTab("schedule");
        }
      } else {
        setDraggingTask(null); draggingTaskRef.current = null;
        setDraggingBlock(null); draggingBlockRef.current = null;
      }

      setDragOverHour(null);
      dragOverHourRef.current = null;
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [computeHourMin, selectedDate]);

  const handleConflictChoice = (choice: "split" | "move") => {
    if (choice === "move") {
      conflictDays.forEach(date => {
        const key = `timeblocks_${date}`;
        try {
          const stored = JSON.parse(localStorage.getItem(key) || "[]") as TimeBlock[];
          const updated = stored.filter(b => b.taskId !== pendingTask?.id);
          if (updated.length > 0) localStorage.setItem(key, JSON.stringify(updated));
          else localStorage.removeItem(key);
        } catch {}
      });
    }
    setShowConflictModal(false);
    setShowDurationModal(true);
  };

  const confirmBlock = () => {
    if (!pendingTask) return;
    const totalDuration = durationHrs * 60 + durationMins;
    if (totalDuration === 0) return alert("Please set a duration");
    const newBlock: TimeBlock = {
      id: `${Date.now()}-${Math.random()}`,
      taskId: pendingTask.id,
      startHour: pendingHour,
      startMin: pendingMin,
      durationMins: totalDuration,
      color: blockColor
    };
    saveBlocks([...blocks, newBlock]);
    setShowDurationModal(false);
    setPendingTask(null);
  };

  const removeBlock = (blockId: string) => saveBlocks(blocks.filter(b => b.id !== blockId));

  const goDay = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const today = new Date().toISOString().slice(0, 10);
  const displayDate = new Date(selectedDate + "T00:00:00");
  const dateLabel = displayDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const now = new Date();
  const currentMinTotal = now.getHours() * 60 + now.getMinutes();
  const isToday = selectedDate === today;

  const visibleTasks = hideCompleted ? tasks.filter(t => !t.done) : tasks;
  const unscheduledTasks = visibleTasks.filter(task => !blocks.some(b => b.taskId === task.id));
  const scheduledTaskIds = new Set(blocks.map(b => b.taskId));

  const inputStyle = {
    background: t.inputBg,
    color: t.text,
    border: `1px solid ${t.border}`,
  };

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    .fade-in { animation: fadeIn 0.25s ease-out forwards; }
    .modal-in { animation: modalIn 0.22s ease-out forwards; }
    .slide-up { animation: slideUp 0.3s ease-out forwards; }
    .task-chip { transition: all 0.15s ease; cursor: grab; user-select: none; }
    .task-chip:hover { transform: translateX(3px); box-shadow: 2px 2px 12px rgba(0,0,0,0.15); }
    .task-chip:active { cursor: grabbing; opacity: 0.6; transform: scale(0.98); }
    .block-item { transition: box-shadow 0.15s ease, opacity 0.15s ease; }
    .block-item:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.35); }
    .hour-row:nth-child(even) { background: ${isDark ? "rgba(255,255,255,0.012)" : "rgba(0,0,0,0.012)"}; }
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
    select option { background: ${t.surface}; color: ${t.text}; }
    input[type="date"]::-webkit-calendar-picker-indicator { filter: ${isDark ? "invert(1)" : "none"}; }
    .block-delete-btn { opacity: 1; }
    @media (hover: hover) and (pointer: fine) {
      .block-delete-btn { opacity: 0; transition: opacity 0.15s; }
      .group:hover .block-delete-btn { opacity: 1; }
    }
  `;

  if (!authReady) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
      <div className="text-center"><div className="text-5xl mb-4">🐝</div><div className="text-sm font-medium" style={{ color: t.textDim }}>Loading your schedule...</div></div>
    </div>
  );

  const taskPanelContent = (
    <>
      <div className="p-4" style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>Your Tasks</div>
          <div className="flex items-center gap-2">
            <button
              onClick={openAddModal}
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold"
              style={{ background: t.accent, color: t.accentText }}
              aria-label="Add task"
            >
              +
            </button>
            <button onClick={() => setHideCompleted(p => !p)}
              className="text-xs px-2 py-1 rounded-lg font-medium transition-colors"
              style={{ background: hideCompleted ? t.accent + "20" : t.surfaceHover, color: hideCompleted ? t.accent : t.textDim }}>
              {hideCompleted ? "Hide Done" : "Show All"}
            </button>
          </div>
        </div>
        <div className="text-xs" style={{ color: t.textDim }}>
          <span className="hidden md:inline">Drag tasks onto the schedule →</span>
          <span className="md:hidden">Tap & hold, then drag to schedule tab</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-xs" style={{ color: t.textDim }}>No tasks yet</p>
            <button
              onClick={openAddModal}
              className="text-xs font-semibold mt-2"
              style={{ color: t.accent }}
            >
              Add your first task →
            </button>
          </div>
        ) : (
          <>
            {unscheduledTasks.length > 0 && (
              <div>
                <div className="text-xs font-semibold px-1 mb-2" style={{ color: t.textDim }}>UNSCHEDULED ({unscheduledTasks.length})</div>
                {unscheduledTasks.map(task => {
                  const pc = priorityColor(task.priority, isDark);
                  return (
                    <div key={task.id} className="task-chip p-3 rounded-xl mb-2"
                      draggable
                      onDragStart={e => handleTaskDragStart(e, task)}
                      onTouchStart={e => handleTaskTouchStart(e, task)}
                      style={{ background: t.surfaceHover, border: `1px solid ${t.border}`, borderLeft: `3px solid ${pc}` }}>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: pc }} />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: task.done ? t.textDim : t.text, textDecoration: task.done ? "line-through" : "none" }}>{task.text}</div>
                          {task.due && <div className="text-xs mt-0.5" style={{ color: t.textDim }}>📅 {task.due}</div>}
                          <div className="text-xs mt-0.5" style={{ color: t.textDim }}>{task.category}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {visibleTasks.filter(tk => scheduledTaskIds.has(tk.id)).length > 0 && (
              <div>
                <div className="text-xs font-semibold px-1 mb-2 mt-4" style={{ color: t.textDim }}>SCHEDULED ({visibleTasks.filter(tk => scheduledTaskIds.has(tk.id)).length})</div>
                {visibleTasks.filter(tk => scheduledTaskIds.has(tk.id)).map(task => {
                  const pc = priorityColor(task.priority, isDark);
                  return (
                    <div key={task.id} className="task-chip p-3 rounded-xl mb-2 opacity-60"
                      draggable
                      onDragStart={e => handleTaskDragStart(e, task)}
                      onTouchStart={e => handleTaskTouchStart(e, task)}
                      style={{ background: t.surfaceHover, border: `1px solid ${t.border}`, borderLeft: `3px solid ${pc}` }}>
                      <div className="flex items-start gap-2">
                        <span className="text-xs mt-0.5">✓</span>
                        <div className="text-xs font-semibold truncate" style={{ color: t.textDim }}>{task.text}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  return (
    <main style={{ minHeight: "100vh", background: t.bg, color: t.text, transition: "background 0.3s ease" }}>
      <style>{inlineStyles}</style>

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

      <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: isDark ? "rgba(17,17,19,0.92)" : "rgba(255,250,243,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${t.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, color: t.textMuted }}>☰</button>
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>DO BEE</div>
            <div className="text-xl font-bold" style={{ color: t.text }}>Time Blocking</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>{isDark ? "☀️" : "🌙"}</button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: t.accent, color: t.accentText }}>
            {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" /> : getInitials()}
          </div>
        </div>
      </header>

      <div className="md:hidden flex border-b" style={{ background: t.surface, borderColor: t.border }}>
        <button
          onClick={() => setMobileTab("tasks")}
          className="flex-1 py-3 text-sm font-semibold transition-colors"
          style={{
            color: mobileTab === "tasks" ? t.accent : t.textMuted,
            borderBottom: mobileTab === "tasks" ? `2px solid ${t.accent}` : "2px solid transparent",
          }}>
          📝 Tasks
        </button>
        <button
          onClick={() => setMobileTab("schedule")}
          className="flex-1 py-3 text-sm font-semibold transition-colors"
          style={{
            color: mobileTab === "schedule" ? t.accent : t.textMuted,
            borderBottom: mobileTab === "schedule" ? `2px solid ${t.accent}` : "2px solid transparent",
          }}>
          ⏱ Schedule
        </button>
      </div>

      <div className="flex h-[calc(100vh-73px)] md:h-[calc(100vh-73px)]">
        <div
          className={`flex-shrink-0 flex flex-col overflow-hidden slide-up
            ${mobileTab === "tasks" ? "flex w-full md:w-72" : "hidden md:flex md:w-72"}`}
          style={{ background: t.surface, borderRight: `1px solid ${t.border}` }}>
          {taskPanelContent}
        </div>

        <div className={`flex-col overflow-hidden
          ${mobileTab === "schedule" ? "flex flex-1" : "hidden md:flex md:flex-1"}`}>
          <div className="px-4 md:px-6 py-3 flex items-center justify-between flex-shrink-0 flex-wrap gap-2"
            style={{ borderBottom: `1px solid ${t.border}`, background: t.bg }}>
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <button onClick={() => goDay(-1)} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted }}>←</button>
              <button onClick={() => setSelectedDate(today)} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0"
                style={{ background: selectedDate === today ? t.accent : t.surface, color: selectedDate === today ? t.accentText : t.textMuted, border: `1px solid ${t.border}` }}>Today</button>
              <button onClick={() => goDay(1)} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: t.surface, border: `1px solid ${t.border}`, color: t.textMuted }}>→</button>
              <div className="min-w-0">
                <div className="text-sm md:text-base font-bold truncate" style={{ color: t.text }}>{dateLabel}</div>
                <div className="text-xs" style={{ color: t.textDim }}>
                  {blocks.length > 0
                    ? `${blocks.length} block${blocks.length !== 1 ? "s" : ""} · ${formatDuration(blocks.reduce((sum, b) => sum + b.durationMins, 0))} total`
                    : "No blocks yet — drag a task to schedule it"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="px-2 md:px-3 py-1.5 rounded-xl text-xs md:text-sm outline-none"
                style={{ background: t.surface, color: t.text, border: `1px solid ${t.border}` }} />
              {blocks.length > 0 && (
                <button onClick={() => { if (confirm("Clear all blocks for this day?")) saveBlocks([]); }}
                  className="px-2 md:px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={{ background: t.danger + "20", color: t.danger }}>Clear</button>
              )}
            </div>
          </div>

          <div ref={scheduleRef} className="flex-1 overflow-y-auto relative" onDragOver={handleScheduleDragOver} onDrop={handleScheduleDrop}>
            {(draggingTask || draggingBlock) && dragOverHour !== null && (
              <div className="absolute left-16 right-4 h-0.5 rounded-full z-20 pointer-events-none"
                style={{ top: (dragOverHour * 60 + dragOverMin) / 60 * HOUR_HEIGHT, background: t.accent }} />
            )}

            {isToday && (
              <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top: currentMinTotal / 60 * HOUR_HEIGHT }}>
                <div className="w-3 h-3 rounded-full ml-[52px] flex-shrink-0" style={{ background: t.danger }} />
                <div className="flex-1 h-0.5" style={{ background: t.danger, opacity: 0.6 }} />
              </div>
            )}

            {HOURS.map(hour => (
              <div key={hour} className="hour-row flex" style={{ height: HOUR_HEIGHT, borderBottom: `1px solid ${t.border}` }}>
                <div className="w-16 flex-shrink-0 flex items-start justify-end pr-3 pt-2">
                  <span className="text-xs font-semibold" style={{ color: hour % 6 === 0 ? t.textMuted : t.textDim, opacity: hour % 6 === 0 ? 1 : 0.7 }}>{formatHour(hour)}</span>
                </div>
                <div className="flex-1 relative" style={{ borderLeft: `1px solid ${t.border}` }}>
                  <div className="absolute left-0 right-0" style={{ top: "50%", borderTop: `1px dashed ${t.border}`, opacity: 0.3 }} />
                </div>
              </div>
            ))}

            {blocks.map(block => {
              const task = tasks.find(tk => tk.id === block.taskId);
              if (!task) return null;
              const topPx = (block.startHour * 60 + block.startMin) / 60 * HOUR_HEIGHT;
              const heightPx = Math.max(block.durationMins / 60 * HOUR_HEIGHT, 28);
              return (
                <div key={block.id} className="block-item absolute rounded-xl overflow-hidden z-10 group"
                  draggable
                  onDragStart={e => handleBlockDragStart(e, block)}
                  onTouchStart={e => handleBlockTouchStart(e, block)}
                  style={{ top: topPx + 1, left: 68, right: 12, height: heightPx - 2, background: block.color, cursor: "grab" }}>
                  <div className="p-2 h-full flex flex-col" style={{ background: "rgba(0,0,0,0.18)" }}>
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-xs font-bold text-white leading-tight truncate flex-1">{task.text}</div>
                    </div>
                    {heightPx > 40 && (
                      <div className="text-xs text-white mt-0.5" style={{ opacity: 0.85 }}>
                        {formatHour(block.startHour)}{block.startMin > 0 ? `:${String(block.startMin).padStart(2,"0")}` : ""} · {formatDuration(block.durationMins)}
                      </div>
                    )}
                    {heightPx > 60 && task.category && (
                      <div className="text-xs text-white mt-auto truncate" style={{ opacity: 0.7 }}>{task.category}</div>
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeBlock(block.id); }}
                    className="block-delete-btn absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                    style={{ background: "rgba(0,0,0,0.45)", color: "white" }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={openAddModal}
        className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
        style={{
          background: t.accent,
          color: t.accentText,
          boxShadow: `0 0 30px ${t.accent}50`,
        }}
        aria-label="Add task"
      >
        +
      </button>

      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 fade-in"
            onClick={() => setShowAddModal(false)}
          />
          <div
            className="relative w-full max-w-md rounded-3xl p-6 modal-in"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <h2 className="text-lg font-bold mb-5" style={{ color: t.text }}>
              Add Task
            </h2>

            <div className="space-y-3">
              <input
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={inputStyle}
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="Task name"
              />

              <textarea
                className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-none"
                style={inputStyle}
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Description"
                rows={2}
              />

              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={inputStyle}
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  className="px-4 py-3 rounded-xl outline-none text-sm"
                  style={inputStyle}
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as Priority)}
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>

                <select
                  className="px-4 py-3 rounded-xl outline-none text-sm"
                  style={inputStyle}
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as Status)}
                >
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  className="px-4 py-3 rounded-xl outline-none text-sm"
                  style={inputStyle}
                  value={newCategoryId ?? ""}
                  onChange={e => {
                    const id = Number(e.target.value);
                    const cat = categories.find(c => c.id === id);
                    setNewCategoryId(id);
                    setNewCategory(cat?.name ?? "");
                  }}
                >
                  {categories.length === 0 ? (
                    <option value="">No categories</option>
                  ) : (
                    categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))
                  )}
                </select>

                <select
                  className="px-4 py-3 rounded-xl outline-none text-sm"
                  style={inputStyle}
                  value={newTaskFolder ?? ""}
                  onChange={e => setNewTaskFolder(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">No Folder</option>
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium"
                  style={{ background: t.surfaceHover, color: t.textMuted }}
                >
                  Cancel
                </button>

                <button
                  onClick={handleAddTask}
                  className="flex-1 py-3 rounded-xl text-sm font-bold"
                  style={{ background: t.accent, color: t.accentText }}
                >
                  Save Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConflictModal && pendingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 fade-in" onClick={() => setShowConflictModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl p-6 modal-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <div className="text-3xl mb-3 text-center">⚠️</div>
            <h2 className="text-lg font-bold mb-2 text-center" style={{ color: t.text }}>Task Already Scheduled</h2>
            <p className="text-sm text-center mb-4" style={{ color: t.textDim }}>
              <strong style={{ color: t.text }}>{pendingTask.text}</strong> is already scheduled on:
            </p>
            <div className="rounded-xl p-3 mb-5 space-y-1" style={{ background: t.surfaceHover }}>
              {conflictDays.map(d => (
                <div key={d} className="flex items-center gap-2 text-sm" style={{ color: t.textMuted }}>
                  <span>📅</span><span>{formatDateLabel(d)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-center mb-4" style={{ color: t.textDim }}>What would you like to do?</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleConflictChoice("split")} className="w-full py-3 rounded-xl text-sm font-bold"
                style={{ background: t.accent, color: t.accentText }}>
                ✂️ Split — schedule on multiple days
              </button>
              <button onClick={() => handleConflictChoice("move")} className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{ background: t.surfaceHover, color: t.text, border: `1px solid ${t.border}` }}>
                📌 Move here — remove from other days
              </button>
              <button onClick={() => { setShowConflictModal(false); setPendingTask(null); }} className="w-full py-3 rounded-xl text-sm font-medium"
                style={{ color: t.textMuted }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDurationModal && pendingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 fade-in" onClick={() => setShowDurationModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl p-6 modal-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <h2 className="text-lg font-bold mb-1" style={{ color: t.text }}>Set Duration</h2>
            <p className="text-sm mb-5" style={{ color: t.textDim }}>How long will <strong style={{ color: t.text }}>{pendingTask.text}</strong> take?</p>
            <div className="p-3 rounded-xl mb-4 flex items-center gap-2" style={{ background: t.surfaceHover }}>
              <span className="text-lg">🕐</span>
              <span className="text-sm font-semibold" style={{ color: t.text }}>Starting at {formatHour(pendingHour)}{pendingMin > 0 ? `:${String(pendingMin).padStart(2, "0")}` : ""}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: t.textDim }}>Hours</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDurationHrs(Math.max(0, durationHrs - 1))} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: t.surfaceHover, color: t.text }}>−</button>
                  <div className="flex-1 text-center text-xl font-bold" style={{ color: t.text }}>{durationHrs}</div>
                  <button onClick={() => setDurationHrs(Math.min(12, durationHrs + 1))} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: t.surfaceHover, color: t.text }}>+</button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: t.textDim }}>Minutes</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setDurationMins(durationMins === 0 ? 45 : durationMins - 15)} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: t.surfaceHover, color: t.text }}>−</button>
                  <div className="flex-1 text-center text-xl font-bold" style={{ color: t.text }}>{String(durationMins).padStart(2, "0")}</div>
                  <button onClick={() => setDurationMins(durationMins === 45 ? 0 : durationMins + 15)} className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: t.surfaceHover, color: t.text }}>+</button>
                </div>
              </div>
            </div>
            {(durationHrs > 0 || durationMins > 0) && (
              <div className="text-center text-sm font-semibold mb-4" style={{ color: t.accent }}>{formatDuration(durationHrs * 60 + durationMins)} block</div>
            )}
            <div className="mb-5">
              <label className="text-xs font-semibold uppercase tracking-wider block mb-2" style={{ color: t.textDim }}>Block Color</label>
              <div className="flex gap-2 flex-wrap">
                {BLOCK_COLORS.map(color => (
                  <button key={color} onClick={() => setBlockColor(color)} className="w-7 h-7 rounded-full transition-all"
                    style={{ background: color, outline: blockColor === color ? `3px solid ${t.text}` : "none", outlineOffset: 2 }} />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDurationModal(false)} className="flex-1 py-3 rounded-xl text-sm font-medium" style={{ background: t.surfaceHover, color: t.textMuted }}>Cancel</button>
              <button onClick={confirmBlock} disabled={durationHrs === 0 && durationMins === 0} className="flex-1 py-3 rounded-xl text-sm font-bold"
                style={{ background: durationHrs > 0 || durationMins > 0 ? t.accent : t.borderStrong, color: durationHrs > 0 || durationMins > 0 ? t.accentText : t.textDim }}>
                Add to Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}