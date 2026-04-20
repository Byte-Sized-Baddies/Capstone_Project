"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, getSessionSafe } from "../auth/supabaseClient";

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

type Status = "not_started" | "in_progress";
type Priority = "Low" | "Medium" | "High";

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
  taskUserId?: string;
}

type Folder = {
  id: number;
  name: string;
  owner: string;
  collaborators: string[];
  created: number;
};

type Category = {
  id: number;
  name: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const intToPriority = (v: number): Priority =>
  v === 2 ? "High" : v === 1 ? "Medium" : "Low";

const priorityToInt = (p: Priority) =>
  p === "Low" ? 0 : p === "Medium" ? 1 : 2;

export default function CalendarPage() {
  const router = useRouter();

  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("User");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "week">("month");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("Low");
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [newStatus, setNewStatus] = useState<Status>("not_started");
  const [newTaskFolder, setNewTaskFolder] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setIsDark(saved === "dark");
  }, []);

  const toggleTheme = () =>
    setIsDark((prev) => {
      localStorage.setItem("theme", !prev ? "dark" : "light");
      return !prev;
    });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error } = await getSessionSafe();
        if (error || !data.session) {
          router.push("/login");
          return;
        }

        const user = data.session.user;
        setUserId(user.id);

        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User";

        setDisplayName(name);
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setAuthReady(true);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_e, session) => {
        if (session) checkSession();
        else {
          setAuthReady(true);
          router.push("/login");
        }
      }
    );

    checkSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
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

    const loadCategories = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data: catRows } = await supabase
        .from("categories_v2")
        .select("id, name")
        .eq("user_id", user.id)
        .order("id", { ascending: true });

      if (catRows) {
        setCategories(catRows);

        if (catRows.length > 0) {
          setNewCategoryId(catRows[0].id);
          setNewCategory(catRows[0].name);
        }
      }
    };

    loadCategories();
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;

    const loadTasks = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data: catRows } = await supabase
        .from("categories_v2")
        .select("id, name")
        .eq("user_id", user.id);

      const catMap = new Map((catRows ?? []).map((c) => [c.id, c.name]));

      const { data, error } = await supabase
        .from("tasks_v2")
        .select(
          "id, title, description, due_date, is_completed, status, created_at, priority, category_id, folder_id, user_id"
        )
        .eq("user_id", user.id)
        .eq("is_archived", false);

      if (error) {
        console.error("Task load error:", error);
        return;
      }

      setTasks(
        (data ?? []).map((row) => ({
          id: row.id,
          text: row.title,
          description: row.description ?? "",
          due: row.due_date ?? "No date",
          done: row.is_completed,
          status: row.status as Status,
          created: new Date(row.created_at).getTime(),
          priority: intToPriority(row.priority),
          category: catMap.get(row.category_id) ?? "Other",
          categoryId: row.category_id,
          folderId: row.folder_id ?? null,
          taskUserId: row.user_id,
        }))
      );
    };

    loadTasks();
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;

    const loadFolders = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return;

      const { data: ownedRows } = await supabase
        .from("folders")
        .select("id, user_id, name, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const { data: memberRows } = await supabase
        .from("folder_members")
        .select("folder_id")
        .eq("user_id", user.id);

      const sharedFolderIds = [...new Set((memberRows ?? []).map((r) => r.folder_id))];
      const ownedIds = new Set((ownedRows ?? []).map((r) => r.id));
      const onlySharedIds = sharedFolderIds.filter((id) => !ownedIds.has(id));

      let sharedRows: any[] = [];
      if (onlySharedIds.length > 0) {
        const { data } = await supabase
          .from("folders")
          .select("id, user_id, name, created_at")
          .in("id", onlySharedIds);
        sharedRows = data ?? [];
      }

      const allRows = [...(ownedRows ?? []), ...sharedRows];

      setFolders(
        allRows.map((row) => ({
          id: row.id,
          name: row.name,
          owner: row.user_id,
          collaborators: [],
          created: new Date(row.created_at).getTime(),
        }))
      );
    };

    loadFolders();
  }, [authReady]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    ["tasks", "folders", "categories", "avatar", "displayName", "userEmail"].forEach(
      (k) => localStorage.removeItem(k)
    );
    router.push("/login");
  };

  const deleteTask = async (id: number) => {
    if (!confirm("Delete this task permanently?")) return;
    const { error } = await supabase.from("tasks_v2").delete().eq("id", id).eq("user_id", userId!);
    if (error) { alert(error.message); return; }
    setTasks(prev => prev.filter(tk => tk.id !== id));
    setShowTaskModal(false); setSelectedTask(null);
  };

  const archiveTask = async (id: number) => {
    const { error } = await supabase.from("tasks_v2").update({ is_archived: true }).eq("id", id).eq("user_id", userId!);
    if (error) { alert(error.message); return; }
    setTasks(prev => prev.filter(tk => tk.id !== id));
    setShowTaskModal(false); setSelectedTask(null);
  };

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const getWeekDates = (date: Date) => {
    const day = date.getDay();
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - day);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  };

  const formatDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isToday = (date: Date) => isSameDay(date, new Date());

  const getTasksForDate = (date: Date) => tasks.filter((tk) => tk.due === formatDate(date));

  const goToPrev = () => {
    if (view === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    }
  };

  const goToNext = () => {
    if (view === "month") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    }
  };

  const getInitials = (name = displayName) =>
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const priorityConfig = (priority: Priority) =>
    isDark
      ? {
          High: { bg: "#ef444430", text: "#f87171", dot: "#ef4444" },
          Medium: { bg: "#FFC10730", text: "#FFC107", dot: "#FFC107" },
          Low: { bg: "#22c55e30", text: "#4ade80", dot: "#22c55e" },
        }[priority]
      : {
          High: { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
          Medium: { bg: "#fef9c3", text: "#a16207", dot: "#eab308" },
          Low: { bg: "#dcfce7", text: "#15803d", dot: "#22c55e" },
        }[priority];

  const inputStyle = {
    background: t.inputBg,
    color: t.text,
    border: `1px solid ${t.border}`,
  };

  const resetAddForm = (date?: Date | null) => {
    setNewTask("");
    setNewDescription("");
    setNewPriority("Low");
    setNewStatus("not_started");
    setNewTaskFolder(null);
    setNewDue(date ? formatDate(date) : "");

    if (categories.length > 0) {
      setNewCategoryId(categories[0].id);
      setNewCategory(categories[0].name);
    } else {
      setNewCategoryId(null);
      setNewCategory("");
    }
  };

  const openAddModal = (date?: Date | null) => {
    resetAddForm(date ?? selectedDate);
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

    setTasks((prev) => [
      {
        id: data.id,
        text: payload.title,
        description: payload.description ?? "",
        due: payload.due_date ?? "No date",
        done: false,
        status: payload.status,
        created: new Date(data.created_at).getTime(),
        priority: newPriority,
        category: newCategory,
        categoryId: newCategoryId,
        folderId: newTaskFolder ?? null,
        taskUserId: user.id,
      },
      ...prev,
    ]);

    setShowAddModal(false);
    resetAddForm(selectedDate);
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    const prevMonthDays = getDaysInMonth(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          prevMonthDays - i
        ),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i),
        isCurrentMonth: true,
      });
    }

    for (let i = 1; i <= 42 - days.length; i++) {
      days.push({
        date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i),
        isCurrentMonth: false,
      });
    }

    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
        <div className="grid grid-cols-7" style={{ borderBottom: `1px solid ${t.border}` }}>
          {DAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-semibold uppercase tracking-wider"
              style={{ background: t.surface, color: t.textDim }}
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayTasks = getTasksForDate(day.date);
            const today = isToday(day.date);

            return (
              <div
                key={idx}
                className="min-h-[110px] p-2 cursor-pointer transition-colors"
                style={{
                  background: today ? `${t.accent}15` : t.surface,
                  borderRight: idx % 7 !== 6 ? `1px solid ${t.border}` : "none",
                  borderBottom: `1px solid ${t.border}`,
                  opacity: day.isCurrentMonth ? 1 : 0.35,
                }}
                onClick={() => {
                  setSelectedDate(day.date);
                  setSelectedTask(null);
                  setShowTaskModal(true);
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full"
                    style={{
                      background: today ? t.accent : "transparent",
                      color: today ? t.accentText : t.text,
                    }}
                  >
                    {day.date.getDate()}
                  </span>

                  {dayTasks.length > 0 && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: t.accent + "30", color: t.accent }}
                    >
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayTasks.slice(0, 2).map((task) => {
                    const pc = priorityConfig(task.priority);

                    return (
                      <div
                        key={task.id}
                        className="text-xs px-2 py-1 rounded-lg truncate font-medium"
                        style={{ background: pc.bg, color: pc.text }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                          setSelectedDate(day.date);
                          setShowTaskModal(true);
                        }}
                      >
                        {task.text}
                      </div>
                    );
                  })}

                  {dayTasks.length > 2 && (
                    <div className="text-xs pl-1" style={{ color: t.textDim }}>
                      +{dayTasks.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);

    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
        <div
          className="grid grid-cols-7"
          style={{ borderBottom: `1px solid ${t.border}`, background: t.surface }}
        >
          {weekDates.map((date, idx) => {
            const today = isToday(date);
            const dayTasks = getTasksForDate(date);

            return (
              <div
                key={idx}
                className="py-4 px-2 text-center"
                style={{ borderRight: idx < 6 ? `1px solid ${t.border}` : "none" }}
              >
                <div className="text-xs uppercase tracking-wider mb-2" style={{ color: t.textDim }}>
                  {DAYS[date.getDay()]}
                </div>

                <div
                  className="text-2xl font-bold w-10 h-10 mx-auto flex items-center justify-center rounded-full mb-2"
                  style={{
                    background: today ? t.accent : "transparent",
                    color: today ? t.accentText : t.text,
                  }}
                >
                  {date.getDate()}
                </div>

                {dayTasks.length > 0 && (
                  <div
                    className="text-xs font-medium px-2 py-0.5 rounded-full mx-auto w-fit"
                    style={{ background: t.accent + "25", color: t.accent }}
                  >
                    {dayTasks.length} task{dayTasks.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-7" style={{ minHeight: 400 }}>
          {weekDates.map((date, idx) => {
            const dayTasks = getTasksForDate(date);
            const today = isToday(date);

            return (
              <div
                key={idx}
                className="p-2 cursor-pointer transition-colors"
                style={{
                  background: today ? `${t.accent}08` : t.surface,
                  borderRight: idx < 6 ? `1px solid ${t.border}` : "none",
                  minHeight: 400,
                }}
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedTask(null);
                  setShowTaskModal(true);
                }}
              >
                {dayTasks.length === 0 ? (
                  <div className="h-full flex items-center justify-center pt-8">
                    <div className="text-xl" style={{ color: t.borderStrong }}>
                      —
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pt-1">
                    {dayTasks.map((task) => {
                      const pc = priorityConfig(task.priority);

                      return (
                        <div
                          key={task.id}
                          className="p-2 rounded-xl cursor-pointer transition-all hover:opacity-80"
                          style={{ background: pc.bg, border: `1px solid ${pc.dot}30` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                            setSelectedDate(date);
                            setShowTaskModal(true);
                          }}
                        >
                          <div className="flex items-start gap-1.5">
                            <div
                              className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                              style={{ background: pc.dot }}
                            />
                            <div className="min-w-0">
                              <div
                                className="text-xs font-semibold leading-tight truncate"
                                style={{
                                  color: pc.text,
                                  textDecoration: task.done ? "line-through" : "none",
                                  opacity: task.done ? 0.6 : 1,
                                }}
                              >
                                {task.text}
                              </div>
                              <div
                                className="text-xs mt-0.5 truncate"
                                style={{ color: pc.text, opacity: 0.7 }}
                              >
                                {task.category}
                              </div>
                              {task.done && (
                                <div className="text-xs mt-0.5" style={{ color: t.success }}>
                                  ✓ Done
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .fade-in { animation: fadeIn 0.25s ease-out forwards; }
    .modal-in { animation: modalIn 0.22s ease-out forwards; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
    select option { background: ${t.surface}; color: ${t.text}; }
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: ${isDark ? "invert(1)" : "none"};
      opacity: 0.5;
    }
  `;

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🐝</div>
          <div className="text-sm font-medium" style={{ color: t.textDim }}>
            Loading your hive...
          </div>
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: t.bg,
        color: t.text,
        transition: "background 0.3s ease, color 0.3s ease",
      }}
    >
      <style>{inlineStyles}</style>

      {/* SIDEBAR */}
      <aside
        className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300"
        style={{
          background: t.surface,
          borderRight: `1px solid ${t.border}`,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐝</span>
              <span className="text-xl font-bold" style={{ color: t.accent }}>
                Do Bee
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t.surfaceHover }}
              >
                {isDark ? "☀️" : "🌙"}
              </button>

              <button
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t.surfaceHover, color: t.textMuted }}
              >
                ✕
              </button>
            </div>
          </div>

          <div
            className="flex items-center gap-3 mb-8 p-3 rounded-2xl"
            style={{ background: t.surfaceHover }}
          >
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ background: t.accent, color: t.accentText }}
              >
                {getInitials()}
              </div>
            )}

            <div className="text-sm font-semibold" style={{ color: t.text }}>
              {displayName}
            </div>
          </div>

          <nav className="space-y-1 mb-8">
            {[
              { href: "/dashboard", label: "Dashboard", icon: "⊞", active: false },
              { href: "/calendar", label: "Calendar", icon: "📅", active: true },
              { href: "/folders", label: "Folders", icon: "📁", active: false },
              { href: "/statistics", label: "Statistics", icon: "📊", active: false },
              { href: "/archive", label: "Archive", icon: "📦", active: false },
              { href: "/timeblocking", label: "Time Block", icon: "⏱", active: false },
              { href: "/notes", label: "Notes", icon: "📝", active: false },
              { href: "/integrations", label: "Integrations", icon: "🔌", active: false },
              { href: "/settings", label: "Settings", icon: "⚙️", active: false },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: item.active ? t.accent : "transparent",
                  color: item.active ? t.accentText : t.textMuted,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>

        <div className="p-6" style={{ borderTop: `1px solid ${t.border}` }}>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 rounded-xl text-sm font-medium"
            style={{ background: t.surfaceHover, color: t.danger }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* HEADER */}
      <header
        className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{
          background: isDark ? "rgba(17,17,19,0.92)" : "rgba(255,250,243,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: t.surfaceHover, color: t.textMuted }}
          >
            ☰
          </button>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>
              DO BEE
            </div>
            <div className="text-lg font-bold" style={{ color: t.text }}>
              Calendar
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>

          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden"
            style={{ background: t.accent, color: t.accentText }}
          >
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" />
            ) : (
              getInitials()
            )}
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{
                background: t.surface,
                border: `1px solid ${t.border}`,
                color: t.textMuted,
              }}
            >
              Today
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={goToPrev}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  color: t.textMuted,
                }}
              >
                ←
              </button>

              <button
                onClick={goToNext}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: t.surface,
                  border: `1px solid ${t.border}`,
                  color: t.textMuted,
                }}
              >
                →
              </button>
            </div>

            <h2 className="text-xl font-bold" style={{ color: t.text }}>
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>

          <div
            className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            {(["month", "week"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize"
                style={{
                  background: view === v ? t.accent : "transparent",
                  color: view === v ? t.accentText : t.textMuted,
                }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {view === "month" ? renderMonthView() : renderWeekView()}
      </div>

      {/* FAB */}
      <button
        onClick={() => openAddModal(selectedDate)}
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

      {/* TASK DETAIL / DAY MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 fade-in"
            onClick={() => {
              setShowTaskModal(false);
              setSelectedTask(null);
              setSelectedDate(null);
            }}
          />

          <div
            className="relative w-full max-w-md rounded-3xl p-6 modal-in"
            style={{ background: t.surface, border: `1px solid ${t.border}` }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: t.textDim }}
                >
                  {selectedDate ? formatDate(selectedDate) : "Tasks"}
                </div>

                <h2 className="text-lg font-bold" style={{ color: t.text }}>
                  {selectedTask
                    ? selectedTask.text
                    : selectedDate
                    ? `${getTasksForDate(selectedDate).length} Tasks`
                    : "Tasks"}
                </h2>
              </div>

              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setSelectedTask(null);
                  setSelectedDate(null);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: t.surfaceHover, color: t.textMuted }}
              >
                ✕
              </button>
            </div>

            {selectedTask ? (
              <div className="space-y-4">
                {selectedTask.description && (
                  <p className="text-sm" style={{ color: t.textMuted }}>
                    {selectedTask.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {(() => {
                    const pc = priorityConfig(selectedTask.priority);
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{ background: pc.bg, color: pc.text }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: pc.dot }}
                        />
                        {selectedTask.priority}
                      </span>
                    );
                  })()}

                  <span
                    className="text-xs px-2.5 py-1 rounded-full font-medium"
                    style={{ background: t.surfaceHover, color: t.textDim }}
                  >
                    {selectedTask.category}
                  </span>

                  {selectedTask.due !== "No date" && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ background: t.surfaceHover, color: t.textDim }}
                    >
                      {selectedTask.due}
                    </span>
                  )}
                </div>

                <div
                  className="flex items-center gap-2 p-3 rounded-xl"
                  style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: selectedTask.done ? t.accent : t.borderStrong,
                      background: selectedTask.done ? t.accent : "transparent",
                    }}
                  >
                    {selectedTask.done && (
                      <svg width="10" height="10" viewBox="0 0 10 10">
                        <path
                          d="M2 5l2 2 4-4"
                          stroke={t.accentText}
                          strokeWidth="2"
                          strokeLinecap="round"
                          fill="none"
                        />
                      </svg>
                    )}
                  </div>

                  <span className="text-sm" style={{ color: t.textMuted }}>
                    {selectedTask.done
                      ? "Completed"
                      : selectedTask.status === "in_progress"
                      ? "In Progress"
                      : "Not Started"}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => { setShowTaskModal(false); router.push("/dashboard"); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: t.accent, color: t.accentText }}
                  >
                    Dashboard →
                  </button>
                  {selectedTask.taskUserId === userId && (
                    <>
                      <button
                        onClick={() => archiveTask(selectedTask.id)}
                        className="px-3 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: t.surfaceHover, color: t.textMuted }}
                        title="Archive"
                      >
                        📦
                      </button>
                      <button
                        onClick={() => deleteTask(selectedTask.id)}
                        className="px-3 py-2.5 rounded-xl text-sm font-medium"
                        style={{ background: t.danger + "20", color: t.danger }}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : selectedDate ? (
              <div>
                {getTasksForDate(selectedDate).length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="text-3xl mb-3">🐝</div>
                    <p className="text-sm" style={{ color: t.textDim }}>
                      No tasks for this day
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {getTasksForDate(selectedDate).map((task) => {
                      const pc = priorityConfig(task.priority);

                      return (
                        <div
                          key={task.id}
                          className="p-3 rounded-xl cursor-pointer"
                          style={{ background: t.surfaceHover }}
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4
                                className="font-medium text-sm truncate"
                                style={{
                                  color: t.text,
                                  textDecoration: task.done ? "line-through" : "none",
                                  opacity: task.done ? 0.5 : 1,
                                }}
                              >
                                {task.text}
                              </h4>

                              {task.description && (
                                <p className="text-xs truncate mt-0.5" style={{ color: t.textDim }}>
                                  {task.description}
                                </p>
                              )}
                            </div>

                            <span
                              className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                              style={{ background: pc.bg, color: pc.text }}
                            >
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowTaskModal(false);
                    openAddModal(selectedDate);
                  }}
                  className="w-full py-3 rounded-xl text-sm font-bold mt-4"
                  style={{ background: t.accent, color: t.accentText }}
                >
                  Add Task
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ADD TASK MODAL */}
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
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Task name"
              />

              <textarea
                className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-none"
                style={inputStyle}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description"
                rows={2}
              />

              <input
                type="date"
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={inputStyle}
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  className="px-4 py-3 rounded-xl outline-none text-sm"
                  style={inputStyle}
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>

                <select
                  className="px-4 py-3 rounded-xl outline-none text-sm"
                  style={inputStyle}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as Status)}
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
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const cat = categories.find((c) => c.id === id);
                    setNewCategoryId(id);
                    setNewCategory(cat?.name ?? "");
                  }}
                >
                  {categories.length === 0 ? (
                    <option value="">No categories</option>
                  ) : (
                    categories.map((cat) => (
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
                  onChange={(e) =>
                    setNewTaskFolder(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">No Folder</option>
                  {folders.map((folder) => (
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
    </main>
  );
}