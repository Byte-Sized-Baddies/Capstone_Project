import { supabase } from './supabaseClient';

export const signUp = async (email: string, password: string) =>
  supabase.auth.signUp({ email, password });

export const signIn = async (email: string, password: string) =>
  supabase.auth.signInWithPassword({ email, password });

export const signOut = async () =>
  supabase.auth.signOut();

export const getSession = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};
