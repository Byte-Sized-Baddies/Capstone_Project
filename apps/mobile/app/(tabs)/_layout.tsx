// apps/mobile/app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// You might also need this import if using theming:
// import Colors from '@/constants/Colors';
// import { useColorScheme } from '@/components/useColorScheme';


// 🛑 1. Define the explicit order here
export const unstable_settings = {
  // Sets the initial tab when the app loads
  initialRouteName: 'index', 
  // Forces the tab bar to render in this exact sequence:
  order: [
    'index',      // 1st: Home (using index for the main landing page)
    'projects',    // 2nd: Folders
    'agenda',     // 3rd: Agenda
    'calendar',   // 4th: Calendar
  ],
};


export default function TabLayout() {
  // const colorScheme = useColorScheme(); // Uncomment if needed for themes

  return (
    <Tabs
      screenOptions={{
        // Set your active color here if you aren't using a theme hook
        // tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}
    >
      {/* 1. Home Page */}
      <Tabs.Screen
        name="index" // Use index.tsx for the main page
        options={{
          title: 'Home', 
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* 2. Folders Page */}
      <Tabs.Screen
        name="projects" // Matches the folders.tsx filename
        options={{
          title: 'projects',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-open-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 3. Agenda Page */}
      <Tabs.Screen
        name="agenda" // Matches the agenda.tsx filename
        options={{
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-circle-outline" size={size} color={color} />
          ),
        }}
      />
      
      {/* 4. Calendar View Page */}
      <Tabs.Screen
        name="calendar" // Matches the calendar.tsx filename
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}