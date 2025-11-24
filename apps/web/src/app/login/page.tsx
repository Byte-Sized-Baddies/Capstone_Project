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

  // 🚀 Redirect if already logged in
 useEffect(() => {
  const getSession = async () => {
    await supabase.auth.refreshSession();
    await supabase.auth.signOut();
    const { data: { session } } = await supabase.auth.getSession();
    if (session) router.replace("/dashboard");
  };
  getSession();
}, [router]);

  // 📧 Email login
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

  // 🌐 OAuth: Google, Microsoft
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fffaf3] relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#f5e99f] rounded-full blur-3xl opacity-40" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#f5e99f] rounded-full blur-3xl opacity-30" />

      {/* Login Card */}
      <div className="relative z-10 bg-white/90 backdrop-blur-md p-10 rounded-3xl shadow-xl w-full max-w-md border border-[#f5e99f]/60">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#f5e99f] flex items-center justify-center shadow-md">
            <span className="text-4xl">🐝</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[#1a1a1a]">
            Welcome to Do Bee
          </h1>
          <p className="text-gray-600 mt-2 text-sm">Where productivity buzzes 🐝</p>
        </div>

        {/* Email Login Form */}
        <form onSubmit={handleEmailLogin} className="space-y-5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-3 rounded-2xl border border-[#f5e99f] focus:ring-2 focus:ring-[#f5e99f] focus:outline-none text-gray-700"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-3 rounded-2xl border border-[#f5e99f] focus:ring-2 focus:ring-[#f5e99f] focus:outline-none text-gray-700"
          />

          {err && <p className="text-red-600 text-sm text-center">{err}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f5e99f] text-[#1a1a1a] p-3 rounded-2xl font-semibold hover:bg-[#f3e47d] transition-all duration-200 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* OAuth Buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={() => handleOAuthLogin("google")}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 p-3 rounded-2xl hover:bg-gray-100"
          >
            <FaGoogle /> Continue with Google
          </button>

          <button
            onClick={() => handleOAuthLogin("azure")}
            className="w-full flex items-center justify-center gap-2 bg-[#0078D4] text-white p-3 rounded-2xl rounded-2xl hover:bg-[#005EA6]"
          >
            <FaMicrosoft /> Continue with Microsoft
          </button>
        </div>

        {/* Links */}
        <div className="mt-6 text-center text-sm text-gray-700">
          <p>
            Don’t have an account?{" "}
            <Link href="/signup" className="underline hover:text-black font-medium">
              Sign Up
            </Link>
          </p>
          <p className="mt-2">
            <a href="#" className="text-[#1a1a1a] hover:underline">
              Forgot Password?
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
