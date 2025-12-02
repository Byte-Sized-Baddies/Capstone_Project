import { Stack } from "expo-router";
import { TasksProvider } from "./context/tasks";
import { ProjectsProvider } from "./context/projects";

export default function RootLayout() {
  return (
    <ProjectsProvider>
      <TasksProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </TasksProvider>
    </ProjectsProvider>
  );
}
