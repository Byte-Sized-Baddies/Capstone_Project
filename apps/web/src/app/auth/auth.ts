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

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};
