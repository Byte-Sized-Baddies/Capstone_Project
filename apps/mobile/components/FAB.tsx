// apps/mobile/components/FAB.tsx
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // npm install @expo/vector-icons

export function FAB() {
  const handlePress = () => {
    console.log('Add new task');
    // Here you would navigate to a "new task" screen
  };

  return (
    <Pressable style={styles.fab} onPress={handlePress}>
      <Ionicons name="add" size={32} color="white" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111827', // Dark gray / black
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});