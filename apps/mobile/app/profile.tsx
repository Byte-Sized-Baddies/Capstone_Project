// app/profile.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabaseClient";

type UserProfile = {
    email: string;
    displayName: string;
    memberSince?: string;
};

export default function ProfileScreen() {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);

            const { data, error } = await supabase.auth.getUser();
            if (!mounted) return;

            if (error || !data?.user) {
                setProfile(null);
                setLoading(false);
                return;
            }

            const user = data.user;
            const email = user.email ?? "";
            const displayName =
                // common places you might store a name
                (user.user_metadata?.full_name as string) ||
                (user.user_metadata?.name as string) ||
                (email ? email.split("@")[0] : "User");

            const memberSince = user.created_at
                ? new Date(user.created_at).getFullYear().toString()
                : undefined;

            setProfile({ email, displayName, memberSince });
            setLoading(false);
        };

        load();

        // keep screen up-to-date if auth changes
        const { data: sub } = supabase.auth.onAuthStateChange(() => {
            load();
        });

        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    const initials = useMemo(() => {
        const name = profile?.displayName?.trim() || "U";
        return name.charAt(0).toUpperCase();
    }, [profile?.displayName]);

    const handleSignOut = () => {
        Alert.alert("Sign out?", "You’ll need to log back in to access your tasks.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Sign out",
                style: "destructive",
                onPress: async () => {
                    const { error } = await supabase.auth.signOut();
                    if (error) {
                        Alert.alert("Error", error.message);
                        return;
                    }
                    // Send them to your login screen route (adjust if yours is different)
                    router.replace("/login");
                },
            },
        ]);
    };

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
                    <Text style={styles.subtitle}>Manage your Do-Bee account</Text>
                </View>
            </View>

            {loading ? (
                <View style={[styles.card, { alignItems: "center" }]}>
                    <ActivityIndicator />
                    <Text style={{ marginTop: 10, color: "#666" }}>Loading profile…</Text>
                </View>
            ) : !profile ? (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Not signed in</Text>
                    <Text style={{ color: "#666", marginBottom: 12 }}>
                        Please log in to view your profile.
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => router.replace("/login")}
                    >
                        <Text style={styles.primaryButtonText}>Go to Login</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Avatar + name */}
                    <View style={styles.card}>
                        <View style={styles.avatarRow}>
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarInitial}>{initials}</Text>
                            </View>
                            <View>
                                <Text style={styles.name}>{profile.displayName}</Text>
                                <Text style={styles.email}>{profile.email}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Account info */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Account</Text>

                        <View style={styles.row}>
                            <Text style={styles.label}>Email</Text>
                            <Text style={styles.value}>{profile.email}</Text>
                        </View>

                        <View style={styles.row}>
                            <Text style={styles.label}>Member since</Text>
                            <Text style={styles.value}>{profile.memberSince ?? "—"}</Text>
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Quick Actions</Text>

                        <TouchableOpacity
                            style={styles.row}
                            onPress={() => router.push("/settings")}
                        >
                            <Text style={styles.linkText}>Open Settings</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.row} onPress={handleSignOut}>
                            <Text style={[styles.linkText, { color: "#d9534f" }]}>
                                Sign out
                            </Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
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
    primaryButton: {
        backgroundColor: "#111827",
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: "center",
    },
    primaryButtonText: {
        color: "white",
        fontWeight: "600",
    },
});