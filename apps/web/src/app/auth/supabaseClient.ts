import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** getSession with a 5-second timeout so pages never hang forever */
export async function getSessionSafe() {
  const timeout = new Promise<null>((_, reject) =>
    setTimeout(() => reject(new Error("Supabase timeout")), 5000)
  );
  const result = supabase.auth.getSession();
  try {
    return await Promise.race([result, timeout]) as Awaited<ReturnType<typeof supabase.auth.getSession>>;
  } catch {
    return { data: { session: null }, error: new Error("Supabase unreachable") };
  }
}
