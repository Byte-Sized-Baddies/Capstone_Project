import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from "expo-router";
import Svg, { Path, Rect, Circle, Defs, ClipPath, G } from "react-native-svg";
import { useTasks } from './context/tasks';

// --- CUSTOM ICONS ---
const BackIcon = () => (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5D4037" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M19 12H5" />
        <Path d="M12 19l-7-7 7-7" />
    </Svg>
);

const CheckCircleIcon = () => (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2">
        <Circle cx="12" cy="12" r="10" fill="#E8F5E9" stroke="none" />
        <Path d="M9 12l2 2 4-4" stroke="#4CAF50" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const JarIcon = ({ color = "#FFC107" }) => (
    <Svg width="40" height="40" viewBox="0 0 24 24" fill="none">
        <Path d="M6 8C6 7.44772 6.44772 7 7 7H17C17.5523 7 18 7.44772 18 8V19C18 20.6569 16.6569 22 15 22H9C7.34315 22 6 20.6569 6 19V8Z" fill={color} stroke="#B45309" strokeWidth="1.5" />
        <Rect x="5" y="4" width="14" height="3" rx="1" fill="#78350F" />
        <Path d="M14 10H16" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
    </Svg>
);

const BeeIcon = ({ style }: { style?: any }) => (
    <Text style={[{ fontSize: 24 }, style]}>🐝</Text>
);

// --- THE HONEYCOMB HEXAGON COMPONENT ---
// This handles the clipping and the internal grid pattern
const HoneycombLiquid = ({ percent }: { percent: number }) => {
    // Defines the outer shape of the main hexagon
    // Points calculated for a 100x100 viewbox
    const hexPath = "M50 2 L93 27 L93 73 L50 98 L7 73 L7 27 Z";

    // Defines the internal "cells" (simple grid lines to look like honeycomb)
    const gridPath = `
        M50 2 V98 
        M7 27 L93 73 
        M93 27 L7 73 
        M28 14 L28 86 
        M72 14 L72 86
    `;

    return (
        <Svg height="180" width="180" viewBox="0 0 100 100">
            <Defs>
                {/* 1. Define the clipping mask (The Hexagon Shape) */}
                <ClipPath id="hexClip">
                    <Path d={hexPath} />
                </ClipPath>
            </Defs>

            {/* 2. Background (Empty Hexagon) */}
            <Path d={hexPath} fill="#FFF8E1" stroke="#FFECB3" strokeWidth="1" />

            {/* 3. The Liquid Fill (Clipped inside the hex) */}
            <Rect
                x="0"
                y={100 - percent} // Moves up as percentage increases
                width="100"
                height="100"
                fill="#FFC107"
                clipPath="url(#hexClip)" // 👈 THIS IS THE FIX
                opacity={0.9}
            />

            {/* 4. The Honeycomb Texture (Overlay lines) */}
            <Path
                d={gridPath}
                stroke="#FFB300"
                strokeWidth="0.5"
                opacity={0.5}
                clipPath="url(#hexClip)"
            />

            {/* 5. The Thick Outline (Drawn last to be clean) */}
            <Path d={hexPath} fill="none" stroke="#FFB300" strokeWidth="3" />

            {/* 6. Shine/Gloss Effect (Optional aesthetic touch) */}
            <Path d="M20 25 Q 50 40 80 25" fill="none" stroke="white" strokeWidth="2" opacity={0.4} clipPath="url(#hexClip)" />
        </Svg>
    );
};


// --- MAIN SCREEN ---
export default function StatsScreen() {
    const router = useRouter();
    const { tasks, dailyGoal, setDailyGoal } = useTasks();

    // --- CALCULATE REAL METRICS ---
    const todayKey = new Date().toISOString().slice(0, 10);
    const currentMonth = new Date().getMonth();

    const completedTasks = tasks.filter(t => t.done);

    const countToday = completedTasks.filter(t => t.completedAt?.startsWith(todayKey)).length;
    const countMonth = completedTasks.filter(t => t.completedAt && new Date(t.completedAt).getMonth() === currentMonth).length;
    const countAllTime = completedTasks.length;

    const jarsMonth = Math.floor(countMonth / Math.max(1, dailyGoal));
    const jarsAllTime = Math.floor(countAllTime / Math.max(1, dailyGoal));

    // Cap at 100% for the visual, but keep tracking numbers
    const progressPercent = Math.min(100, Math.round((countToday / dailyGoal) * 100));

    // Chart Data
    const weeklyChartData = useMemo(() => {
        const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dKey = d.toISOString().slice(0, 10);
            const count = completedTasks.filter(t => t.completedAt?.startsWith(dKey)).length;
            data.push({
                day: days[d.getDay()],
                height: dailyGoal > 0 ? Math.min(100, (count / dailyGoal) * 100) : 0
            });
        }
        return data;
    }, [completedTasks, dailyGoal]);

    const handleDecreaseGoal = () => { if (dailyGoal > 1) setDailyGoal(dailyGoal - 1); };
    const handleIncreaseGoal = () => { setDailyGoal(Math.min(50, dailyGoal + 1)); };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* Header */}
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <BackIcon />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Stats & Progress</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Adjust Daily Goal */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Adjust Daily Goal</Text>
                    <View style={styles.goalControlCard}>
                        <Text style={styles.goalLabel}>Daily Goal:</Text>
                        <View style={styles.counterControl}>
                            <TouchableOpacity style={styles.counterBtn} onPress={handleDecreaseGoal}>
                                <Text style={styles.counterBtnText}>-</Text>
                            </TouchableOpacity>
                            <View style={styles.counterValueBox}>
                                <Text style={styles.counterValue}>{dailyGoal} tasks</Text>
                            </View>
                            <TouchableOpacity style={styles.counterBtn} onPress={handleIncreaseGoal}>
                                <Text style={styles.counterBtnText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Nectar Hexagon */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitleCentered}>Nectar Hexagon</Text>

                    <View style={styles.hexagonWrapper}>

                        {/* The New Hexagon Component */}
                        <HoneycombLiquid percent={progressPercent} />

                        {/* Bees Decoration */}
                        <View style={styles.beesContainer}>
                            <BeeIcon style={styles.beeLeft} />
                            <BeeIcon style={styles.beeRight} />
                        </View>

                        {/* Text Overlay */}
                        <View style={styles.hexTextOverlay}>
                            <Text style={styles.percentage}>{Math.round(progressPercent)}%</Text>
                            <Text style={styles.tasksCompletedText}>{countToday} / {dailyGoal} Completed</Text>
                        </View>
                    </View>
                </View>

                {/* Stats Cards */}
                <View style={styles.statsCardsContainer}>
                    <View style={styles.statsCard}>
                        <Text style={styles.cardTitle}>Tasks Completed</Text>
                        <View style={styles.cardContent}>
                            <View style={styles.iconContainer}><CheckCircleIcon /></View>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{countMonth}</Text>
                                    <Text style={styles.statLabel}>Month</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{countAllTime}</Text>
                                    <Text style={styles.statLabel}>Total</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.statsCard}>
                        <Text style={styles.cardTitle}>Jars Collected</Text>
                        <View style={styles.cardContent}>
                            <View style={styles.iconContainer}><JarIcon /></View>
                            <View style={styles.statsRow}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{jarsMonth}</Text>
                                    <Text style={styles.statLabel}>This Month</Text>
                                </View>
                                <View style={styles.statDivider} />
                                <View style={styles.statItem}>
                                    <Text style={styles.statValue}>{jarsAllTime}</Text>
                                    <Text style={styles.statLabel}>Total</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Chart */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitleCentered}>Activity (Last 7 Days)</Text>
                    <View style={styles.chartCard}>
                        <View style={styles.barChart}>
                            {weeklyChartData.map((dayData, index) => (
                                <View key={index} style={styles.barContainer}>
                                    <View style={styles.barTrack}>
                                        <View style={[
                                            styles.bar,
                                            { height: `${dayData.height}%`, backgroundColor: dayData.height >= 100 ? "#FFA000" : "#FFC107" }
                                        ]}
                                        />
                                    </View>
                                    <Text style={styles.barLabel}>{dayData.day}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    scrollContent: { padding: 20, paddingBottom: 60 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    backButton: { padding: 8, borderRadius: 12, backgroundColor: '#FFF' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#5D4037' },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#5D4037', marginBottom: 12, marginLeft: 4 },
    sectionTitleCentered: { fontSize: 18, fontWeight: '700', color: '#5D4037', textAlign: 'center', marginBottom: 16 },

    goalControlCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFECB3', borderRadius: 20, padding: 6, paddingLeft: 16 },
    goalLabel: { fontSize: 15, fontWeight: '600', color: '#8B4513' },
    counterControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFD54F', borderRadius: 16, padding: 2 },
    counterBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    counterBtnText: { fontSize: 20, color: '#5D4037', fontWeight: 'bold' },
    counterValueBox: { backgroundColor: '#FFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, minWidth: 80, alignItems: 'center' },
    counterValue: { fontSize: 15, fontWeight: '700', color: '#8B4513' },

    hexagonWrapper: { alignItems: 'center', justifyContent: 'center', height: 180, position: 'relative' },
    beesContainer: { position: 'absolute', width: 240, flexDirection: 'row', justifyContent: 'space-between', top: 20 },
    beeLeft: { transform: [{ rotate: '-15deg' }] },
    beeRight: { transform: [{ rotate: '15deg' }] },

    hexTextOverlay: { position: 'absolute', alignItems: 'center', zIndex: 10 },
    percentage: { fontSize: 32, fontWeight: '800', color: '#5D4037', textShadowColor: 'rgba(255, 255, 255, 0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    tasksCompletedText: { fontSize: 14, color: '#5D4037', fontWeight: '700', marginTop: 4, textShadowColor: 'rgba(255, 255, 255, 0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

    statsCardsContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    statsCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
    cardTitle: { fontSize: 13, fontWeight: '700', color: '#8D6E63', textAlign: 'center', marginBottom: 12, textTransform: 'uppercase' },
    cardContent: { alignItems: 'center' },
    iconContainer: { marginBottom: 12 },
    statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: { fontSize: 18, fontWeight: '800', color: '#5D4037' },
    statLabel: { fontSize: 11, color: '#A1887F', marginTop: 2 },
    statDivider: { width: 1, height: '100%', backgroundColor: '#EEE' },

    chartCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 140, paddingBottom: 8 },
    barContainer: { alignItems: 'center', flex: 1 },
    barTrack: { height: 100, width: 12, backgroundColor: '#F3F4F6', borderRadius: 6, justifyContent: 'flex-end', marginBottom: 6 },
    bar: { width: '100%', borderRadius: 6 },
    barLabel: { fontSize: 11, color: '#8D6E63', fontWeight: '600' },
});