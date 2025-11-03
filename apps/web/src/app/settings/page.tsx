"use client";

import FloatingMenu from "../components/FloatingMenu";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#fffaf3] flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* Decorative background circles */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#f5e99f] rounded-full blur-3xl opacity-40"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#f5e99f] rounded-full blur-3xl opacity-30"></div>

      {/* Settings Card */}
      <div className="relative z-10 bg-white/90 backdrop-blur-md shadow-xl rounded-3xl border border-[#f5e99f]/60 w-full max-w-3xl p-8">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#f5e99f] flex items-center justify-center shadow-md">
            <span className="text-4xl">🐝</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[#1a1a1a]">
            Profile Settings
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            Customize your profile
          </p>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left: Profile info */}
          <div className="flex-1 flex flex-col items-center space-y-4 bg-[#fffef6] p-6 rounded-2xl border border-[#f5e99f]/60">
            <img
              src="https://cdn-icons-png.flaticon.com/512/2476/2476854.png"
              alt="Bee avatar"
              className="w-28 h-28 drop-shadow-md"
            />
            <input
              type="text"
              placeholder="Display Name"
              defaultValue="Busy Bee"
              className="border border-[#f5e99f] rounded-2xl px-4 py-2 w-3/4 text-center focus:ring-2 focus:ring-[#f5e99f] focus:outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              defaultValue="user@dobee.com"
              className="border border-[#f5e99f] rounded-2xl px-4 py-2 w-3/4 text-center focus:ring-2 focus:ring-[#f5e99f] focus:outline-none"
            />
            <textarea
              placeholder="Bio / Slogan"
              defaultValue="Always buzzing!"
              className="border border-[#f5e99f] rounded-2xl px-4 py-2 w-3/4 text-center resize-none focus:ring-2 focus:ring-[#f5e99f] focus:outline-none"
            />
            <button className="mt-4 bg-[#f5e99f] text-[#1a1a1a] px-6 py-2 rounded-2xl font-semibold hover:bg-[#f3e47d] transition-all duration-200">
              Save Changes
            </button>
          </div>

          {/* Right: Quick Stats */}
          <div className="flex-1 bg-[#fff8d9] rounded-2xl p-6 border border-[#f5e99f]/60 shadow-sm">
            <h2 className="text-lg font-semibold text-[#1a1a1a] mb-4">
              Quick Stats
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li>
                🏆 <span className="font-medium">Tasks Completed:</span>{" "}
                <strong className="text-[#e1c200]">150</strong>
              </li>
              <li>
                ⚡ <span className="font-medium">Current Streak:</span>{" "}
                <strong className="text-[#61b15a]">10 Days</strong>
              </li>
              <li>
                🐝 <span className="font-medium">Bee Count:</span>{" "}
                <strong className="text-[#ffb703]">500</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <FloatingMenu />
    </main>
  );
}
