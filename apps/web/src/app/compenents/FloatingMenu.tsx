"use client";

import { useState } from "react";
import Link from "next/link";

export default function FloatingMenu() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="bg-yellow-400 hover:bg-yellow-500 text-black rounded-full p-4 shadow-lg transition-all duration-200"
        >
          ☰
        </button>

        {open && (
          <div className="absolute bottom-16 right-0 bg-white border shadow-lg rounded-2xl p-3 w-40 space-y-2">
            <Link
              href="/dashboard"
              className="block px-3 py-2 rounded-lg hover:bg-yellow-100 text-sm font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/statistics"
              className="block px-3 py-2 rounded-lg hover:bg-yellow-100 text-sm font-medium"
            >
              Statistics
            </Link>
            <Link
              href="/settings"
              className="block px-3 py-2 rounded-lg hover:bg-yellow-100 text-sm font-medium"
            >
              Settings
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

