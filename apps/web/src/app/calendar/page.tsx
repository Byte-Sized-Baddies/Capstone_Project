// app/calendar/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../auth/supabaseClient";

type Status = "not_started" | "in_progress";

interface Task {
  id: number;
  text: string;
  description: string;
  due: string;
  done: boolean;
  status: Status;
  created: number;
  priority: "Low" | "Medium" | "High";
  category: string;
  folderId?: number | null;
}

type Folder = {
  id: number;
  name: string;
  owner: string;
  collaborators: string[];
  created: number;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const router = useRouter();
  
  // User state
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("User");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);

  // Tasks & folders
  const [tasks, setTasks] = useState<Task[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "week">("month");

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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

  // Load saved state
  useEffect(() => {
    const saved = localStorage.getItem("tasks");
    const savedFolders = localStorage.getItem("folders");
    const savedAvatar = localStorage.getItem("avatar");
    const savedName = localStorage.getItem("displayName");
    
    if (saved) {
      try { setTasks(JSON.parse(saved)); } catch { setTasks([]); }
    }
    if (savedFolders) {
      try { setFolders(JSON.parse(savedFolders)); } catch { setFolders([]); }
    }
    if (savedAvatar) setAvatarDataUrl(savedAvatar);
    if (savedName) setDisplayName(savedName);
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

  // Calendar utilities
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getWeekDates = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day;
    const sunday = new Date(date);
    sunday.setDate(diff);
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      week.push(d);
    }
    return week;
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isToday = (date: Date) => {
    return isSameDay(date, new Date());
  };

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return tasks.filter(t => t.due === dateStr);
  };

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Render month view
  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Previous month days
    const prevMonthDays = getDaysInMonth(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    for (let i = firstDay - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, prevMonthDays - i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        {DAYS.map(day => (
          <div key={day} className="bg-white p-3 text-center font-semibold text-sm text-gray-700">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {days.map((day, idx) => {
          const dayTasks = getTasksForDate(day.date);
          const isCurrentDay = isToday(day.date);
          
          return (
            <div
              key={idx}
              className={`bg-white min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 transition ${
                !day.isCurrentMonth ? "opacity-40" : ""
              } ${isCurrentDay ? "ring-2 ring-blue-500 ring-inset" : ""}`}
              onClick={() => {
                setSelectedDate(day.date);
                setShowTaskModal(true);
              }}
            >
              <div className={`text-sm font-medium mb-1 ${isCurrentDay ? "text-blue-600 font-bold" : "text-gray-700"}`}>
                {day.date.getDate()}
              </div>
              
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    className={`text-xs p-1 rounded truncate ${
                      task.done ? "bg-gray-100 text-gray-500 line-through" : 
                      task.priority === "High" ? "bg-red-100 text-red-700" :
                      task.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTask(task);
                      setShowTaskModal(true);
                    }}
                  >
                    {task.text}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-gray-500 pl-1">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const weekDates = getWeekDates(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col border border-gray-200 rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-8 bg-white border-b border-gray-200">
          <div className="p-3 text-center text-sm font-semibold text-gray-700"></div>
          {weekDates.map((date, idx) => {
            const isCurrentDay = isToday(date);
            return (
              <div
                key={idx}
                className={`p-3 text-center ${isCurrentDay ? "bg-blue-50" : ""}`}
              >
                <div className="text-xs text-gray-500">{DAYS[date.getDay()]}</div>
                <div className={`text-lg font-semibold ${isCurrentDay ? "text-blue-600" : "text-gray-700"}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time slots */}
        <div className="overflow-y-auto max-h-[600px]">
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-gray-100">
              <div className="p-2 text-xs text-gray-500 text-right pr-4">
                {hour === 0 ? "12 AM" : hour < 12 ? `${hour} AM` : hour === 12 ? "12 PM" : `${hour - 12} PM`}
              </div>
              {weekDates.map((date, idx) => {
                const dayTasks = getTasksForDate(date);
                const isCurrentDay = isToday(date);
                
                return (
                  <div
                    key={idx}
                    className={`min-h-[60px] p-1 cursor-pointer hover:bg-gray-50 transition ${
                      isCurrentDay ? "bg-blue-50/30" : "bg-white"
                    }`}
                    onClick={() => {
                      setSelectedDate(date);
                      setShowTaskModal(true);
                    }}
                  >
                    {hour === 9 && dayTasks.map(task => (
                      <div
                        key={task.id}
                        className={`text-xs p-1 mb-1 rounded truncate ${
                          task.done ? "bg-gray-100 text-gray-500 line-through" : 
                          task.priority === "High" ? "bg-red-100 text-red-700" :
                          task.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                          "bg-blue-100 text-blue-700"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                          setShowTaskModal(true);
                        }}
                      >
                        {task.text}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const toggleDone = (id: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, done: !t.done };
        return updated;
      }
      return t;
    }));
    localStorage.setItem("tasks", JSON.stringify(tasks));
  };

  const getInitials = (name = displayName) => {
    return name.split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase();
  };

  const inlineStyles = `
    @keyframes slideIn { from { transform: translateX(-12px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
    .animate-slide-in { animation: slideIn 260ms ease-out forwards; }
  `;

  if (loading) {
    return <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">Loading...</div>;
  }

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
              <img src={avatarDataUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover shadow" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center font-semibold text-sm shadow">{getInitials()}</div>
            )}
          </div>
          <div>
            <div className="text-sm font-medium">{displayName}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-3 animate-slide-in mb-6">
          <a className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow hover:bg-[#fff8d6] transition" href="/dashboard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="#1a1a1a" /></svg>
            <span className="font-medium">Dashboard</span>
          </a>

          {/* CALENDAR (Active) */}
          <a
            href="/calendar"
            className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow bg-[#ffd6e8] hover:bg-[#ffd6e8] transition"
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
              <path d="M12 8a4 4 0 100 8 4 4 0 000-8zM21.4 10.11c.04.29.06.58.06.89s-.02.6-.06.89l2.05 1.6a1 1 0 01.22 1.29l-1.94 3.36a1 1 0 01-1.22.44l-2.42-.97a7.4 7.4 0 01-1.55.9l-.78 2.41a1 1 0 01-.97.6h-5.26a1 1 0 01-.97-.6l-.78-2.41a7.36 7.36 0 01-1.55-.9l-2.42.97a1 1 0 01-1.22-.44L.48 13.18a1 1 0 01.22-1.29l2.05-1.6A7.3 7.3 0 003 9.11V8z" fill="#1a1a1a" />
            </svg>
            <span className="font-medium">Settings</span>
          </a>
        </nav>

        {/* Folders Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Folders</h4>
          </div>

          <button 
            onClick={() => router.push("/dashboard")}
            className="w-full text-left px-3 py-2 rounded-lg mb-2 transition hover:bg-white"
          >
            📂 All Tasks ({tasks.length})
          </button>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {folders.map(folder => {
              const taskCount = tasks.filter(t => t.folderId === folder.id).length;
              
              return (
                <div key={folder.id} className="px-3 py-2 rounded-lg transition hover:bg-white">
                  <button 
                    onClick={() => router.push("/dashboard")}
                    className="flex-1 text-left text-sm w-full"
                  >
                    <span className="font-medium">📁 {folder.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({taskCount})</span>
                  </button>
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

            <h1 className="text-3xl font-bold">Calendar</h1>
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

        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goToToday} className="px-4 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition">
              Today
            </button>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={view === "month" ? goToPreviousMonth : goToPreviousWeek}
                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition"
              >
                ←
              </button>
              <button 
                onClick={view === "month" ? goToNextMonth : goToNextWeek}
                className="p-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition"
              >
                →
              </button>
            </div>

            <h2 className="text-xl font-semibold">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setView("month")}
              className={`px-4 py-2 rounded-lg transition ${
                view === "month" ? "bg-[#f5e99f] font-medium" : "hover:bg-gray-50"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-4 py-2 rounded-lg transition ${
                view === "week" ? "bg-[#f5e99f] font-medium" : "hover:bg-gray-50"
              }`}
            >
              Week
            </button>
          </div>
        </div>

        {/* Calendar View */}
        {view === "month" ? renderMonthView() : renderWeekView()}
      </div>

      {/* Task Detail Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowTaskModal(false); setSelectedTask(null); setSelectedDate(null); }} />
          <div className="relative bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#f5e99f]/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {selectedDate ? formatDate(selectedDate) : "Tasks"}
              </h2>
              <button 
                onClick={() => { setShowTaskModal(false); setSelectedTask(null); setSelectedDate(null); }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {selectedTask ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-xl mb-2">{selectedTask.text}</h3>
                  <p className="text-sm text-gray-600">{selectedTask.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedTask.priority === "High" ? "bg-red-100 text-red-700" :
                    selectedTask.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {selectedTask.priority}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    {selectedTask.category}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t">
                  <input
                    type="checkbox"
                    checked={selectedTask.done}
                    onChange={() => {
                      toggleDone(selectedTask.id);
                      setSelectedTask({...selectedTask, done: !selectedTask.done});
                    }}
                    className="w-5 h-5 accent-[#f5e99f]"
                  />
                  <span className="text-sm">Mark as {selectedTask.done ? "incomplete" : "complete"}</span>
                </div>

                <button
                  onClick={() => { setShowTaskModal(false); setSelectedTask(null); router.push("/dashboard"); }}
                  className="w-full py-2 rounded-lg bg-[#f5e99f] hover:bg-[#ffe680] transition"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : selectedDate ? (
              <div className="space-y-3">
                {getTasksForDate(selectedDate).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No tasks for this day</p>
                ) : (
                  <div className="space-y-2">
                    {getTasksForDate(selectedDate).map(task => (
                      <div
                        key={task.id}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition"
                        onClick={() => setSelectedTask(task)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`font-medium ${task.done ? "line-through text-gray-500" : ""}`}>
                              {task.text}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.priority === "High" ? "bg-red-100 text-red-700" :
                            task.priority === "Medium" ? "bg-yellow-100 text-yellow-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => { setShowTaskModal(false); setSelectedDate(null); router.push("/dashboard"); }}
                  className="w-full py-2 rounded-lg bg-[#f5e99f] hover:bg-[#ffe680] transition mt-4"
                >
                  Add New Task
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
