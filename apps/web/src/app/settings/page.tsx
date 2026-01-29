"use client";
import React, { useEffect, useState, useRef } from "react";
import { handleLogout } from "../auth/auth.ts"; // adjust path

const LIGHT_PINK = "#ffd6e8";
const presetCategories = ["School", "Work", "Personal", "Chores", "Fitness", "Other"];

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Kyathi Uyyala");

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [invites, setInvites] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");

  const [notifStatus, setNotifStatus] = useState("default");

  const searchRef = useRef<HTMLInputElement>(null);
  const [rawSearch, setRawSearch] = useState("");

  const categoryList = [...presetCategories, ...customCategories];

  // Load from storage
  useEffect(() => {
    const a = localStorage.getItem("avatar");
    const n = localStorage.getItem("displayName");
    const c = localStorage.getItem("categories");
    const i = localStorage.getItem("invites");

    if (a) setAvatarDataUrl(a);
    if (n) setDisplayName(n);
    if (c) try { setCustomCategories(JSON.parse(c)); } catch {}
    if (i) try { setInvites(JSON.parse(i)); } catch {}

    if (typeof Notification !== "undefined") {
      setNotifStatus(Notification.permission);
    }
  }, []);

  // Persist
  useEffect(() => {
    if (avatarDataUrl) localStorage.setItem("avatar", avatarDataUrl);
  }, [avatarDataUrl]);

  useEffect(() => {
    if (displayName) localStorage.setItem("displayName", displayName);
  }, [displayName]);

  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(customCategories));
  }, [customCategories]);

  const onAvatarUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const getInitials = (n = displayName) =>
    n.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase();

  const addCategory = () => {
    const v = newCategory.trim();
    if (!v) return;
    if (categoryList.includes(v)) return alert("Category already exists");
    setCustomCategories(prev => [...prev, v]);
    setNewCategory("");
  };

  const removeCategory = (cat: string) =>
    setCustomCategories(prev => prev.filter(c => c !== cat));

  const removeInvite = (email: string) => {
    const filtered = invites.filter(i => i !== email);
    setInvites(filtered);
    localStorage.setItem("invites", JSON.stringify(filtered));
  };

  const enableNotifications = () => {
    Notification.requestPermission().then(p => {
      setNotifStatus(p);
      if (p === "granted") new Notification("Notifications Enabled", { body: "You will now receive task reminders." });
    });
  };

  const sendTestNotification = () => {
    if (Notification.permission === "denied")
      return alert("Notifications are blocked in your browser settings.");

    if (Notification.permission === "default") return enableNotifications();

    new Notification("Test Notification", {
      body: "This is a test notification!",
    });
  };

  const inlineStyles = `
    @keyframes slideIn { from { transform: translateX(-12px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .animate-slide-in { animation: slideIn 260ms ease-out forwards; }
  `;

  return (
    <main
      className={`min-h-screen bg-[#fafafa] p-6 text-[#1a1a1a] transition-all ${
        sidebarOpen ? "ml-80" : "ml-0"
      }`}
    >
      <style>{inlineStyles}</style>

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 transform bg-[#FFFDF2] p-6 shadow-2xl transition-transform duration-300 rounded-r-3xl border-r border-yellow-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-extrabold">Do Bee</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg bg-[#1a1a1a] text-[#fffbe6] hover:bg-[#ffd6e8] hover:text-black transition"
          >
            ✕
          </button>
        </div>

      {/* LOGOUT BUTTON */}
          <div className="absolute bottom-6 left-0 w-full px-6">
            <button 
              onClick={handleLogout} 
              className="w-full py-3 rounded-xl bg-red-100 text-red-700 font-medium hover:bg-red-200 transition shadow-sm"
            >
              Logout
            </button>
          </div>

        {/* Avatar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            {avatarDataUrl ? (
              <img src={avatarDataUrl} alt="avatar" className="w-14 h-14 rounded-full object-cover shadow" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center font-semibold text-sm shadow">
                {getInitials()}
              </div>
            )}

            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full border shadow cursor-pointer text-xs"
            >
              ✎
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onAvatarUpload(f);
              }}
            />
          </div>

          <div>
            <div className="text-sm font-medium">{displayName}</div>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="text-xs mt-1 border rounded px-2 py-1"
            />
          </div>
        </div>

        {/* NAVIGATION (EXACT Icons From Dashboard) */}
        <nav className="space-y-3 animate-slide-in">
          {/* DASHBOARD */}
          <a
            href="/dashboard"
            className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow hover:bg-[#fff8d6] transition"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z"
                fill="#1a1a1a"
              />
            </svg>
            <span className="font-medium">Dashboard</span>
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

          {/* SETTINGS (Active) */}
          <a
            href="/settings"
            className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl shadow bg-[#ffd6e8] hover:bg-[#ffd6e8] transition"
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

        {/* Invites in Sidebar */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-2">Invited</h4>
          <ul className="text-xs text-[#1a1a1a] space-y-1 max-h-28 overflow-auto pr-2">
            {invites.length === 0 && <li className="text-[#1a1a1a]/50">No invites yet</li>}
            {invites.map(i => (
              <li key={i} className="flex items-center justify-between">
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      

      {/* TOP BAR */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-3 rounded-lg bg-[#1a1a1a] text-[#fffbe6] hover:bg-[#ffd6e8] hover:text-black transition"
              >
                ☰
              </button>
            )}

            {/* Search box (matches dashboard) */}
            <div className="relative">
              <div className="flex items-center bg-white rounded-3xl shadow-sm px-3 py-2 border border-transparent focus-within:ring-2 focus-within:ring-[#f5e99f] transition">
                <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-60 mr-2">
                  <path
                    d="M21 21l-4.35-4.35"
                    stroke="#6b6b6b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>

                <input
                  ref={searchRef}
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  placeholder="Search tasks, descriptions, categories..."
                  className="outline-none px-2 py-1 w-80 md:w-96 bg-transparent"
                />

                {rawSearch && (
                  <button
                    onClick={() => {
                      setRawSearch("");
                      searchRef.current?.focus();
                    }}
                    className="text-xs px-2 py-1 rounded-full hover:bg-gray-100"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-[#1a1a1a] text-right">
              <div className="font-semibold">Today</div>
              <div className="text-xs">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>

            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center shadow">
              {avatarDataUrl ? (
                <img src={avatarDataUrl} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="font-semibold">{getInitials()}</span>
              )}
            </div>
          </div>
        </div>

        {/* MAIN SETTINGS CONTENT */}
        <div className="max-w-3xl mx-auto space-y-10">

          {/* PROFILE */}
          <section className="bg-white p-6 rounded-2xl shadow-md border border-[#ffd6e8]/30">
            <h2 className="text-xl font-semibold mb-4">Profile</h2>

            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarDataUrl ? (
                  <img src={avatarDataUrl} className="h-20 w-20 rounded-full object-cover shadow" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-pink-200 to-yellow-100 flex items-center justify-center text-lg font-bold shadow">
                    {getInitials()}
                  </div>
                )}

                <label
                  htmlFor="avatar-up"
                  className="absolute -bottom-2 -right-2 p-2 rounded-full bg-white shadow cursor-pointer text-xs"
                >
                  ✎
                </label>
                <input
                  id="avatar-up"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onAvatarUpload(e.target.files?.[0])}
                />
              </div>

              <div className="flex-1">
                <label className="text-sm">Display Name</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full mt-1 border p-2 rounded-xl"
                />
              </div>
            </div>
          </section>

          {/* NOTIFICATIONS */}
          <section className="bg-white p-6 rounded-2xl shadow-md border border-[#f5e99f]/40">
            <h2 className="text-xl font-semibold mb-3">Notifications</h2>
            <p className="text-sm mb-3">Enable notifications for reminders and task completion alerts.</p>

            <div className="flex gap-3">
              <button
                onClick={enableNotifications}
                className="px-4 py-2 rounded-xl bg-[#fff8c2]"
              >
                {notifStatus === "granted" ? "Enabled" : "Enable Notifications"}
              </button>

              <button
                onClick={sendTestNotification}
                className="px-4 py-2 rounded-xl"
                style={{ background: LIGHT_PINK }}
              >
                Test Notification
              </button>
            </div>

            <div className="text-sm mt-3">
              Status: <b>{notifStatus}</b>
            </div>
          </section>

          {/* CUSTOM CATEGORIES */}
          <section className="bg-white p-6 rounded-2xl shadow-md border border-[#ffd6e8]/30">
            <h2 className="text-xl font-semibold mb-4">Custom Categories</h2>

            <div className="flex gap-2 mb-4">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category"
                className="flex-1 border p-2 rounded-xl"
              />
              <button
                onClick={addCategory}
                className="px-4 py-2 rounded-xl"
                style={{ background: LIGHT_PINK }}
              >
                Add
              </button>
            </div>

            <ul className="space-y-2">
              {customCategories.length === 0 && <p className="text-sm">No custom categories yet.</p>}

              {customCategories.map(cat => (
                <li key={cat} className="flex items-center justify-between bg-[#fff6f9] p-2 rounded-xl border">
                  <span>{cat}</span>
                  <button
                    onClick={() => removeCategory(cat)}
                    className="px-2 py-1 text-xs rounded-lg bg-red-100 hover:bg-red-200"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* INVITES */}
          <section className="bg-white p-6 rounded-2xl shadow-md border border-[#f5e99f]/40">
            <h2 className="text-xl font-semibold mb-4">Invited Users</h2>

            {invites.length === 0 ? (
              <p className="text-sm">No invites yet.</p>
            ) : (
              <ul className="space-y-2">
                {invites.map(email => (
                  <li key={email} className="flex items-center justify-between bg-[#fffdf2] p-2 rounded-xl border">
                    <span>{email}</span>
                    <button
                      onClick={() => removeInvite(email)}
                      className="px-2 py-1 text-xs rounded-lg bg-red-100 hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
