import HoneyToast from "../../components/HoneyToast";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useRef,
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

  completedAt?: string | null;

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
