import HoneyToast from "../components/HoneyToast";
import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./auth";
import { useProjects } from "./projects";
import * as Notifications from 'expo-notifications';

export type TaskPriority = "low" | "medium" | "high";
export type TaskAttachmentType = "image" | "file";

// Mapping frontend labels to SQL Integer priorities
const priorityMap: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 };
const reversePriorityMap: Record<number, TaskPriority> = { 0: "low", 1: "medium", 2: "high" };

const convertTo24Hour = (raw: string) => {
  if (!raw) return null;

  const s = raw.trim().toUpperCase();

  // If it already looks like 24h "HH:MM" or "HH:MM:SS", just ensure seconds exist
  if (!s.includes("AM") && !s.includes("PM")) {
    const parts = s.split(":");
    if (parts.length === 2) return `${parts[0].padStart(2, "0")}:${parts[1]}:00`;
    if (parts.length === 3) return `${parts[0].padStart(2, "0")}:${parts[1]}:${parts[2]}`;
    return null;
  }

  // Extract AM/PM no matter where it appears (handles "06:56 AM", "06:56AM", even "06:56 AM:00")
  const ampmMatch = s.match(/\b(AM|PM)\b/);
  if (!ampmMatch) return null;
  const ampm = ampmMatch[1];

  // Remove AM/PM and any extra punctuation, keep only the time numbers
  const timePart = s.replace(/\b(AM|PM)\b/, "").replace(/[^\d:]/g, "").trim(); // "06:56" or "06:56:00"
  const [hRaw, mRaw, secRaw] = timePart.split(":");
  if (!hRaw || !mRaw) return null;

  let h = parseInt(hRaw, 10);
  const m = parseInt(mRaw, 10);
  const sec = secRaw ? parseInt(secRaw, 10) : 0;

  if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(sec)) return null;

  // Convert 12h -> 24h
  if (ampm === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }

  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return `${hh}:${mm}:${ss}`; // ✅ Postgres TIME literal
};

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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { activeProjectId } = useProjects();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastVisible, setToastVisible] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(5);
  const toastTimer = useRef<number | null>(null);

  useEffect(() => {
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Bummer! do-bee needs notification permissions to send reminders.');
      }
    };
    requestPermissions();
  }, []);

  // 1. FETCH TASKS
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase.from('tasks_v2').select('*');

    if (activeProjectId) {
      query = query.eq('project_id', activeProjectId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error.message);
    } else if (data) {
      const mappedTasks: Task[] = data.map((t) => ({
        id: t.id.toString(),
        title: t.title,
        description: t.description,
        done: t.is_completed, // Matches SQL 'is_completed'
        createdAt: t.created_at,
        completedAt: t.completed_at, // Matches SQL 'completed_at'
        dueDate: t.due_date, // Matches SQL 'due_date'
        dueTime: t.due_time, // Matches SQL 'due_time'
        priority: reversePriorityMap[t.priority as number] || 'low', // Maps Int to String
        projectId: t.project_id,
        attachments: [],
      }));
      setTasks(mappedTasks);
    }
    setLoading(false);
  }, [user, activeProjectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // 2. ADD TASK
  const addTask = useCallback(async (input: NewTaskInput) => {
    if (!user || !input.title.trim()) return;

    const { data, error } = await supabase
      .from('tasks_v2')
      .insert([{
        user_id: user.id,
        created_by: user.id,
        title: input.title.trim(),
        description: input.description,
        due_date: input.dueDate,
        due_time: input.dueTime ? convertTo24Hour(input.dueTime) : null,
        priority: priorityMap[input.priority || 'low'],
        project_id: activeProjectId || null,
        is_completed: false
      }])
      .select()
      .single();

    if (error) {
      console.error("HIVE INSERT ERROR:", error.message);
      alert(`Could not add task: ${error.message}`);
      return; // Exit early on error
    }

    if (data) {
      // Map the data FIRST
      const mappedNewTask: Task = {
        id: data.id.toString(),
        title: data.title,
        description: data.description,
        done: data.is_completed,
        createdAt: data.created_at,
        completedAt: null,
        dueDate: data.due_date,
        dueTime: data.due_time, // Include this in mapping
        priority: reversePriorityMap[data.priority as number] || 'low',
        projectId: data.project_id,
        attachments: [],
      };

      // NOW call the notification with the defined variable
      scheduleTaskNotification(mappedNewTask);

      // Update state
      setTasks((prev) => [mappedNewTask, ...prev]);
    }
  }, [user, activeProjectId]);

  // 3. TOGGLE TASK
  const toggleTask = useCallback(async (id: string) => {
    const target = tasks.find(t => t.id === id); //
    if (!target) return;

    const isNowDone = !target.done;

    // LOGIC: If checking it off, set the time. If unchecking, clear it.
    const completedAt = isNowDone ? new Date().toISOString() : null;

    const { error } = await supabase
      .from('tasks_v2')
      .update({
        is_completed: isNowDone, //
        completed_at: completedAt
      })
      .eq('id', id);

    if (error) {
      console.error("Error toggling task:", error);
    } else {
      // Increment count only if moving from undone -> done
      if (isNowDone) {
        setDailyCount(prev => prev + 1);
        setToastVisible(true);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
      } else {
        // Optional: Decrement count if they uncheck it
        setDailyCount(prev => Math.max(0, prev - 1));
      }

      // Update local state with the new 'done' and 'completedAt' values
      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, done: isNowDone, completedAt } : t
      ));
    }
  }, [tasks]); //

  const scheduleTaskNotification = async (task: Task) => {
    if (!task.dueDate) return;

    // Ensure dueTime is always HH:MM:SS
    const time = task.dueTime && task.dueTime.length >= 5 ? task.dueTime : "09:00:00";
    const triggerDate = new Date(`${task.dueDate}T${time}`);

    if (isNaN(triggerDate.getTime())) return;
    if (triggerDate <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🐝 do-bee Reminder",
        body: `Due: ${task.title}`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  };

  // 4. DELETE TASK
  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('tasks_v2').delete().eq('id', id);
    if (error) {
      console.error("Error deleting task:", error);
    } else {
      setTasks(prev => prev.filter(t => String(t.id) !== String(id)));
    }
  }, []);

  const updateTask = useCallback((id: string, updates: UpdateTaskInput) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
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