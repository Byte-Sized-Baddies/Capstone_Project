// apps/mobile/app/(tabs)/home.tsx (or your dashboard file)
import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import your components
import { Header } from '../../components/Header';
import { OverviewCard } from '../../components/OverviewCard';
import { TaskList } from '../../components/TaskList';
import { FAB } from '../../components/FAB';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Header />
        <OverviewCard />
        <TaskList />
      </ScrollView>
      <FAB />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f4f5', // Light gray background
  },
  container: {
    padding: 16,
    gap: 24, // Adds space between components
  },
});