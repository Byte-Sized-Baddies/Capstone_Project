export const dynamic = "force-static";

export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center bg-gray-50">
      <div className="rounded-2xl bg-white shadow-md p-8 text-center max-w-md">
        <h1 className="text-2xl font-semibold">Do Bee is running! this is just testing</h1>
        <p className="text-gray-600 mt-2">
          Web (Next.js) • Mobile (Expo) • 
        </p>

        <div className="mt-6 text-sm text-gray-500">
          Edit <code className="px-1 py-0.5 rounded bg-gray-100">apps/web/app/page.tsx</code>
        </div>
      </div>
    </main>
  );
}
