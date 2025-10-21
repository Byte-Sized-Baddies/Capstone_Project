export type Task = { id: string; title: string; done: boolean };
export interface TaskRepo { list(): Promise<Task[]>; add(t: Task): Promise<void>; }
export interface AuthProvider { signIn(): Promise<void>; signOut(): Promise<void>; }
