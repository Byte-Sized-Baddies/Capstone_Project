import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../context/auth";
import { TasksProvider } from "../context/tasks";
import { ProjectsProvider } from "../context/projects";

// This component handles the actual "Redirect" logic
function RootNavigation() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Check if the user is currently on the login screen
    const isOnLoginPage = segments[0] === "login";

    if (!session && !isOnLoginPage) {
      // Not logged in? Force them to /login
      router.replace("/login");
    } else if (session && isOnLoginPage) {
      // Logged in but on login page? Send to app
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
export default function RootLayout() {
  return (
    <AuthProvider>
      <ProjectsProvider>
        <TasksProvider>
          {/* We use RootNavigation here so it has access to useAuth() */}
          <RootNavigation />
        </TasksProvider>
      </ProjectsProvider>
    </AuthProvider>
  );
}
