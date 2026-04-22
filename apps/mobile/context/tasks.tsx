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

const WEEKDAY_ORDER = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const toDateOnlyString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNextWeeklyDate = (currentDate: string, recurringDays: string[]) => {
  const selectedDays = recurringDays
    .map((day) => WEEKDAY_ORDER.indexOf(day.toLowerCase()))
    .filter((dayIndex) => dayIndex >= 0)
    .sort((a, b) => a - b);

  if (selectedDays.length === 0) {
    const fallback = new Date(`${currentDate}T12:00:00`);
    fallback.setDate(fallback.getDate() + 7);
    return toDateOnlyString(fallback);
  }

  const current = new Date(`${currentDate}T12:00:00`);
  const currentDay = current.getDay();

  for (let offset = 1; offset <= 7; offset += 1) {
    const next = new Date(current);
    next.setDate(current.getDate() + offset);
    const nextDay = next.getDay();

    if (selectedDays.includes(nextDay)) {
      return toDateOnlyString(next);
    }
  }

  const fallback = new Date(current);
  fallback.setDate(fallback.getDate() + 7);
  return toDateOnlyString(fallback);
};

const getNextRecurringDueDate = (
  dueDate: string,
  frequency: RecurringFrequency,
  recurringDays: string[] = []
) => {
  const next = new Date(`${dueDate}T12:00:00`);

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      return toDateOnlyString(next);
    case "weekly":
      return getNextWeeklyDate(dueDate, recurringDays);
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      return toDateOnlyString(next);
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      return toDateOnlyString(next);
    default:
      return dueDate;
  }
};

export type TaskAttachment = {
  id: string;
  uri: string;
  type: TaskAttachmentType;
  name?: string;
};

export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

export type Task = {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  createdAt: string;
  completedAt?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  doTime?: string | null;
  scheduledDuration?: number | null;
  priority: TaskPriority;
  category?: string | null;
  projectId?: string | null;
  attachments: TaskAttachment[];
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency | null;
  recurringDays: string[];
};

export type NewTaskInput = {
  title: string;
  description?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  doTime?: string | null;
  scheduledDuration?: number | null;
  priority?: TaskPriority;
  category?: string | null;
  projectId?: string | null;
  attachments?: TaskAttachment[];
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency | null;
  recurringDays?: string[];
};

export type UpdateTaskInput = Partial<Omit<Task, "id" | "createdAt">>;

type TasksContextType = {
  tasks: Task[];
  loading: boolean;
  addTask: (input: NewTaskInput) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTask: (id: string, updates: UpdateTaskInput) => Promise<void>;
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
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("tasks_v2")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error.message);
    } else if (data) {
      const mappedTasks: Task[] = data.map((t) => ({
        id: t.id.toString(),
        title: t.title,
        description: t.description,
        done: t.is_completed,
        createdAt: t.created_at,
        completedAt: t.completed_at,
        dueDate: t.due_date,
        dueTime: t.due_time,
        doTime: t.do_time ?? null,
        scheduledDuration: t.scheduled_duration ?? null,
        priority: reversePriorityMap[t.priority as number] || "low",
        category: null,
        projectId: t.folder_id != null ? String(t.folder_id) : null,
        attachments: [],
        isRecurring: t.is_recurring ?? false,
        recurringFrequency: (t.recurring_frequency as RecurringFrequency | null) ?? null,
        recurringDays: Array.isArray(t.recurring_days) ? t.recurring_days : [],
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
      .from('tasks_v2')
      .insert([{
        user_id: user.id,
        created_by: user.id,
        title: input.title.trim(),
        description: input.description,
        due_date: input.dueDate,
        due_time: input.dueTime ? convertTo24Hour(input.dueTime) : null,
        do_time: input.doTime ?? null,
        scheduled_duration: input.scheduledDuration ?? null,
        priority: priorityMap[input.priority || "low"],
        folder_id:
          input.projectId != null
            ? Number(input.projectId)
            : activeProjectId != null
              ? Number(activeProjectId)
              : null,
        project_id: null,
        is_completed: false,
        is_recurring: input.isRecurring ?? false,
        recurring_frequency: input.isRecurring ? input.recurringFrequency ?? null : null,
        recurring_days:
          input.isRecurring && input.recurringFrequency === "weekly"
            ? input.recurringDays ?? []
            : [],
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
        dueTime: data.due_time,
        doTime: data.do_time ?? null,
        scheduledDuration: data.scheduled_duration ?? null,
        priority: reversePriorityMap[data.priority as number] || "low",
        category: null,
        projectId: data.folder_id != null ? String(data.folder_id) : null,
        attachments: [],
        isRecurring: data.is_recurring ?? false,
        recurringFrequency: (data.recurring_frequency as RecurringFrequency | null) ?? null,
        recurringDays: Array.isArray(data.recurring_days) ? data.recurring_days : [],
      };

      // NOW call the notification with the defined variable
      scheduleTaskNotification(mappedNewTask);

      // Update state
      setTasks((prev) => [mappedNewTask, ...prev]);
    }
  }, [user, activeProjectId]);

  // 3. TOGGLE TASK
  const toggleTask = useCallback(async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    const isNowDone = !target.done;
    const completedAt = isNowDone ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("tasks_v2")
      .update({
        is_completed: isNowDone,
        completed_at: completedAt,
      })
      .eq("id", id);

    if (error) {
      console.error("Error toggling task:", error);
      return;
    }

    let nextRecurringTask: Task | null = null;

    if (
      isNowDone &&
      user &&
      target.isRecurring &&
      target.recurringFrequency &&
      target.dueDate
    ) {
      const nextDueDate = getNextRecurringDueDate(
        target.dueDate,
        target.recurringFrequency,
        target.recurringDays
      );

      const { data: insertedRecurringTask, error: recurringInsertError } =
        await supabase
          .from("tasks_v2")
          .insert([
            {
              user_id: user.id,
              created_by: user.id,
              title: target.title,
              description: target.description ?? null,
              due_date: nextDueDate,
              due_time: target.dueTime ? convertTo24Hour(target.dueTime) : null,
              do_time: null,
              scheduled_duration: null,
              priority: priorityMap[target.priority],
              folder_id: target.projectId != null ? Number(target.projectId) : null,
              project_id: null,
              is_completed: false,
              completed_at: null,
              is_recurring: true,
              recurring_frequency: target.recurringFrequency,
              recurring_days: target.recurringDays ?? [],
            },
          ])
          .select()
          .single();

      if (recurringInsertError) {
        console.error("Error creating next recurring task:", recurringInsertError);
      } else if (insertedRecurringTask) {
        nextRecurringTask = {
          id: insertedRecurringTask.id.toString(),
          title: insertedRecurringTask.title,
          description: insertedRecurringTask.description,
          done: insertedRecurringTask.is_completed,
          createdAt: insertedRecurringTask.created_at,
          completedAt: insertedRecurringTask.completed_at,
          dueDate: insertedRecurringTask.due_date,
          dueTime: insertedRecurringTask.due_time,
          doTime: insertedRecurringTask.do_time ?? null,
          scheduledDuration: insertedRecurringTask.scheduled_duration ?? null,
          priority:
            reversePriorityMap[insertedRecurringTask.priority as number] || "low",
          category: null,
          projectId:
            insertedRecurringTask.folder_id != null
              ? String(insertedRecurringTask.folder_id)
              : null,
          attachments: [],
          isRecurring: insertedRecurringTask.is_recurring ?? false,
          recurringFrequency:
            (insertedRecurringTask.recurring_frequency as RecurringFrequency | null) ??
            null,
          recurringDays: Array.isArray(insertedRecurringTask.recurring_days)
            ? insertedRecurringTask.recurring_days
            : [],
        };
      }
    }

    if (isNowDone) {
      setDailyCount((prev) => prev + 1);
      setToastVisible(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
    } else {
      setDailyCount((prev) => Math.max(0, prev - 1));
    }

    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === id ? { ...t, done: isNowDone, completedAt } : t
      );

      return nextRecurringTask ? [nextRecurringTask, ...updated] : updated;
    });

    if (nextRecurringTask) {
      scheduleTaskNotification(nextRecurringTask);
    }
  }, [tasks, user]);

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

  const updateTask = useCallback(async (id: string, updates: UpdateTaskInput) => {
    const dbUpdates: Record<string, any> = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.dueTime !== undefined) {
      dbUpdates.due_time = updates.dueTime ? convertTo24Hour(updates.dueTime) : null;
    }
    if (updates.doTime !== undefined) dbUpdates.do_time = updates.doTime;
    if (updates.scheduledDuration !== undefined) {
      dbUpdates.scheduled_duration = updates.scheduledDuration;
    }
    if (updates.priority !== undefined) {
      dbUpdates.priority = priorityMap[updates.priority];
    }
    if (updates.projectId !== undefined) {
      dbUpdates.folder_id =
        updates.projectId != null ? Number(updates.projectId) : null;
      dbUpdates.project_id = null;
    }
    if (updates.isRecurring !== undefined) {
      dbUpdates.is_recurring = updates.isRecurring;
    }
    if (updates.recurringFrequency !== undefined) {
      dbUpdates.recurring_frequency = updates.recurringFrequency;
    }
    if (updates.recurringDays !== undefined) {
      dbUpdates.recurring_days = updates.recurringDays;
    }

    const { error } = await supabase
      .from("tasks_v2")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      console.error("Error updating task:", error.message);
      return;
    }

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
