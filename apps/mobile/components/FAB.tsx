import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FABProps {
  onPress: () => void;
}

// Define the yellow accent color (must match the modal)
const ACCENT_YELLOW = '#FFD700';

const FAB: React.FC<FABProps> = ({ onPress }) => {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={30} color="#333" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    // Positioning the button in the bottom right corner
    position: 'absolute',
    bottom: 30,
    right: 30,

    // Sizing and shape
    width: 60,
    height: 60,
    borderRadius: 30, // Makes it a perfect circle

    // Yellow styling
    backgroundColor: ACCENT_YELLOW,

    // Centering the icon
    justifyContent: 'center',
    alignItems: 'center',

    // Modern elevation (Shadow for iOS and Android)
    shadowColor: ACCENT_YELLOW,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8, // Android shadow
  },
});

export default FAB;