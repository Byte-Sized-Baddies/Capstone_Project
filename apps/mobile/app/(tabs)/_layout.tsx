import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// import Colors from '@/constants/Colors'; 
// import { useColorScheme } from '@/components/useColorScheme';
import React from 'react';

// Helper component for TabBar icons
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size: number;
}) {
  return <Ionicons size={props.size} style={{ marginBottom: -3 }} {...props} />;
}


export const unstable_settings = {
  initialRouteName: 'index', 
  order: [
    'index',      // 1st: Home
    'projects',   // 2nd: Projects (Using the file name you now have)
    'calendar',   // 3rd: Calendar
  ],
};


export default function TabLayout() {
  // const colorScheme = useColorScheme(); // Uncomment if needed for themes

  return (
    <Tabs
      screenOptions={{
        // tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
      }}
    >
      {/* 1. Home Page (index.tsx) */}
      <Tabs.Screen
        name="index" 
        options={{
          title: 'Home', 
          tabBarIcon: ({ color, size }) => <TabBarIcon name="home-outline" size={size} color={color} />,
        }}
      />
      
      {/* 2. Projects Page (projects.tsx) */}
      <Tabs.Screen
        name="projects" // Matches the projects.tsx filename
        options={{
          title: 'Projects', // Updated Tab Name
          tabBarIcon: ({ color, size }) => <TabBarIcon name="folder-open-outline" size={size} color={color} />,
        }}
      />

      
      {/* 3. Calendar View Page (calendar.tsx) */}
      <Tabs.Screen
        name="calendar" 
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size }) => <TabBarIcon name="calendar-outline" size={size} color={color} />,
        }}
      />
      
    </Tabs>
  );
}