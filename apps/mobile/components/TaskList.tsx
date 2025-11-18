// apps/mobile/components/TaskList.tsx
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
// Use the same Card component from before
// import { Card } from './OverviewCard'; 

// Mock task data
const tasks: any[] = []; 

export function TaskList() {
  return (
    <View>
      {/* List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Your Tasks</Text>
        <Pressable>
          <Text style={styles.sortButton}>Sort by Added</Text>
        </Pressable>
      </View>

      {/* Task List Card */}
      <View style={styles.card}>
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tasks yet — add one!</Text>
          </View>
        ) : (
          <FlatList
            data={tasks}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Text>{item.title}</Text>}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { // Copied from OverviewCard for this example
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    minHeight: 150, // Give it some height
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sortButton: {
    fontSize: 14,
    color: '#3b82f6',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});