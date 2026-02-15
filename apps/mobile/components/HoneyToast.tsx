import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

type HoneyToastProps = {
  visible: boolean;
  count: number;
  goal: number;
};

export default function HoneyToast({ visible, count, goal }: HoneyToastProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current; // Start hidden above screen

  useEffect(() => {
    if (visible) {
      // Slide Down
      Animated.spring(slideAnim, {
        toValue: 60, // Distance from top
        useNativeDriver: true,
        friction: 6,
        tension: 50,
      }).start();
    } else {
      // Slide Up (Hide)
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.iconCircle}>
        <Text style={styles.emoji}>🐝</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Nectar Collected!</Text>
        <Text style={styles.subtitle}>
          You have {count} of {goal} drops for today.
        </Text>
      </View>
      {/* Mini Progress Bar */}
      <View style={styles.progressCircle}>
        <Text style={styles.progressText}>
          {count}/{goal}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 0,
    alignSelf: "center",
    width: width * 0.9,
    backgroundColor: "#1F2937", // Dark Contrast
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#F59E0B", // Gold Glow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10, // Android shadow
    zIndex: 9999, // Stay on top of everything
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  emoji: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#FBBF24", // Gold
    fontWeight: "700",
    fontSize: 14,
  },
  subtitle: {
    color: "#D1D5DB", // Light Gray
    fontSize: 11,
    marginTop: 2,
  },
  progressCircle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#374151",
    borderRadius: 8,
  },
  progressText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 12,
  },
});