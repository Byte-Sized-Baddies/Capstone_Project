// app/profile.tsx
import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

export default function ProfileScreen() {
    const name = "Do-bee"; // placeholder, later you can pull from user data
    const email = "user@example.com";

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
                    <Text style={styles.title}>Profile</Text>
                    <Text style={styles.subtitle}>Manage your Do Bee account</Text>
                </View>
            </View>

            {/* Avatar + name */}
            <View style={styles.card}>
                <View style={styles.avatarRow}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarInitial}>
                            {name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.name}>{name}</Text>
                        <Text style={styles.email}>{email}</Text>
                    </View>
                </View>
            </View>

            {/* Account info */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Account</Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Email</Text>
                    <Text style={styles.value}>{email}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>Member since</Text>
                    <Text style={styles.value}>2025</Text>
                </View>
            </View>

            {/* Shortcuts */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Quick Actions</Text>

                <TouchableOpacity
                    style={styles.row}
                    onPress={() => router.push("/settings")}
                >
                    <Text style={styles.linkText}>Open Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.row}
                    onPress={() => alert("Sign out coming soon!")}
                >
                    <Text style={[styles.linkText, { color: "#d9534f" }]}>
                        Sign out
                    </Text>
                </TouchableOpacity>
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
    avatarRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
    },
    avatarCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: "#111",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitial: {
        fontSize: 24,
        fontWeight: "700",
        color: "#fff",
    },
    name: {
        fontSize: 18,
        fontWeight: "600",
    },
    email: {
        fontSize: 14,
        color: "#777",
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
    linkText: {
        fontSize: 14,
        fontWeight: "500",
        color: "#2563eb",
    },
});
