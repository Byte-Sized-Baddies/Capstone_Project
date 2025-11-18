import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Task = { id: string; title: string; createdAt: number; completed: boolean };

type TaskCtx = {
  tasks: Task[];
  addTask: (title: string) => void;
  toggleTask: (id: string) => void;
  clearAll: () => void;
};

const Ctx = createContext<TaskCtx | null>(null);
const STORAGE_KEY = "dobee:tasks";

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  // load once
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(JSON.parse(raw));
    })();
  }, []);

  // persist on change
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
  }, [tasks]);

  const addTask = (title: string) => {
    const t: Task = { id: `${Date.now()}-${Math.random()}`, title: title.trim(), createdAt: Date.now(), completed: false };
    if (!t.title) return;
    setTasks(prev => [t, ...prev]); // newest first
  };

  const toggleTask = (id: string) =>
    setTasks(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));

  const clearAll = () => setTasks([]);

  const value = useMemo(() => ({ tasks, addTask, toggleTask, clearAll }), [tasks]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTasks = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTasks must be used inside <TaskProvider>");
  return v;
};
