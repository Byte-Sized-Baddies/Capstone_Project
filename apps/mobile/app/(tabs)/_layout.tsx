import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// import Colors from '@/constants/Colors'; 
// import { useColorScheme } from '@/components/useColorScheme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

// Helper component for TabBar icons
function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  size: number;
}) {
  return <Ionicons size={props.size} style={{ marginBottom: -3 }} {...props} />;
}

function BeeTabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.beeIconWrap, focused && styles.beeIconWrapActive]}>
      <View style={[styles.beeWing, styles.beeWingLeft]} />
      <View style={[styles.beeWing, styles.beeWingRight]} />
      <View style={styles.beeBody}>
        <View style={styles.beeStripe} />
        <View style={styles.beeStripe} />
      </View>
      <View style={styles.beeHead}>
        <View style={styles.beeEye} />
      </View>
    </View>
  );
}


export const unstable_settings = {
  initialRouteName: 'index', 
  order: [
    'index',      // 1st: Home
    'projects',   // 2nd: Projects (Using the file name you now have)
    'calendar',   // 3rd: Calendar
    'hive',       // 4th: The Hive
  ],
};


export default function TabLayout() {
  // const colorScheme = useColorScheme(); // Uncomment if needed for themes

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4052D6',
        tabBarInactiveTintColor: '#A1A1AA',
        tabBarStyle: {
          height: 84,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: '#FFFFFF',
          borderTopColor: '#ECE7DD',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
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

      <Tabs.Screen
        name="hive"
        options={{
          title: 'The Hive',
          tabBarIcon: ({ focused }) => <BeeTabIcon focused={focused} />,
        }}
      />
      
    </Tabs>
  );
}

const styles = StyleSheet.create({
  beeIconWrap: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -4,
    borderRadius: 16,
  },
  beeIconWrapActive: {
    backgroundColor: '#FFF6DB',
    borderWidth: 1,
    borderColor: '#F1C84C',
  },
  beeWing: {
    position: 'absolute',
    top: 4,
    width: 12,
    height: 15,
    borderRadius: 9,
    backgroundColor: '#E8ECFF',
    borderWidth: 1,
    borderColor: '#C9D2FF',
  },
  beeWingLeft: {
    left: 6,
    transform: [{ rotate: '-24deg' }],
  },
  beeWingRight: {
    right: 6,
    transform: [{ rotate: '24deg' }],
  },
  beeBody: {
    width: 19,
    height: 15,
    borderRadius: 10,
    backgroundColor: '#F1C84C',
    borderWidth: 1,
    borderColor: '#23243B',
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'stretch',
    transform: [{ rotate: '-8deg' }],
  },
  beeStripe: {
    width: 3,
    backgroundColor: '#23243B',
  },
  beeHead: {
    position: 'absolute',
    right: 7,
    top: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#23243B',
  },
  beeEye: {
    position: 'absolute',
    right: 2,
    top: 2,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
});
