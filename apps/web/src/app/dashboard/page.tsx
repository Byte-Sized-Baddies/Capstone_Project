// UPDATED DASHBOARD WITH SIDEBAR, PRIORITY, CATEGORY, TODAY FILTER, AND BEE-THEME LABELS

"use client";
import { useState, useEffect } from "react";

interface Task {
  id: number;
  text: string;
  description: string;
  due: string;
  done: boolean;
  created: number;
  priority: "Low" | "Medium" | "High";
  category: string;
}

const presetCategories = ["School", "Work", "Personal", "Chores", "Fitness", "Other"];

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // FIXED
  const [editId, setEditId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState("added");
  const [filterToday, setFilterToday] = useState(false);

  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [newPriority, setNewPriority] = useState<"Low" | "Medium" | "High">("Low");
  const [newCategory, setNewCategory] = useState("School");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const categoryList = [...presetCategories, ...customCategories];

  // load tasks
  useEffect(() => {
    const saved = localStorage.getItem("tasks");
    const savedCat = localStorage.getItem("categories");
    if (saved) setTasks(JSON.parse(saved));
    if (savedCat) setCustomCategories(JSON.parse(savedCat));
  }, []);

  // save tasks and categories
  useEffect(() => localStorage.setItem("tasks", JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem("categories", JSON.stringify(customCategories)), [customCategories]);

  const handleAddOrEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    if (editId !== null) {
      setTasks(tasks.map(t => t.id === editId ? {
        ...t,
        text: newTask,
        description: newDescription,
        due: newDue || "No date",
        priority: newPriority,
        category: newCategory
      } : t));
      setEditId(null);
    } else {
      setTasks([
        ...tasks,
        {
          id: Date.now(),
          text: newTask,
          description: newDescription,
          due: newDue || "No date",
          done: false,
          created: Date.now(),
          priority: newPriority,
          category: newCategory
        },
      ]);
    }

    setNewTask("");
    setNewDescription("");
    setNewDue("");
    setNewPriority("Low");
    setNewCategory("School");
    setShowModal(false);
  };

  const beePriorityColor = {
    Low: "bg-[#fff8c2] text-[#5a5000]",
    Medium: "bg-[#f5e99f] text-[#3a3200]",
    High: "bg-[#1a1a1a] text-[#fffbe6]"
  };

  const beeCategoryColor = {
    School: "bg-[#fff8c2] text-[#5a5000]",
    Work: "bg-[#f5e99f] text-[#3a3200]",
    Personal: "bg-[#ffe680] text-[#4a3f00]",
    Chores: "bg-[#fff4a6] text-[#4a3f00]",
    Fitness: "bg-[#ffec70] text-[#4a3f00]",
    Other: "bg-[#ffeeb3] text-[#4a3f00]"
  };

  const toggleTask = (id: number) => setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));

  const handleEdit = (task: Task) => {
    setEditId(task.id);
    setNewTask(task.text);
    setNewDescription(task.description);
    setNewDue(task.due !== "No date" ? task.due : "");
    setNewPriority(task.priority);
    setNewCategory(task.category);
    setShowModal(true);
  };

  // Filter: Today's tasks only
  const today = new Date().toISOString().split("T")[0];
  const filtered = filterToday ? tasks.filter(t => t.due === today) : tasks;

  // Sorting
  const sortedTasks = [...filtered].sort((a, b) => {
    if (sortBy === "added") return b.created - a.created;
    if (sortBy === "due") return new Date(a.due).getTime() - new Date(b.due).getTime();
    if (sortBy === "alpha") return a.text.localeCompare(b.text);
    if (sortBy === "priority") return ["High", "Medium", "Low"].indexOf(a.priority) - ["High", "Medium", "Low"].indexOf(b.priority);
    if (sortBy === "category") return a.category.localeCompare(b.category);
    return 0;
  });

  const completed = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return (
    <main
      className={`min-h-screen bg-[#fafafa] p-6 relative text-[#1a1a1a] flex transition-all duration-300 ease-in-out ${
        sidebarOpen ? "ml-72" : "ml-0"
      }`}
    >

{/* SIDEBAR */}
<aside
  className={`fixed inset-y-0 left-0 z-40 w-72 transform border-r border-yellow-200 bg-[#FFFDF2] p-6 shadow-xl transition-transform duration-300 ease-in-out rounded-r-3xl
  ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
>
  <div className="flex justify-between items-center mb-8">
    <h2 className="text-2xl font-bold text-[#1a1a1a] drop-shadow-sm">Menu</h2>

    <button
      onClick={() => setSidebarOpen(false)}
      className="bg-[#1a1a1a] text-[#fffbe6] px-3 py-2 rounded-xl shadow-md hover:bg-yellow-400 hover:text-black transition"
    >
      ✕
    </button>
  </div>

  <nav className="flex flex-col space-y-4">
    <a
      href="/dashboard"
      className="bg-white text-black px-4 py-2 rounded-xl shadow hover:bg-yellow-100 transition"
    >
      Dashboard
    </a>
    <a
      href="/statistics"
      className="bg-white text-black px-4 py-2 rounded-xl shadow hover:bg-yellow-100 transition"
    >
      Statistics
    </a>
    <a
      href="/profile"
      className="bg-white text-black px-4 py-2 rounded-xl shadow hover:bg-yellow-100 transition"
    >
      Profile
    </a>
  </nav>
</aside>

{/* SIDEBAR OPEN BUTTON */}
{!sidebarOpen && (
  <button
    onClick={() => setSidebarOpen(true)}
    className="fixed top-4 left-4 bg-[#1a1a1a] text-[#fffbe6] px-4 py-2 rounded-xl shadow hover:bg-yellow-100 hover:text-black transition"
  >
    ☰
  </button>
)}



      {/* MAIN CONTENT */}
      <div className="flex-1 ml-0 md:ml-10">

        {/* HEADER */}
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold drop-shadow-sm">Do Bee Dashboard</h1>
        </header>

        {/* OVERVIEW */}
        <section className="bg-white shadow-md rounded-2xl p-6 mb-6 border border-[#f5e99f]/60">
          <h2 className="text-xl font-semibold mb-3">Overview</h2>
          <p className="text-sm mb-2">{completed} of {total} tasks completed — {progress}%</p>
          <div className="w-full h-3 bg-[#fff4a6] rounded-full">
            <div className="h-3 bg-[#f5e99f] rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </section>

        {/* SORT + FILTER */}
        <div className="flex justify-between mb-4">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border border-[#f5e99f] rounded-xl p-2 bg-white">
            <option value="added">Sort by Added</option>
            <option value="due">Sort by Due Date</option>
            <option value="alpha">Sort by A–Z</option>
            <option value="priority">Sort by Priority</option>
            <option value="category">Sort by Category</option>
          </select>

          <button
            onClick={() => setFilterToday(!filterToday)}
            className={`px-4 py-2 rounded-xl border ${filterToday ? "bg-[#f5e99f]" : "bg-white"}`}
          >
            Today's Tasks
          </button>
        </div>

        {/* TASK LIST */}
        <section className="bg-white shadow-md rounded-2xl p-6 mb-20 border border-[#f5e99f]/60">
          <h2 className="text-xl font-semibold mb-4">Your Tasks</h2>

          {sortedTasks.length === 0 ? (
            <p className="text-center text-gray-500">No tasks</p>
          ) : (
            <ul className="space-y-4">
              {sortedTasks.map(task => (
                <li
                  key={task.id}
                  className={`p-4 rounded-xl border flex justify-between ${
                    task.done ? "bg-[#fff4a6] line-through text-gray-600" : "bg-[#fffdf2]"
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-lg flex items-center gap-2">
                      {task.text}
                      <span className={`px-2 py-1 rounded-full text-xs ${beePriorityColor[task.priority]}`}>
                        {task.priority}
                      </span>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          (beeCategoryColor as any)[task.category] || "bg-[#ffeeb3]"
                        }`}
                      >
                        {task.category}
                      </span>
                    </p>

                    {task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}

                    <p className="text-xs text-gray-500 mt-1">
                      {task.due === "No date" ? "No due date" : task.due}
                    </p>
                  </div>

                  <div className="flex flex-col ml-4 space-y-2">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task.id)}
                      className="w-5 h-5 accent-[#f5e99f]"
                    />
                    <button onClick={() => handleEdit(task)} className="text-sm bg-[#f5e99f] px-2 py-1 rounded">✏️</button>
                    <button
                      onClick={() => setTasks(tasks.filter(t => t.id !== task.id))}
                      className="text-sm bg-red-300 px-2 py-1 rounded"
                    >
                      🗑️
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ADD TASK BUTTON */}
        <button
          onClick={() => { setEditId(null); setShowModal(true); }}
          className="fixed bottom-10 right-10 bg-[#1a1a1a] text-[#fffbe6] text-3xl rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
        >
          ➕
        </button>

        {/* MODAL */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm border border-[#f5e99f]/60">
              <h2 className="text-lg font-semibold mb-3">
                {editId ? "Edit Task" : "Add Task"}
              </h2>

              <form onSubmit={handleAddOrEdit} className="space-y-4">
                <input className="w-full border p-2 rounded-xl" value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Task name" />
                <textarea className="w-full border p-2 rounded-xl" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Description" />
                <input type="date" className="w-full border p-2 rounded-xl" value={newDue} onChange={e => setNewDue(e.target.value)} />

                {/* PRIORITY */}
                <select className="w-full border p-2 rounded-xl" value={newPriority} onChange={e => setNewPriority(e.target.value as any)}>
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>

                {/* CATEGORY */}
                <select className="w-full border p-2 rounded-xl" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
                  {categoryList.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Add custom category"
                  className="w-full border p-2 rounded-xl"
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (e.currentTarget.value.trim() !== "") {
                        setCustomCategories([...customCategories, e.currentTarget.value.trim()]);
                        setNewCategory(e.currentTarget.value.trim());
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />

                <div className="flex justify-end space-x-2">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded-xl">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#f5e99f] rounded-xl">{editId ? "Save" : "Add"}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
