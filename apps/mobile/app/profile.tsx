import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth";

const SURFACE = "#F4F4F7";
const CARD = "#FFFFFF";
const TEXT = "#23243B";
const MUTED = "#8A8D96";
const LINE = "#E5E0D8";
const HONEY = "#F1C84C";
const HONEY_SOFT = "#FFF6DB";
const DANGER = "#DC2626";
const SUCCESS = "#10B981";

type ProfileActionProps = {
  label: string;
  description: string;
  value?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  danger?: boolean;
  onPress: () => void;
};

const formatJoinDate = (createdAt?: string) => {
  if (!createdAt) return "Not available";
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString([], { month: "long", year: "numeric" });
};

const getAuthProvider = (provider?: string) => {
  if (!provider) return "Email";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
};

export default function ProfileScreen() {
  const { user, session, loading, logout } = useAuth();
  const supabaseUser = session?.user;

  const displayName =
    user?.name ||
    (supabaseUser?.user_metadata?.full_name as string | undefined) ||
    (supabaseUser?.user_metadata?.name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Do Bee User";

  const email = user?.email || supabaseUser?.email || "No email connected";
  const memberSince = formatJoinDate(supabaseUser?.created_at);
  const provider = getAuthProvider(supabaseUser?.app_metadata?.provider as string | undefined);
  const emailVerified = Boolean(supabaseUser?.email_confirmed_at);

  const initials = useMemo(() => {
    const words = displayName.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return displayName.charAt(0).toUpperCase() || "B";
  }, [displayName]);

  const handleSignOut = () => {
    Alert.alert("Sign out?", "You will need to log back in to access your tasks.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
            router.replace("/login");
          } catch (error) {
            const message = error instanceof Error ? error.message : "Please try again.";
            Alert.alert("Could not sign out", message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingCard}>
          <ActivityIndicator color={TEXT} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="person-outline" size={24} color={TEXT} />
          </View>
          <Text style={styles.emptyTitle}>Not signed in</Text>
          <Text style={styles.emptyText}>Log in to manage your profile, settings, and account details.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace("/login")}>
            <Text style={styles.primaryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.backPill} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={TEXT} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.profileHero}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{initials}</Text>
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.appName}>DO BEE PROFILE</Text>
              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.email}>{email}</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusPill}>
              <Ionicons
                name={emailVerified ? "shield-checkmark" : "shield-outline"}
                size={14}
                color={emailVerified ? SUCCESS : MUTED}
              />
              <Text style={styles.statusText}>{emailVerified ? "Verified" : "Unverified"}</Text>
            </View>
            <View style={styles.statusPill}>
              <Ionicons name="calendar-outline" size={14} color={MUTED} />
              <Text style={styles.statusText}>{memberSince}</Text>
            </View>
          </View>
        </View>

        <ProfileSection title="User Information" icon="id-card-outline">
          <InfoRow label="Display name" value={displayName} icon="person-outline" />
          <InfoRow label="Email" value={email} icon="mail-outline" />
          <InfoRow label="Sign-in method" value={provider} icon="key-outline" />
          <InfoRow label="User ID" value={user?.id ?? supabaseUser?.id ?? "Not available"} icon="finger-print-outline" />
        </ProfileSection>

        <ProfileSection title="Account Management" icon="settings-outline">
          <ProfileAction
            label="Edit profile"
            description="Update your name, photo, and profile details"
            value="Edit"
            icon="create-outline"
            onPress={() => Alert.alert("Edit profile", "Profile editing is coming soon.")}
          />
          <ProfileAction
            label="Security"
            description="Password, app lock, and sign-in options"
            value="Manage"
            icon="lock-closed-outline"
            onPress={() => Alert.alert("Security", "Security options are coming soon.")}
          />
          <ProfileAction
            label="Notification settings"
            description="Choose how Do Bee should remind you"
            value="Open"
            icon="notifications-outline"
            onPress={() => router.push("/settings")}
          />
        </ProfileSection>

        <ProfileSection title="Your Do Bee" icon="sparkles-outline">
          <View style={styles.statsGrid}>
            <MiniStat label="Member" value={memberSince === "Not available" ? "New" : memberSince} />
            <MiniStat label="Plan" value="Student" />
            <MiniStat label="Sync" value="On" />
          </View>
        </ProfileSection>

        <ProfileSection title="Support" icon="help-circle-outline">
          <ProfileAction
            label="Help center"
            description="Learn how to use projects, notes, and time blocking"
            value="Open"
            icon="book-outline"
            onPress={() => Alert.alert("Help center", "Help articles are coming soon.")}
          />
          <ProfileAction
            label="Send feedback"
            description="Report bugs or share ideas for Do Bee"
            value="Write"
            icon="chatbubble-ellipses-outline"
            onPress={() => Alert.alert("Feedback", "Feedback form is coming soon.")}
          />
        </ProfileSection>

        <ProfileSection title="Session" icon="log-out-outline">
          <ProfileAction
            label="Sign out"
            description="End this session on your device"
            value="Sign out"
            icon="exit-outline"
            danger
            onPress={handleSignOut}
          />
        </ProfileSection>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color={TEXT} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={17} color={TEXT} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function ProfileAction({
  label,
  description,
  value,
  icon,
  danger,
  onPress,
}: ProfileActionProps) {
  return (
    <TouchableOpacity style={styles.actionRow} activeOpacity={0.75} onPress={onPress}>
      <View style={[styles.rowIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={17} color={danger ? DANGER : TEXT} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      {value ? (
        <View style={styles.valuePill}>
          <Text style={[styles.valueText, danger && styles.dangerText]}>{value}</Text>
          <Ionicons name="chevron-forward" size={14} color={danger ? DANGER : MUTED} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStatCard}>
      <Text style={styles.miniStatValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  container: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  headerCard: {
    backgroundColor: CARD,
    borderRadius: 28,
    padding: 18,
    marginTop: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: LINE,
  },
  backPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: HONEY_SOFT,
    borderWidth: 1,
    borderColor: LINE,
    marginBottom: 18,
  },
  backText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },
  profileHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: HONEY,
    borderWidth: 2,
    borderColor: TEXT,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: TEXT,
    fontSize: 28,
    fontWeight: "900",
  },
  heroCopy: {
    flex: 1,
  },
  appName: {
    fontSize: 12,
    fontWeight: "900",
    color: MUTED,
    letterSpacing: 1.2,
  },
  name: {
    fontSize: 26,
    fontWeight: "900",
    color: TEXT,
    marginTop: 3,
  },
  email: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 3,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F7F7FA",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT,
  },
  sectionCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: LINE,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: HONEY_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: TEXT,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 62,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0ECE6",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 66,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0ECE6",
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: "#F7F7FA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dangerIcon: {
    backgroundColor: "#FEE2E2",
  },
  rowCopy: {
    flex: 1,
    paddingRight: 10,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT,
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: MUTED,
    marginTop: 3,
  },
  rowDescription: {
    fontSize: 12,
    lineHeight: 17,
    color: MUTED,
    marginTop: 3,
  },
  valuePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#F7F7FA",
  },
  valueText: {
    fontSize: 12,
    fontWeight: "800",
    color: TEXT,
  },
  dangerText: {
    color: DANGER,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0ECE6",
  },
  miniStatCard: {
    flex: 1,
    minHeight: 66,
    borderRadius: 18,
    backgroundColor: "#F7F7FA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  miniStatValue: {
    fontSize: 14,
    fontWeight: "900",
    color: TEXT,
    maxWidth: "100%",
  },
  miniStatLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },
  loadingCard: {
    margin: 20,
    marginTop: 72,
    backgroundColor: CARD,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: LINE,
  },
  loadingText: {
    marginTop: 10,
    color: MUTED,
    fontWeight: "700",
  },
  emptyStateCard: {
    margin: 20,
    marginTop: 72,
    backgroundColor: CARD,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: LINE,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: HONEY_SOFT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: TEXT,
  },
  emptyText: {
    color: MUTED,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: HONEY,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1,
    borderColor: TEXT,
  },
  primaryButtonText: {
    color: TEXT,
    fontWeight: "900",
  },
});
