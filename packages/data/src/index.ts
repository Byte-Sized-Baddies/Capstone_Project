export type Task = {
  id: string;
  title: string;
  done: boolean;
  doTime?: string | null;
  scheduledDuration?: number | null;
};
export type Note = {
  id: string;
  title: string;
  content?: string | null;
  createdAt: string;
  updatedAt: string;
  taskIds: string[];
};
export interface TaskRepo { list(): Promise<Task[]>; add(t: Task): Promise<void>; }
export interface AuthProvider { signIn(): Promise<void>; signOut(): Promise<void>; }
