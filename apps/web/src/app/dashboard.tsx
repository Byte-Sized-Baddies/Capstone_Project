"use client";

import { useState, useEffect } from "react";

interface Task {
  id: number;
  text: string;
  description: string;
  due: string;
  done: boolean;
  created: number;
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [newTask, setNewTask] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDue, setNewDue] = useState("");
  const [sortBy, setSortBy] = useState("added");

  // load tasks from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("tasks");
    if (saved) setTasks(JSON.parse(saved));
  }, []);

  // save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const handleAddOrEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    if (editId !== null) {
      // editing existing task
      setTasks(tasks.map(t =>
        t.id === editId
          ? { ...t, text: newTask, due: newDue, description: newDescription }
          : t
      ));
      setEditId(null);
    } else {
      // adding new task
      setTasks([
        ...tasks,
        {
          id: Date.now(),
          text: newTask,
          description: newDescription,
          due: newDue || "No date",
          done: false,
          created: Date.now(),
        },
      ]);
    }

    setNewTask("");
    setNewDue("");
    setNewDescription("");
    setShowModal(false);
  };

  const handleDelete = (id: number) => setTasks(tasks.filter(t => t.id !== id));

  const toggleTask = (id: number) =>
    setTasks(tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t)));

  const handleEdit = (task: Task) => {
    setEditId(task.id);
    setNewTask(task.text);
    setNewDescription(task.description);
    setNewDue(task.due !== "No date" ? task.due : "");
    setShowModal(true);
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === "added") return b.created - a.created;
    if (sortBy === "due") return new Date(a.due).getTime() - new Date(b.due).getTime();
    if (sortBy === "alpha") return a.text.localeCompare(b.text);
    if (sortBy === "done") return Number(a.done) - Number(b.done);
    return 0;
  });

  const completed = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#fafafa] p-6 relative text-[#1a1a1a]">
      {/* Header */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1a1a1a] drop-shadow-sm">
          Do Bee Dashboard
        </h1>
        <button className="bg-[#1a1a1a] text-[#fffbe6] px-4 py-2 rounded-full font-semibold hover:bg-[#3a3a3a] transition">
          Settings
        </button>
      </header>

      {/* Overview */}
      <section className="bg-white shadow-md rounded-2xl p-6 mb-6 border border-[#f5e99f]/60">
        <h2 className="text-xl font-semibold mb-3">Overview</h2>
        <div className="flex justify-between text-sm text-gray-700 mb-2">
          <p>{completed} of {total} tasks completed</p>
          <p>{progress}%</p>
        </div>
        <div className="w-full h-3 bg-[#fff4a6] rounded-full">
          <div
            className="h-3 bg-[#f5e99f] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </section>

      {/* Sort Controls */}
      <div className="flex justify-end mb-4">
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="border border-[#f5e99f] rounded-xl p-2 text-sm bg-white focus:ring-2 focus:ring-[#f5e99f] outline-none"
        >
          <option value="added">Sort by Added</option>
          <option value="due">Sort by Due Date</option>
          <option value="alpha">Sort by A–Z</option>
          <option value="done">Sort by Completed</option>
        </select>
      </div>

      {/* Task List */}
      <section className="bg-white shadow-md rounded-2xl p-6 mb-20 border border-[#f5e99f]/60">
        <h2 className="text-xl font-semibold mb-4">Your Tasks</h2>
        {sortedTasks.length === 0 ? (
          <p className="text-gray-500 italic text-center py-6">No tasks yet — add one!</p>
        ) : (
          <ul className="space-y-4">
            {sortedTasks.map(task => (
              <li
                key={task.id}
                className={`flex items-start justify-between p-3 rounded-lg border ${
                  task.done
                    ? "bg-[#fff4a6] line-through text-gray-600"
                    : "bg-[#fffdf2] hover:bg-[#fff8d3]"
                } transition`}
              >
                <div className="flex items-start space-x-3 w-full">
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    className="w-5 h-5 mt-1 accent-[#f5e99f]"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-base">{task.text}</p>
                    {task.description && (
                      <p className="text-sm text-gray-500 italic mt-1">
                        {task.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {task.due === "No date" ? "No due date" : task.due}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2 ml-3">
                  <button
                    onClick={() => handleEdit(task)}
                    className="text-sm px-2 py-1 rounded-md bg-[#f5e99f] hover:bg-[#f3e47d] transition"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-sm px-2 py-1 rounded-md bg-red-200 hover:bg-red-300 transition"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add Task Button */}
      <button
        onClick={() => {
          setEditId(null);
          setShowModal(true);
        }}
        className="fixed bottom-20 right-6 bg-[#1a1a1a] text-[#fffbe6] text-3xl rounded-full w-16 h-16 flex items-center justify-center shadow-lg hover:bg-[#3a3a3a] transition"
      >
        ➕
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-md py-3 flex justify-around text-lg border-t border-[#f5e99f]/60">
        <button className="text-[#444] hover:text-[#c5a600]">Home</button>
        <button className="text-[#444] hover:text-[#c5a600]">Statistics</button>
        <button className="text-[#444] hover:text-[#c5a600]">Profile</button>
      </nav>

      {/* Add/Edit Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm border border-[#f5e99f]/60">
            <h2 className="text-lg font-semibold mb-3">
              {editId ? "Edit Task" : "Add New Task"}
            </h2>
            <form onSubmit={handleAddOrEdit} className="space-y-4">
              <input
                type="text"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="Enter task..."
                className="w-full border border-[#f5e99f] p-2 rounded-xl focus:ring-2 focus:ring-[#f5e99f] outline-none text-[#2b2b2b]"
              />
              <textarea
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                placeholder="Add a description..."
                className="w-full border border-[#f5e99f] p-2 rounded-xl focus:ring-2 focus:ring-[#f5e99f] outline-none text-[#2b2b2b] h-24"
              />
              <input
                type="date"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
                className="w-full border border-[#f5e99f] p-2 rounded-xl focus:ring-2 focus:ring-[#f5e99f] outline-none text-[#2b2b2b]"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditId(null);
                    setNewTask("");
                    setNewDescription("");
                    setNewDue("");
                  }}
                  className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#f5e99f] text-[#1a1a1a] font-semibold hover:bg-[#f3e47d] transition"
                >
                  {editId ? "Save" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
