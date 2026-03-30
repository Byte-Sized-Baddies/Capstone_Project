"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../auth/supabaseClient";
import { signInWithEmail, signInWithOAuth } from "../auth/auth";
import { FaGoogle, FaMicrosoft } from "react-icons/fa";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);

  // Load saved theme
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved) setIsDark(saved === "dark");
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      localStorage.setItem("theme", !prev ? "dark" : "light");
      return !prev;
    });
  };

  useEffect(() => {
    const getSession = async () => {
      await supabase.auth.refreshSession();
      await supabase.auth.signOut();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace("/dashboard");
    };
    getSession();
  }, [router]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email || !password) return setErr("Email and password required");
    try {
      setLoading(true);
      const { error } = await signInWithEmail(email, password);
      if (error) return setErr(error.message);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "azure") => {
    setErr(null);
    try {
      setLoading(true);
      const { error } = await signInWithOAuth(provider);
      if (error) setErr(error.message);
    } finally {
      setLoading(false);
    }
  };

  const bg = isDark ? "#111113" : "#fffaf3";
  const surface = isDark ? "#18181b" : "#ffffff";
  const border = isDark ? "#27272a" : "#f5e99f";
  const text = isDark ? "#fafafa" : "#1a1a1a";
  const textMuted = isDark ? "#a1a1aa" : "#6b6b6b";
  const textDim = isDark ? "#71717a" : "#9a9a9a";
  const accent = isDark ? "#FFC107" : "#f5c800";
  const accentText = "#18181b";
  const inputBg = isDark ? "#27272a" : "#fffdf2";
  const surfaceHover = isDark ? "#27272a" : "#fff8e6";

  const inlineStyles = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
    * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
    @keyframes floatUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    .float-up { animation: floatUp 0.5s ease-out forwards; }
    .bee-pulse { animation: pulse 2.5s ease-in-out infinite; }
    input::placeholder { color: ${textDim}; }
    input:-webkit-autofill { -webkit-box-shadow: 0 0 0 30px ${inputBg} inset !important; -webkit-text-fill-color: ${text} !important; }
  `;

  return (
    <main style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", transition: "background 0.3s ease" }}>
      <style>{inlineStyles}</style>

      {/* Background blobs */}
      <div style={{ position: "absolute", top: -80, left: -80, width: 320, height: 320, borderRadius: "50%", background: accent, opacity: isDark ? 0.06 : 0.2, filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: accent, opacity: isDark ? 0.04 : 0.15, filter: "blur(80px)", pointerEvents: "none" }} />

      {/* Theme toggle */}
      <button onClick={toggleTheme} style={{ position: "absolute", top: 24, right: 24, width: 40, height: 40, borderRadius: 12, background: surface, border: `1px solid ${border}`, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
        {isDark ? "☀️" : "🌙"}
      </button>

      {/* Card */}
      <div className="float-up" style={{ position: "relative", zIndex: 1, background: surface, border: `1px solid ${border}`, borderRadius: 28, padding: "48px 40px", width: "100%", maxWidth: 440, boxShadow: isDark ? "0 25px 60px rgba(0,0,0,0.4)" : "0 25px 60px rgba(0,0,0,0.08)" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div className="bee-pulse" style={{ width: 80, height: 80, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 36, boxShadow: `0 8px 24px ${accent}50` }}>
            🐝
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: text, margin: "0 0 8px" }}>Welcome to Do Bee</h1>
          <p style={{ fontSize: 14, color: textMuted, margin: 0 }}>Where productivity buzzes 🐝</p>
        </div>

        {/* Form */}
        <form onSubmit={handleEmailLogin} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, outline: "none" }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: `1px solid ${border}`, background: inputBg, color: text, fontSize: 14, outline: "none" }}
          />

          {err && (
            <div style={{ background: "#ef444420", border: "1px solid #ef444440", borderRadius: 10, padding: "10px 14px", color: "#f87171", fontSize: 13, textAlign: "center" }}>
              {err}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: "100%", padding: "14px", borderRadius: 14, background: accent, color: accentText, fontWeight: 700, fontSize: 15, border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, marginTop: 4, boxShadow: `0 4px 16px ${accent}40`, transition: "opacity 0.2s" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: border }} />
          <span style={{ fontSize: 12, color: textDim, fontWeight: 500 }}>or continue with</span>
          <div style={{ flex: 1, height: 1, background: border }} />
        </div>

        {/* OAuth */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => handleOAuthLogin("google")}
            style={{ width: "100%", padding: "13px 16px", borderRadius: 14, background: surfaceHover, border: `1px solid ${border}`, color: text, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <FaGoogle style={{ color: "#EA4335" }} /> Continue with Google
          </button>
          <button onClick={() => handleOAuthLogin("azure")}
            style={{ width: "100%", padding: "13px 16px", borderRadius: 14, background: surfaceHover, border: `1px solid ${border}`, color: text, fontSize: 14, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <FaMicrosoft style={{ color: "#0078D4" }} /> Continue with Microsoft
          </button>
        </div>

        {/* Links */}
<div style={{ marginTop: 28, textAlign: "center", display: "flex", flexDirection: "column", gap: 10 }}>
  <p style={{ fontSize: 14, color: textMuted, margin: 0 }}>
    Don&apos;t have an account?{" "}
    <Link href="/signup" style={{ color: accent, fontWeight: 600, textDecoration: "none" }}>Sign Up</Link>
  </p>
  <Link href="/forgotpassword" style={{ fontSize: 13, color: textDim, textDecoration: "none" }}>Forgot Password?</Link>
</div>
      </div>
    </main>
  );
}