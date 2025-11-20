"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail, signInWithOAuth } from "../lib/auth/auth";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleEmailSignUp = async () => {
    setErr(null);

    if (!email || !password) return setErr("Email and password required");
    if (password !== confirmPassword)
      return setErr("Passwords do not match");

    try {
      setLoading(true);
      const { error } = await signUpWithEmail(email, password);
      if (error) return setErr(error.message);

      alert("Check your email for a confirmation link.");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
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
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#f5e99f] rounded-full blur-3xl opacity-40"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#f5e99f] rounded-full blur-3xl opacity-30"></div>

      <div className="relative z-10 bg-white/90 backdrop-blur-md p-10 rounded-3xl shadow-xl w-full max-w-md border border-[#f5e99f]/60">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#f5e99f] flex items-center justify-center shadow-md">
            <span className="text-4xl">🐝</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[#1a1a1a]">
            Create Your Account
          </h1>
          <p className="text-gray-600 mt-2 text-sm">Join Do Bee today!</p>
        </div>

        <div className="space-y-5">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 rounded-2xl border border-[#f5e99f] text-gray-700 focus:ring-2 focus:ring-[#f5e99f] outline-none"
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-2xl border border-[#f5e99f] text-gray-700 focus:ring-2 focus:ring-[#f5e99f] outline-none"
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full p-3 rounded-2xl border border-[#f5e99f] text-gray-700 focus:ring-2 focus:ring-[#f5e99f] outline-none"
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {err && (
            <p className="text-red-500 text-sm font-medium">{err}</p>
          )}

          <button
            onClick={handleEmailSignUp}
            disabled={loading}
            className="w-full bg-[#f5e99f] p-3 rounded-2xl text-[#1a1a1a] font-semibold hover:bg-[#f3e47d] transition"
          >
            {loading ? "Signing up…" : "Create Account"}
          </button>

          <hr className="my-4 border-[#f5e99f]" />

          <button
            onClick={() => handleOAuthSignIn("google")}
            className="w-full p-3 rounded-2xl border border-[#f5e99f]"
          >
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuthSignIn("github")}
            className="w-full p-3 rounded-2xl border border-[#f5e99f]"
          >
            Continue with GitHub
          </button>
        </div>

        <p className="mt-5 text-sm text-center">
          Already have an account?{" "}
          <a href="/" className="underline font-medium">
            Sign In
          </a>
        </p>
      </div>
    </main>
  );
}
