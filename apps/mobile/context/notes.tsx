import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./auth";

export type Note = {
  id: string;
  title: string;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
  taskIds: string[];
};

type SaveNoteInput = {
  title: string;
  content?: string | null;
  taskIds?: string[];
};

type NotesContextType = {
  notes: Note[];
  loading: boolean;
  fetchNotes: () => Promise<void>;
  createNote: (input: SaveNoteInput) => Promise<Note | null>;
  updateNote: (id: string, updates: SaveNoteInput) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
};

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const mapNote = (
  note: any,
  linksByNoteId: Map<string, string[]>
): Note => ({
  id: note.id,
  title: note.title,
  content: note.content ?? null,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
  taskIds: linksByNoteId.get(note.id) ?? [],
});

export function NotesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!user) {
      setNotes([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [{ data: noteRows, error: notesError }, { data: linkRows, error: linksError }] =
      await Promise.all([
        supabase
          .from("notes")
          .select("*")
          .order("updated_at", { ascending: false }),
        supabase.from("task_notes").select("task_id,note_id"),
      ]);

    if (notesError) {
      console.error("Error fetching notes:", notesError.message);
      setLoading(false);
      return;
    }

    if (linksError) {
      console.error("Error fetching note links:", linksError.message);
    }

    const linksByNoteId = new Map<string, string[]>();
    (linkRows ?? []).forEach((link: any) => {
      const noteId = String(link.note_id);
      const taskId = String(link.task_id);
      const current = linksByNoteId.get(noteId) ?? [];
      current.push(taskId);
      linksByNoteId.set(noteId, current);
    });

    setNotes((noteRows ?? []).map((note) => mapNote(note, linksByNoteId)));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const replaceNoteLinks = useCallback(
    async (noteId: string, taskIds: string[] = []) => {
      const { error: deleteError } = await supabase
        .from("task_notes")
        .delete()
        .eq("note_id", noteId);

      if (deleteError) {
        console.error("Error clearing note links:", deleteError.message);
        return;
      }

      const rows = taskIds
        .filter(Boolean)
        .map((taskId) => ({ note_id: noteId, task_id: Number(taskId) }));

      if (rows.length === 0) return;

      const { error: insertError } = await supabase.from("task_notes").insert(rows);
      if (insertError) {
        console.error("Error saving note links:", insertError.message);
      }
    },
    []
  );

  const createNote = useCallback(
    async ({ title, content, taskIds = [] }: SaveNoteInput) => {
      if (!user || !title.trim()) return null;

      const { data, error } = await supabase
        .from("notes")
        .insert([
          {
            title: title.trim(),
            content: content ?? null,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Error creating note:", error.message);
        return null;
      }

      await replaceNoteLinks(data.id, taskIds);
      const created = mapNote(data, new Map([[data.id, taskIds]]));
      setNotes((prev) => [created, ...prev]);
      return created;
    },
    [replaceNoteLinks, user]
  );

  const updateNote = useCallback(
    async (id: string, { title, content, taskIds }: SaveNoteInput) => {
      if (!title.trim()) return;

      const updatedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("notes")
        .update({
          title: title.trim(),
          content: content ?? null,
          updated_at: updatedAt,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Error updating note:", error.message);
        return;
      }

      if (taskIds !== undefined) {
        await replaceNoteLinks(id, taskIds);
      }

      setNotes((prev) =>
        prev.map((note) =>
          note.id === id
            ? {
                ...note,
                title: data.title,
                content: data.content ?? null,
                updatedAt: data.updated_at,
                taskIds: taskIds ?? note.taskIds,
              }
            : note
        )
      );
    },
    [replaceNoteLinks]
  );

  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      console.error("Error deleting note:", error.message);
      return;
    }
    setNotes((prev) => prev.filter((note) => note.id !== id));
  }, []);

  return (
    <NotesContext.Provider
      value={{ notes, loading, fetchNotes, createNote, updateNote, deleteNote }}
    >
      {children}
    </NotesContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used inside NotesProvider");
  return ctx;
}
