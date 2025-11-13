"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-static";

export default function Home() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate Supabase login here
    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fffaf3] relative overflow-hidden">
      {/* Decorative background circles */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#f5e99f] rounded-full blur-3xl opacity-40"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#f5e99f] rounded-full blur-3xl opacity-30"></div>

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
          <p className="text-gray-600 mt-2 text-sm">slogan?</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 rounded-2xl border border-[#f5e99f] focus:ring-2 focus:ring-[#f5e99f] focus:outline-none text-gray-700"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 rounded-2xl border border-[#f5e99f] focus:ring-2 focus:ring-[#f5e99f] focus:outline-none text-gray-700"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#f5e99f] text-[#1a1a1a] p-3 rounded-2xl font-semibold hover:bg-[#f3e47d] transition-all duration-200"
          >
            Sign In
          </button>
        </form>

        {/* Links */}
        <div className="mt-5 text-center text-sm text-gray-700">
          <p>
            Don’t have an account?{" "}
            <Link
              href="/signup"
              className="underline hover:text-black font-medium"
            >
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
