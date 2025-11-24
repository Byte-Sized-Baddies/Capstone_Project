"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../auth/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace("/dashboard");
      else router.replace("/login");
    };

    checkSession();
  }, [router]);

  return <p>Completing sign-in...</p>;
}
