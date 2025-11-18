"use client";

export default function StatisticsPage() {
  return (
    <main className="min-h-screen bg-[#fffaf3] flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* Decorative background circles */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#f5e99f] rounded-full blur-3xl opacity-40"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#f5e99f] rounded-full blur-3xl opacity-30"></div>

      {/* Card Container */}
      <div className="relative z-10 bg-white/90 backdrop-blur-md shadow-xl rounded-3xl border border-[#f5e99f]/60 p-8 w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-[#f5e99f] flex items-center justify-center shadow-md">
            <span className="text-4xl">📊</span>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-[#1a1a1a]">
            Weekly Buzz Stats
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            See how productive your week was 🐝
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 text-center mb-6">
          <div className="bg-[#fff8d9] p-4 rounded-2xl border border-[#f5e99f]/70">
            <p className="text-sm text-gray-700">Tasks Completed</p>
            <p className="text-2xl font-bold text-[#e1c200]">12</p>
          </div>
          <div className="bg-[#f0ffe3] p-4 rounded-2xl border border-[#c7f3b4]/70">
            <p className="text-sm text-gray-700">Weekly Goal</p>
            <p className="text-2xl font-bold text-[#61b15a]">85%</p>
          </div>
        </div>

        {/* Bar Chart (mock visual) */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">
            Weekly Progress
          </h2>
          <div className="flex items-end justify-between h-24">
            {[30, 50, 80, 60, 90, 40, 70].map((h, i) => (
              <div
                key={i}
                className="w-6 bg-[#f5e99f] rounded-t-lg shadow-sm"
                style={{ height: `${h}%` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Category Stats */}
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-2">
            By Category
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[#6ba4ff] font-medium">Work</span>
              <div className="w-3/5 bg-gray-200 rounded-full h-2">
                <div className="bg-[#6ba4ff] h-2 rounded-full w-3/4"></div>
              </div>
              <span className="text-gray-700 text-sm">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#ff85a2] font-medium">Personal</span>
              <div className="w-3/5 bg-gray-200 rounded-full h-2">
                <div className="bg-[#ff85a2] h-2 rounded-full w-1/2"></div>
              </div>
              <span className="text-gray-700 text-sm">8</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#ff6961] font-medium">Health</span>
              <div className="w-3/5 bg-gray-200 rounded-full h-2">
                <div className="bg-[#ff6961] h-2 rounded-full w-1/3"></div>
              </div>
              <span className="text-gray-700 text-sm">5</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
