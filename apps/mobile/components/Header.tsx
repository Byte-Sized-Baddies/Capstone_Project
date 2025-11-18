// apps/mobile/components/Header.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';

export function Header() {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>Do Bee Dashboard</Text>
      <Pressable>
        <Text style={styles.settingsButton}>Settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    fontSize: 16,
    color: '#333',
    // You could style this to look more like a button
  },
});