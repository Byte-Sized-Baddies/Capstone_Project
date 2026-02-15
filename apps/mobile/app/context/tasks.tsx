import HoneyToast from "../../components/HoneyToast";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { supabase } from "./supabaseClient";

export type TaskPriority = "low" | "medium" | "high";

export type TaskAttachmentType = "image" | "file";

export type TaskAttachment = {
  id: string;
  uri: string;
  type: TaskAttachmentType;
  name?: string;
};

export type Task = {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  createdAt: string;

  completedAt?: string | null;

  // Deadlines / scheduling
  dueDate?: string | null; // e.g. "2025-11-18" or ISO date
  dueTime?: string | null; // e.g. "14:00" or "2:00 PM"

  // Meta
  priority: TaskPriority;
  category?: string | null;
  categoryId?: number | null;
  projectId?: string | null;

  attachments: TaskAttachment[];
};

export type NewTaskInput = {
  title: string;
  description?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TaskPriority;
  category?: string | null;
  projectId?: string | null;
  attachments?: TaskAttachment[];
};

export type UpdateTaskInput = Partial<Omit<Task, "id" | "createdAt">>;

type TasksContextType = {
  tasks: Task[];

  addTask: (input: NewTaskInput) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  // NEW
  updateTask: (id: string, updates: UpdateTaskInput) => void;
  clearCompleted: () => void;

  // Optional but useful when you wire in Supabase / AsyncStorage
  setAllTasks: (tasks: Task[]) => void;
  dailyGoal: number;
  setDailyGoal: (n: number) => void;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);

  //for the goal honeycomb 
  const[dailyGoal, setDailyGoal] = useState(5);
  // Use 'number' because React Native timers are just IDs
  const toastTimer = useRef<number | null>(null);


  // Helper to check if a date string is "today"
  const isToday = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };
  const priorityToInt = (p: TaskPriority) =>
    p === "low" ? 0 : p === "medium" ? 1 : 2;

  const intToPriority = (v: number): TaskPriority =>
    v === 2 ? "high" : v === 1 ? "medium" : "low";

  const resolveCategoryId = useCallback(async (userId: string, name?: string | null) => {
    const n = name?.trim();
    if (!n) return null;

    const { data: existing, error: findError } = await supabase
      .from("categories_v2")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", n)
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error("Category lookup failed:", findError);
      return null;
    }

    if (existing?.id) return existing.id;

    const { data: created, error: createError } = await supabase
      .from("categories_v2")
      .insert({ user_id: userId, name: n })
      .select("id")
      .single();

    if (createError) {
      console.error("Category create failed:", createError);
      return null;
    }

    return created?.id ?? null;
  }, []);

  const loadTasks = useCallback(async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;
    if (userError || !user) return;

    const { data: catRows, error: catError } = await supabase
      .from("categories_v2")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const categoryMap = new Map<number, string>();
    if (!catError && catRows) {
      catRows.forEach((c) => categoryMap.set(c.id, c.name));
    }

    const { data: taskRows, error: taskError } = await supabase
      .from("tasks_v2")
      .select("id, title, description, due_date, priority, is_completed, created_at, category_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (taskError || !taskRows) return;

    const mapped: Task[] = taskRows.map((row) => {
      const categoryName = row.category_id ? categoryMap.get(row.category_id) ?? null : null;
      return {
        id: String(row.id),
        title: row.title,
        description: row.description ?? undefined,
        done: !!row.is_completed,
        createdAt: row.created_at ?? new Date().toISOString(),
        dueDate: row.due_date ?? null,
        dueTime: null,
        priority: intToPriority(row.priority ?? 0),
        category: categoryName,
        categoryId: row.category_id ?? null,
        projectId: null,
        attachments: [],
      };
    });

    setTasks(mapped);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const addTask = useCallback(
    ({
      title,
      description,
      dueDate,
      dueTime,
      priority = "low",
      category,
      projectId,
      attachments = [],
    }: NewTaskInput) => {
      if (!title.trim()) return;

      void (async () => {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        const user = userData?.user;
        if (userError || !user) return;

        const categoryId = await resolveCategoryId(user.id, category);

        const { data, error } = await supabase
          .from("tasks_v2")
          .insert({
            user_id: user.id,
            category_id: categoryId,
            title: title.trim(),
            description: description?.trim() || null,
            due_date: dueDate || null,
            priority: priorityToInt(priority),
            is_completed: false,
          })
          .select("id, created_at")
          .single();

        if (error || !data) {
          console.error("Task insert failed:", error);
          return;
        }

        const newTask: Task = {
          id: String(data.id),
          title: title.trim(),
          description: description?.trim(),
          done: false,
          createdAt: data.created_at ?? new Date().toISOString(),
          dueDate: dueDate || null,
          dueTime: dueTime || null,
          priority,
          category: category || null,
          categoryId,
          projectId: projectId || null,
          attachments,
        };

        setTasks((prev) => [newTask, ...prev]);
      })();
    },
    [resolveCategoryId]
  );
  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => {
      // Find the task to see if we are completing it or un-completing it
      const target = prev.find(t => t.id === id);
      if (!target) return prev;

      const isNowDone = !target.done;

      // If we just finished a task, trigger the banner!
      if (isNowDone) {
        // Calculate how many are done for today (including this one)
        const currentToday = prev.filter(t => t.done && isToday(t.completedAt)).length;
        const newCount = currentToday + 1;

        // Trigger Banner (using setTimeout to avoid render clashes)
        setTimeout(() => {
          setDailyCount(newCount);
          setToastVisible(true);

          // Auto-hide after 2.5 seconds
          if (toastTimer.current) clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => {
            setToastVisible(false);
          }, 2500);
        }, 50);
      }

      return prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            done: isNowDone,
            // Save timestamp
            completedAt: isNowDone ? new Date().toISOString() : null
          };
        }
        return t;
      });
    });
  }, []);
    void (async () => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const nextDone = !task.done;
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, done: nextDone } : t))
      );

      const { error } = await supabase
        .from("tasks_v2")
        .update({ is_completed: nextDone })
        .eq("id", Number(id));

      if (error) {
        console.error("Toggle failed:", error);
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, done: task.done } : t))
        );
      }
    })();
  }, [tasks]);

  const deleteTask = useCallback((id: string) => {
    void (async () => {
      const prev = tasks;
      setTasks((p) => p.filter((t) => t.id !== id));

      const { error } = await supabase
        .from("tasks_v2")
        .delete()
        .eq("id", Number(id));

      if (error) {
        console.error("Delete failed:", error);
        setTasks(prev);
      }
    })();
  }, [tasks]);

  const updateTask = useCallback((id: string, updates: UpdateTaskInput) => {
    void (async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userError || !user) return;

      const categoryId = await resolveCategoryId(user.id, updates.category);

      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title.trim();
      if (updates.description !== undefined)
        payload.description = updates.description?.trim() || null;
      if (updates.dueDate !== undefined) payload.due_date = updates.dueDate || null;
      if (updates.priority !== undefined)
        payload.priority = priorityToInt(updates.priority);
      if (updates.done !== undefined) payload.is_completed = updates.done;
      if (updates.category !== undefined) payload.category_id = categoryId;

      const { error } = await supabase
        .from("tasks_v2")
        .update(payload)
        .eq("id", Number(id));

      if (error) {
        console.error("Update failed:", error);
        return;
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                ...updates,
                categoryId,
              }
            : t
        )
      );
    })();
  }, [resolveCategoryId]);

  const clearCompleted = useCallback(() => {
    void (async () => {
      const completedIds = tasks.filter((t) => t.done).map((t) => Number(t.id));
      if (completedIds.length === 0) return;

      const { error } = await supabase
        .from("tasks_v2")
        .delete()
        .in("id", completedIds);

      if (error) {
        console.error("Clear completed failed:", error);
        return;
      }

      setTasks((prev) => prev.filter((t) => !t.done));
    })();
  }, [tasks]);

  const setAllTasks = useCallback((next: Task[]) => {
    setTasks(next);
  }, []);

  return (
    <TasksContext.Provider
      value={{
        tasks,
        addTask,
        toggleTask,
        deleteTask,
        updateTask,
        clearCompleted,
        setAllTasks,
        dailyGoal,
        setDailyGoal,
      }}
    >
      {children}
      <HoneyToast
        visible={toastVisible}
        count={dailyCount}
        goal={dailyGoal}
      />
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside TasksProvider");
  return ctx;
}
