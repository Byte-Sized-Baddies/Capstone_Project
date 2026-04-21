"use client";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
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
interface Task { id: number; text: string; priority: Priority; due: string; }
interface Note {
  id: string; title: string; content: any;
  task_id: number | null; linked_note_ids: string[];
  created_at: string; updated_at: string;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "⊞", active: false },
  { href: "/calendar", label: "Calendar", icon: "📅", active: false },
  { href: "/folders", label: "Folders", icon: "📁", active: false },
  { href: "/statistics", label: "Statistics", icon: "📊", active: false },
  { href: "/archive", label: "Archive", icon: "📦", active: false },
  { href: "/timeblocking", label: "Time Block", icon: "⏱", active: false },
  { href: "/notes", label: "Notes", icon: "📝", active: true },
  { href: "/integrations", label: "Integrations", icon: "🔌", active: false },
  { href: "/settings", label: "Settings", icon: "⚙️", active: false },
];

const intToPriority = (v: number): Priority => v === 2 ? "High" : v === 1 ? "Medium" : "Low";

function NotesContent() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? darkTheme : lightTheme;

  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [linkedTaskId, setLinkedTaskId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showWikiModal, setShowWikiModal] = useState(false);
  const [sortNotes, setSortNotes] = useState<"updated" | "created" | "alpha">("updated");

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedNoteRef = useRef<Note | null>(null);
  selectedNoteRef.current = selectedNote;

  useEffect(() => { const s = localStorage.getItem("theme"); if (s) setIsDark(s === "dark"); }, []);
  const toggleTheme = () => setIsDark(p => { localStorage.setItem("theme", !p ? "dark" : "light"); return !p; });

  useEffect(() => {
    const check = async () => {
      try {
        const { data } = await getSessionSafe();
        if (!data.session) { router.push("/login"); return; }
        setUserId(data.session.user.id);
        const name = data.session.user.user_metadata?.full_name || data.session.user.email?.split("@")[0] || "User";
        setDisplayName(name);
        setUserEmail(data.session.user.email ?? "");
      } catch (e) {
        console.error("Auth check failed:", e);
      } finally {
        setAuthReady(true);
      }
    };
    const { data: l } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) check(); else { setAuthReady(true); router.push("/login"); }
    });
    check();
    return () => l.subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    const a = localStorage.getItem("avatar"); const n = localStorage.getItem("displayName");
    if (a) setAvatarDataUrl(a); if (n) setDisplayName(n);
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !userId) return;
    const load = async () => {
      const [{ data: notesData }, { data: tasksData }] = await Promise.all([
        supabase.from("notes_v2").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
        supabase.from("tasks_v2").select("id, title, priority, due_date").eq("user_id", userId).eq("is_archived", false),
      ]);
      setNotes(notesData ?? []);
      setTasks((tasksData ?? []).map((r: any) => ({
        id: r.id, text: r.title, priority: intToPriority(r.priority), due: r.due_date ?? "",
      })));
    };
    load();
  }, [authReady, userId]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      LinkExtension.configure({ openOnClick: false, HTMLAttributes: { class: "tiptap-link" } }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: "",
    editorProps: {
      attributes: { class: "prose-editor", style: `outline: none; min-height: 400px;` },
    },
    onUpdate: ({ editor }) => {
      if (!selectedNoteRef.current) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveNote(selectedNoteRef.current!.id, undefined, editor.getJSON()), 1500);
    },
  });

  const selectNote = useCallback((note: Note) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setLinkedTaskId(note.task_id);
    if (editor) editor.commands.setContent(note.content && Object.keys(note.content).length ? note.content : "");
  }, [editor]);

  const createNote = async () => {
    if (!userId) return;
    const { data, error } = await supabase.from("notes_v2").insert({ user_id: userId, title: "Untitled", content: {} }).select().single();
    if (error || !data) return;
    const newNote = data as Note;
    setNotes(prev => [newNote, ...prev]);
    selectNote(newNote);
  };

  const saveNote = async (noteId: string, title?: string, content?: any) => {
    setIsSaving(true);
    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    await supabase.from("notes_v2").update(updates).eq("id", noteId);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates } : n));
    setTimeout(() => setIsSaving(false), 500);
  };

  const saveTaskLink = async (noteId: string, taskId: number | null) => {
    await supabase.from("notes_v2").update({ task_id: taskId }).eq("id", noteId);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, task_id: taskId } : n));
    setLinkedTaskId(taskId);
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    await supabase.from("notes_v2").delete().eq("id", noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
    if (selectedNote?.id === noteId) { setSelectedNote(null); editor?.commands.setContent(""); }
  };

  const insertWikiLink = (note: Note) => {
    if (!editor) return;
    editor.commands.insertContent(`<a href="/notes?id=${note.id}" class="wiki-link">[[${note.title || "Untitled"}]]</a> `);
    setShowWikiModal(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); };
  const getInitials = () => displayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

  const getWordCount = (content: any): number => {
    if (!content || typeof content !== "object") return 0;
    const extractText = (node: any): string => {
      if (node.type === "text") return node.text ?? "";
      if (node.content) return node.content.map(extractText).join(" ");
      return "";
    };
    const text = extractText(content).trim();
    return text ? text.split(/\s+/).length : 0;
  };

  const getContentPreview = (content: any): string => {
    if (!content || typeof content !== "object") return "";
    const extractText = (node: any): string => {
      if (node.type === "text") return node.text ?? "";
      if (node.content) return node.content.map(extractText).join(" ");
      return "";
    };
    return extractText(content).replace(/\s+/g, " ").trim().slice(0, 80);
  };

  const filteredNotes = notes
    .filter(n => {
      const q = searchQuery.toLowerCase();
      return !q || n.title.toLowerCase().includes(q) || getContentPreview(n.content).toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sortNotes === "alpha") return (a.title || "Untitled").localeCompare(b.title || "Untitled");
      if (sortNotes === "created") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

  // Auto-select note from URL param
  useEffect(() => {
    if (typeof window === "undefined" || notes.length === 0) return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) { const found = notes.find(n => n.id === id); if (found) selectNote(found); }
  }, [notes, selectNote]);

  const toolbarButtons = [
    { label: "B", title: "Bold", action: () => editor?.chain().focus().toggleBold().run(), active: () => !!editor?.isActive("bold"), style: "font-bold" },
    { label: "I", title: "Italic", action: () => editor?.chain().focus().toggleItalic().run(), active: () => !!editor?.isActive("italic"), style: "italic" },
    { label: "S", title: "Strike", action: () => editor?.chain().focus().toggleStrike().run(), active: () => !!editor?.isActive("strike"), style: "line-through" },
    { label: "H1", title: "Heading 1", action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: () => !!editor?.isActive("heading", { level: 1 }), style: "" },
    { label: "H2", title: "Heading 2", action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: () => !!editor?.isActive("heading", { level: 2 }), style: "" },
    { label: "•", title: "Bullet list", action: () => editor?.chain().focus().toggleBulletList().run(), active: () => !!editor?.isActive("bulletList"), style: "" },
    { label: "1.", title: "Ordered list", action: () => editor?.chain().focus().toggleOrderedList().run(), active: () => !!editor?.isActive("orderedList"), style: "" },
    { label: "<>", title: "Code", action: () => editor?.chain().focus().toggleCode().run(), active: () => !!editor?.isActive("code"), style: "font-mono" },
    { label: "❝", title: "Blockquote", action: () => editor?.chain().focus().toggleBlockquote().run(), active: () => !!editor?.isActive("blockquote"), style: "" },
    { label: "—", title: "Divider", action: () => editor?.chain().focus().setHorizontalRule().run(), active: () => false, style: "" },
  ];

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
    .prose-editor { font-size: 15px; line-height: 1.75; color: ${t.text}; }
    .prose-editor h1 { font-size: 1.8rem; font-weight: 800; margin: 1.2rem 0 0.6rem; color: ${t.text}; }
    .prose-editor h2 { font-size: 1.4rem; font-weight: 700; margin: 1rem 0 0.5rem; color: ${t.text}; }
    .prose-editor h3 { font-size: 1.1rem; font-weight: 600; margin: 0.8rem 0 0.4rem; color: ${t.text}; }
    .prose-editor p { margin: 0.4rem 0; }
    .prose-editor ul, .prose-editor ol { padding-left: 1.5rem; margin: 0.5rem 0; }
    .prose-editor li { margin: 0.2rem 0; }
    .prose-editor blockquote { border-left: 3px solid ${t.accent}; padding-left: 1rem; margin: 0.75rem 0; color: ${t.textMuted}; }
    .prose-editor code { background: ${t.surfaceHover}; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.875em; font-family: monospace; color: ${t.text}; }
    .prose-editor pre { background: ${t.surfaceHover}; padding: 1rem; border-radius: 12px; overflow-x: auto; margin: 0.75rem 0; }
    .prose-editor pre code { background: none; padding: 0; }
    .prose-editor hr { border: none; border-top: 1px solid ${t.border}; margin: 1.5rem 0; }
    .tiptap-link { color: ${t.accent}; text-decoration: underline; cursor: pointer; }
    .wiki-link { color: ${t.accent}; background: ${t.accent}18; padding: 0.1em 0.4em; border-radius: 4px; font-weight: 500; text-decoration: none; cursor: pointer; }
    .ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: ${t.textDim}; pointer-events: none; height: 0; }
    .ProseMirror:focus { outline: none; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes modalIn { from { opacity: 0; transform: scale(0.96) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    .fade-in { animation: fadeIn 0.2s ease-out; }
    .modal-in { animation: modalIn 0.2s ease-out; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { border-radius: 3px; background: ${t.borderStrong}; }
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  `;

  if (!authReady) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: t.bg }}>
      <div className="text-center"><div className="text-5xl mb-4">📝</div><div className="text-sm" style={{ color: t.textDim }}>Loading notes...</div></div>
    </div>
  );

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
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: t.text }}>{displayName}</div>
              <div className="text-xs truncate" style={{ color: t.textDim }}>{userEmail}</div>
            </div>
          </div>
          <nav className="space-y-1 mb-8">
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

      {/* HEADER */}
      <header className="sticky top-0 z-30 px-6 py-4 flex items-center justify-between"
        style={{ background: isDark ? "rgba(17,17,19,0.92)" : "rgba(255,250,243,0.92)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${t.border}` }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, color: t.textMuted }}>☰</button>
          <div>
            <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: t.textDim }}>DO BEE</div>
            <div className="text-xl font-bold" style={{ color: t.text }}>Notes</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.surfaceHover, border: `1px solid ${t.border}` }}>{isDark ? "☀️" : "🌙"}</button>
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden" style={{ background: t.accent, color: t.accentText }}>
            {avatarDataUrl ? <img src={avatarDataUrl} alt="avatar" className="w-9 h-9 object-cover" /> : getInitials()}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* NOTES LIST PANEL */}
        <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden" style={{ background: t.surface, borderRight: `1px solid ${t.border}` }}>
          <div className="p-4 flex flex-col gap-2" style={{ borderBottom: `1px solid ${t.border}` }}>
            <button onClick={createNote} className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: t.accent, color: t.accentText }}>
              + New Note
            </button>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search notes…"
              className="w-full px-3 py-2 rounded-xl text-sm outline-none" style={{ background: t.surfaceHover, color: t.text, border: `1px solid ${t.border}` }} />
            <div className="flex gap-1">
              {([["updated","Recent"],["created","Newest"],["alpha","A–Z"]] as [typeof sortNotes, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setSortNotes(val)}
                  className="flex-1 py-1 rounded-lg text-xs font-semibold"
                  style={{ background: sortNotes === val ? t.accent : t.surfaceHover, color: sortNotes === val ? t.accentText : t.textMuted }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredNotes.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-3xl mb-2">📝</div>
                <p className="text-xs" style={{ color: t.textDim }}>{searchQuery ? "No results" : "No notes yet"}</p>
                {!searchQuery && <button onClick={createNote} className="mt-3 text-xs font-semibold" style={{ color: t.accent }}>Create your first note →</button>}
              </div>
            ) : filteredNotes.map(note => {
              const isSelected = selectedNote?.id === note.id;
              const linkedT = tasks.find(tk => tk.id === note.task_id);
              const preview = getContentPreview(note.content);
              return (
                <div key={note.id} onClick={() => selectNote(note)}
                  className="p-3 rounded-xl mb-1 cursor-pointer group relative"
                  style={{ background: isSelected ? t.accent + "20" : "transparent", border: `1px solid ${isSelected ? t.accent + "60" : "transparent"}` }}>
                  <div className="text-sm font-semibold truncate pr-6" style={{ color: isSelected ? t.accent : t.text }}>{note.title || "Untitled"}</div>
                  {preview && <div className="text-xs mt-0.5 line-clamp-2 leading-snug" style={{ color: t.textDim }}>{preview}</div>}
                  {linkedT && <div className="text-xs mt-1 truncate" style={{ color: t.textDim }}>📌 {linkedT.text}</div>}
                  <div className="text-xs mt-1" style={{ color: t.textDim }}>{new Date(note.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                  <button onClick={e => { e.stopPropagation(); deleteNote(note.id); }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: t.danger + "20", color: t.danger }}>✕</button>
                </div>
              );
            })}
          </div>
          <div className="p-3 flex items-center justify-between text-xs" style={{ borderTop: `1px solid ${t.border}`, color: t.textDim }}>
            <span>{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
            {searchQuery && <span>{filteredNotes.length} result{filteredNotes.length !== 1 ? "s" : ""}</span>}
          </div>
        </div>

        {/* EDITOR AREA */}
        {selectedNote ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor header */}
            <div className="px-8 pt-6 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <input value={noteTitle}
                  onChange={e => { setNoteTitle(e.target.value); saveNote(selectedNote.id, e.target.value); }}
                  placeholder="Untitled"
                  className="text-3xl font-bold bg-transparent outline-none flex-1 mr-4"
                  style={{ color: t.text }} />
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs" style={{ color: t.textDim }}>
                    {getWordCount(selectedNote.content)} words
                  </span>
                  <span className="text-xs flex items-center gap-1" style={{ color: isSaving ? t.accent : t.textDim }}>
                    {isSaving ? <><span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: t.accent }} />Saving…</> : "✓ Saved"}
                  </span>
                </div>
              </div>
              {/* Task link */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold flex-shrink-0" style={{ color: t.textDim }}>📌 Task:</span>
                <select value={linkedTaskId ?? ""}
                  onChange={e => { const v = e.target.value; saveTaskLink(selectedNote.id, v ? Number(v) : null); }}
                  className="text-xs px-2 py-1.5 rounded-lg outline-none flex-1 max-w-xs"
                  style={{ background: t.surfaceHover, color: t.text, border: `1px solid ${t.border}` }}>
                  <option value="">No task linked</option>
                  {tasks.map(task => <option key={task.id} value={task.id}>{task.text}</option>)}
                </select>
              </div>
              {/* Toolbar */}
              <div className="flex items-center gap-1 flex-wrap">
                {toolbarButtons.map(btn => (
                  <button key={btn.label} title={btn.title} onClick={btn.action}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${btn.style}`}
                    style={{ background: btn.active() ? t.accent : t.surfaceHover, color: btn.active() ? t.accentText : t.textMuted }}>
                    {btn.label}
                  </button>
                ))}
                <button title="Insert link" onClick={() => {
                  const url = prompt("Enter URL:");
                  if (url) editor?.chain().focus().setLink({ href: url }).run();
                }} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: editor?.isActive("link") ? t.accent : t.surfaceHover, color: editor?.isActive("link") ? t.accentText : t.textMuted }}>
                  🔗
                </button>
                <button title="Wiki link [[note]]" onClick={() => setShowWikiModal(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: t.surfaceHover, color: t.accent, border: `1px solid ${t.accent}40` }}>
                  [[]]
                </button>
              </div>
            </div>
            {/* Editor content */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <EditorContent editor={editor} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">📝</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: t.text }}>Your Notes</h2>
              <p className="text-sm mb-6" style={{ color: t.textDim }}>Select a note or create a new one to get started</p>
              <button onClick={createNote} className="px-6 py-3 rounded-xl text-sm font-bold" style={{ background: t.accent, color: t.accentText }}>
                + Create first note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* WIKI LINK MODAL */}
      {showWikiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 fade-in" onClick={() => setShowWikiModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl p-6 modal-in" style={{ background: t.surface, border: `1px solid ${t.border}` }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: t.text }}>Link to a Note</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notes.filter(n => n.id !== selectedNote?.id).length === 0 ? (
                <p className="text-sm text-center py-4" style={{ color: t.textDim }}>No other notes to link to</p>
              ) : notes.filter(n => n.id !== selectedNote?.id).map(note => (
                <button key={note.id} onClick={() => insertWikiLink(note)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium"
                  style={{ background: t.surfaceHover, color: t.text }}>
                  📝 {note.title || "Untitled"}
                </button>
              ))}
            </div>
            <button onClick={() => setShowWikiModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium"
              style={{ background: t.surfaceHover, color: t.textMuted }}>Cancel</button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function NotesPage() {
  return <Suspense><NotesContent /></Suspense>;
}
