import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>✅ do-bee mobile is running</Text>
        <Text style={styles.subtitle}>
          Expo (React Native) • imports from @repo/* supported
        </Text>

        <View style={styles.actions}>
          {/* Reload via Expo UI, but we include a dummy button to show UI */}
          <Pressable style={[styles.btn, styles.btnOutline]}>
            <Text>Open Dev Menu (⌘D / Ctrl+M)</Text>
          </Pressable>

          <Link href="/(tabs)/two" asChild>
            <Pressable style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnPrimaryText}>Go to Tab Two</Text>
            </Pressable>
          </Link>
        </View>

        <Text style={styles.hint}>
          Edit <Text style={styles.code}>apps/mobile/app/(tabs)/index.tsx</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
  card: { width: "88%", maxWidth: 520, backgroundColor: "white", borderRadius: 16, padding: 20, elevation: 2 },
  title: { fontSize: 20, fontWeight: "600" },
  subtitle: { marginTop: 6, color: "#6b7280" },
  actions: { marginTop: 16, flexDirection: "row", gap: 12, flexWrap: "wrap" },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  btnOutline: { borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff" },
  btnPrimary: { backgroundColor: "black" },
  btnPrimaryText: { color: "white", fontWeight: "600" },
  hint: { marginTop: 16, color: "#6b7280" },
  code: { backgroundColor: "#f3f4f6", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }
});
