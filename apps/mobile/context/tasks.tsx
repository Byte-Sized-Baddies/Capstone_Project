import HoneyToast from "../components/HoneyToast";
import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./auth";

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
  dueDate?: string | null;
  dueTime?: string | null;
  priority: TaskPriority;
  category?: string | null;
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
  loading: boolean;
  addTask: (input: NewTaskInput) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTask: (id: string, updates: UpdateTaskInput) => void;
  clearCompleted: () => void;
  setAllTasks: (tasks: Task[]) => void;
  dailyGoal: number;
  setDailyGoal: (n: number) => void;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(5);
  const toastTimer = useRef<number | null>(null);

  // 1. FETCH TASKS FROM SUPABASE
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
    } else if (data) {
      // Correctly map snake_case from DB to camelCase for the UI
      const mappedTasks: Task[] = data.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        done: t.done,
        createdAt: t.created_at,
        completedAt: t.completed_at,
        dueDate: t.due_date,
        dueTime: t.due_time,
        priority: (t.priority as TaskPriority) || 'low',
        projectId: t.project_id,
        attachments: t.attachments || [],
      }));
      setTasks(mappedTasks);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 2. ADD TASK
  const addTask = useCallback(async (input: NewTaskInput) => {
    if (!user || !input.title.trim()) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        user_id: user.id,
        title: input.title.trim(),
        description: input.description,
        due_date: input.dueDate,
        due_time: input.dueTime,
        priority: input.priority || 'low',
        project_id: input.projectId,
        done: false
      }])
      .select()
      .single();

    if (error) {
      console.error("Error adding task:", error);
    } else if (data) {
      // Map the single new item back to camelCase to prevent 'localeCompare' crashes
      const mappedNewTask: Task = {
        id: data.id,
        title: data.title,
        description: data.description,
        done: data.done,
        createdAt: data.created_at,
        completedAt: data.completed_at,
        dueDate: data.due_date,
        dueTime: data.due_time,
        priority: data.priority as TaskPriority,
        projectId: data.project_id,
        attachments: [],
      };
      setTasks((prev) => [mappedNewTask, ...prev]);
    }
  }, [user]);

  // 3. TOGGLE TASK
  const toggleTask = useCallback(async (id: string) => {
    const target = tasks.find(t => t.id === id);
    if (!target) return;

    const isNowDone = !target.done;
    const completedAt = isNowDone ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('tasks')
      .update({ done: isNowDone, completed_at: completedAt })
      .eq('id', id);

    if (error) {
      console.error("Error toggling task:", error);
    } else {
      if (isNowDone) {
        setDailyCount(prev => prev + 1);
        setToastVisible(true);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
      }
      setTasks(prev => prev.map(t => t.id === id ? { ...t, done: isNowDone, completedAt } : t));
    }
  }, [tasks]);

  // 4. DELETE TASK
  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      console.error("Error deleting task:", error);
    } else {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  }, []);

  const updateTask = useCallback((id: string, updates: UpdateTaskInput) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setTasks((prev) => prev.filter((t) => !t.done));
  }, []);

  const setAllTasks = useCallback((next: Task[]) => {
    setTasks(next);
  }, []);

  return (
    <TasksContext.Provider value={{
      tasks,
      loading,
      addTask,
      toggleTask,
      deleteTask,
      updateTask,
      clearCompleted,
      setAllTasks,
      dailyGoal,
      setDailyGoal
    }}>
      {children}
      <HoneyToast visible={toastVisible} count={dailyCount} goal={dailyGoal} />
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside TasksProvider");
  return ctx;
}

export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "No date set";
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};