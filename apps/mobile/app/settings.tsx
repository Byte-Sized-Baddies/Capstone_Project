// app/settings.tsx
import React, { useState } from "react";
import {
    View,
    Text,
    Switch,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

export default function SettingsScreen() {
    const router = useRouter();

    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [reminderTime, setReminderTime] = useState("08:00 AM");
    const [defaultPriority, setDefaultPriority] = useState("Medium");
    const [defaultCategory, setDefaultCategory] = useState("General");
    const [theme, setTheme] = useState("System");

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ padding: 20, paddingTop: 52 }}
        >
            {/* Header */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.backText}>‹ Back</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Settings</Text>
                    <Text style={styles.subtitle}>Customize your Do Bee experience</Text>
                </View>
            </View>

            {/* Notifications */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Notifications</Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Enable notifications</Text>
                    <Switch
                        value={notificationsEnabled}
                        onValueChange={setNotificationsEnabled}
                    />
                </View>

                <TouchableOpacity
                    style={styles.row}
                    onPress={() => {
                        // placeholder — add time picker later
                        setReminderTime("09:00 AM");
                    }}
                >
                    <Text style={styles.label}>Daily reminder time</Text>
                    <Text style={styles.value}>{reminderTime}</Text>
                </TouchableOpacity>
            </View>

            {/* Defaults */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Task Defaults</Text>

                <TouchableOpacity
                    style={styles.row}
                    onPress={() =>
                        setDefaultPriority((prev) =>
                            prev === "Low" ? "Medium" : prev === "Medium" ? "High" : "Low"
                        )
                    }
                >
                    <Text style={styles.label}>Default priority</Text>
                    <Text style={styles.value}>{defaultPriority}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.row}
                    onPress={() =>
                        setDefaultCategory((prev) =>
                            prev === "General"
                                ? "School"
                                : prev === "School"
                                    ? "Work"
                                    : "General"
                        )
                    }
                >
                    <Text style={styles.label}>Default category</Text>
                    <Text style={styles.value}>{defaultCategory}</Text>
                </TouchableOpacity>
            </View>

            {/* Theme */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Appearance</Text>

                <TouchableOpacity
                    style={styles.row}
                    onPress={() =>
                        setTheme((prev) =>
                            prev === "Light" ? "Dark" : prev === "Dark" ? "System" : "Light"
                        )
                    }
                >
                    <Text style={styles.label}>Theme</Text>
                    <Text style={styles.value}>{theme}</Text>
                </TouchableOpacity>
            </View>

            {/* Danger zone */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Advanced</Text>

                <TouchableOpacity
                    style={[styles.row, { justifyContent: "flex-start" }]}
                    onPress={() => alert("Reset feature coming soon!")}
                >
                    <Text style={[styles.label, { color: "#d9534f" }]}>
                        Reset all data
                    </Text>
                </TouchableOpacity>
            </View>

            {/* About */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>About</Text>
                <Text style={styles.infoText}>Do Bee — v1.0.0</Text>
                <Text style={styles.infoText}>Crafted with ❤️ by your team</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "#f4f4f7",
        flex: 1,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 20,
        gap: 12,
    },
    backText: {
        fontSize: 16,
        color: "#2563eb",
        marginTop: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: "#777",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 12,
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
    },
    label: {
        fontSize: 14,
        color: "#333",
    },
    value: {
        fontSize: 14,
        fontWeight: "500",
        color: "#444",
    },
    infoText: {
        fontSize: 13,
        color: "#777",
        marginBottom: 6,
    },
});
