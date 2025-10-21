import type { AuthProvider } from "@repo/data";
export let auth: AuthProvider | null = null;
export const setAuthProvider = (p: AuthProvider) => (auth = p);
