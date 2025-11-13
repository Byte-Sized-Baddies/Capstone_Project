import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/auth/supabaseClient";
import { signInWithEmail, signInWithOAuth } from "../lib/auth/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 🚀 Redirect user to dashboard if already logged in
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace("/dashboard");
    })();
  }, [router]);

  // 📧 Email/password login handler
  const handleEmailLogin = async () => {
    setErr(null);
    if (!email || !password) return setErr("Email and password required");

    try {
      setLoading(true);
      const { error } = await signInWithEmail(email, password);
      if (error) return setErr(error.message);

      // ✅ Successful login → navigate to App Router dashboard
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // 🌐 OAuth login (Google / GitHub)
  const handleOAuthLogin = async (provider: "google" | "github") => {
    setErr(null);
    try {
      setLoading(true);
      const { error } = await signInWithOAuth(provider);
      if (error) setErr(error.message);
      // Supabase will handle redirect back after OAuth
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto", padding: "2rem" }}>
      <h1>Login</h1>

      {/* Email + Password Login Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleEmailLogin();
        }}
      >
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            display: "block",
            marginBottom: "1rem",
            width: "100%",
            padding: "0.5rem",
          }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            display: "block",
            marginBottom: "1rem",
            width: "100%",
            padding: "0.5rem",
          }}
        />

        {err && (
          <div style={{ color: "crimson", marginBottom: "0.5rem" }}>{err}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            marginBottom: "0.75rem",
            padding: "0.75rem",
            fontWeight: "bold",
            background: "#1a1a1a",
            color: "#fffbe6",
            borderRadius: "8px",
          }}
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>

      <hr style={{ margin: "1rem 0" }} />

      {/* OAuth Buttons */}
      <button
        type="button"
        onClick={() => handleOAuthLogin("google")}
        disabled={loading}
        style={{
          width: "100%",
          marginBottom: "0.5rem",
          padding: "0.75rem",
          background: "#f5e99f",
          borderRadius: "8px",
        }}
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => handleOAuthLogin("github")}
        disabled={loading}
        style={{
          width: "100%",
          padding: "0.75rem",
          background: "#eaeaea",
          borderRadius: "8px",
        }}
      >
        Continue with GitHub
      </button>
    </div>
  );
}