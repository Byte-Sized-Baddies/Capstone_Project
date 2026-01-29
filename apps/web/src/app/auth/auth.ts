import { supabase } from './supabaseClient';

// Email/password sign up
export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
};

// Email/password login
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
};

// OAuth login (Google, Apple, Microsoft/Azure)
export const signInWithOAuth = async (provider: 'google' | 'apple' | 'azure') => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: "email openid profile"
    },
  });
  return { data, error };
};

// Sign out from Supabase
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Full logout: Supabase + localStorage + redirect
export const handleLogout = async () => {
  // 1. Call Supabase logout
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error.message);
  }

  // 2. Clear localStorage
  localStorage.removeItem("avatar");
  localStorage.removeItem("displayName");
  localStorage.removeItem("invites");
  localStorage.removeItem("tasks");

  // 3. Redirect to login page
  if (typeof window !== "undefined") {
    window.location.href = "/login"; // adjust if your login page is elsewhere
  }
};