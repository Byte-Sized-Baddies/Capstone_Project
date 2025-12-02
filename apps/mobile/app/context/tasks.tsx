import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

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

  // Deadlines / scheduling
  dueDate?: string | null; // e.g. "2025-11-18" or ISO date
  dueTime?: string | null; // e.g. "14:00" or "2:00 PM"

  // Meta
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

  addTask: (input: NewTaskInput) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  // NEW
  updateTask: (id: string, updates: UpdateTaskInput) => void;
  clearCompleted: () => void;

  // Optional but useful when you wire in Supabase / AsyncStorage
  setAllTasks: (tasks: Task[]) => void;
};

const TasksContext = createContext<TasksContextType | undefined>(undefined);

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);

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

      const newTask: Task = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2),
        title: title.trim(),
        description: description?.trim(),
        done: false,
        createdAt: new Date().toISOString(),
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        priority,
        category: category || null,
        projectId: projectId || null,
        attachments,
      };

      setTasks((prev) => [newTask, ...prev]);
    },
    []
  );

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
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
    <TasksContext.Provider
      value={{
        tasks,
        addTask,
        toggleTask,
        deleteTask,
        updateTask,
        clearCompleted,
        setAllTasks,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used inside TasksProvider");
  return ctx;
}
