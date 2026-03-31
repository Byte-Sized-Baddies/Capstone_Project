import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTasks } from "../context/tasks";

// Configuration

const HEX_SIZE = 22; // Smaller, cleaner size

const Hexagon = ({ filled }: { filled: boolean }) => {
    const fillAnim = useRef(new Animated.Value(filled ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(fillAnim, {
            toValue: filled ? 1 : 0,
            duration: 500,
            useNativeDriver: false,
            easing: Easing.out(Easing.back(1.5)), // Nice "pop" effect
        }).start();
    }, [filled]);

    const fillColor = fillAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["#F3F4F6", "#FBBF24"], // Light Gray -> Amber Gold
    });

    const strokeColor = fillAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["#E5E7EB", "#D97706"], // Gray Stroke -> Dark Amber Stroke
    });

    return (
        <View style={{ marginHorizontal: 3 }}>
            <Svg height={HEX_SIZE + 4} width={HEX_SIZE} viewBox="0 0 24 24">
                <AnimatedPath
                    d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            </Svg>
        </View>
    );
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

export default function HoneyCombTracker() {
    const { tasks, dailyGoal } = useTasks();

    // Count tasks completed TODAY
    const completedToday = tasks.filter((t) => {
        // 1. Must use the 'done' property mapped in TasksProvider
        if (!t.done) return false;

        // 2. Get today's date in YYYY-MM-DD format to match Supabase strings
        const today = new Date().toISOString().slice(0, 10);

        // 3. Fallback check: Use createdAt if completedAt isn't populated yet
        // This ensures the honeycomb fills even before the DB round-trip finishes
        const taskDate = t.completedAt || t.createdAt;

        return taskDate?.startsWith(today);
    }).length;

    return (
        <View style={styles.container}>
            {/* Left Side: Label & Count */}
            <View style={styles.infoSide}>
                <Text style={styles.label}>Daily Nectar</Text>
                <View style={styles.scoreRow}>
                    <Text style={styles.bigScore}>{completedToday}</Text>
                    {/* 3. Use the context-driven dailyGoal instead of hardcoded 5 */}
                    <Text style={styles.goalScore}>/{dailyGoal}</Text>
                </View>
            </View>

            {/* Right Side: Visuals */}
            <View style={styles.visualSide}>
                {/* 4. Generate hexagons dynamically based on Mia's current goal */}
                {Array.from({ length: dailyGoal }).map((_, index) => (
                    <Hexagon key={index} filled={index < completedToday} />
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        paddingVertical: 18,
        paddingHorizontal: 24,
        // Soft aesthetic shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: 24, // Space between this and tasks
        borderWidth: 1,
        borderColor: "#F3F4F6",
    },
    infoSide: {
        flexDirection: "column",
        justifyContent: "center",
    },
    label: {
        fontSize: 12,
        fontWeight: "600",
        color: "#9CA3AF", // Soft gray
        textTransform: "uppercase",
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    scoreRow: {
        flexDirection: "row",
        alignItems: "baseline",
    },
    bigScore: {
        fontSize: 28,
        fontWeight: "800",
        color: "#1F2937", // Dark almost-black
        fontVariant: ["oldstyle-nums"],
    },
    goalScore: {
        fontSize: 16,
        fontWeight: "600",
        color: "#9CA3AF",
        marginLeft: 2,
    },
    visualSide: {
        flexDirection: "row",
        alignItems: "center",
    },
});