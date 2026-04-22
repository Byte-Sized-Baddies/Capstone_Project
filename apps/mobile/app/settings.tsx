import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth";
import {
  getGoogleCalendarId,
  getGoogleEmail,
  getMicrosoftCalendarName,
} from "../lib/integrationAuth";
import { supabase } from "../lib/supabaseClient";

WebBrowser.maybeCompleteAuthSession();

const SURFACE = "#F4F4F7";
const CARD = "#FFFFFF";
const TEXT = "#23243B";
const MUTED = "#8A8D96";
const LINE = "#E5E0D8";
const HONEY = "#F1C84C";
const HONEY_SOFT = "#FFF6DB";
const DANGER = "#DC2626";

type ThemeOption = "System" | "Light" | "Dark";
type DefaultView = "Dashboard" | "Calendar" | "The Hive";
type WeekStart = "Sunday" | "Monday";
type Priority = "Low" | "Medium" | "High";

const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "").replace(/\/$/, "");

// Supabase redirects here after OAuth — must be added to Supabase Auth > URL Configuration
const OAUTH_REDIRECT = "do-bee://";

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [integrations, setIntegrations] = useState<Record<string, any>>({});
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [gcalSyncMsg, setGcalSyncMsg] = useState<string | null>(null);
  const [gcalConnecting, setGcalConnecting] = useState(false);
  const [gmailConnecting, setGmailConnecting] = useState(false);
  const [outlookConnecting, setOutlookConnecting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("integrations_v2")
      .select("*")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, any> = {};
        data.forEach((row: any) => { map[row.service] = row; });
        setIntegrations(map);
      });
  }, [user?.id]);

  const refreshIntegrations = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("integrations_v2")
      .select("*")
      .eq("user_id", user.id);
    if (!data) return;
    const map: Record<string, any> = {};
    data.forEach((row: any) => { map[row.service] = row; });
    setIntegrations(map);
  };

  // ── Shared OAuth connect via Supabase (same pattern as web) ─────────────────
  const connectIntegration = async (
    provider: "google" | "azure",
    service: string,
    scopes: string,
    setConnecting: (v: boolean) => void,
    saveConfig: (accessToken: string) => Promise<void>
  ) => {
    if (!user?.id) return;
    setConnecting(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: OAUTH_REDIRECT,
          scopes,
          skipBrowserRedirect: true,
          ...(provider === "google"
            ? { queryParams: { access_type: "offline", prompt: "consent" } }
            : {}),
        },
      });

      if (error || !data.url) throw error ?? new Error("No auth URL");

      const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT);
      if (result.type !== "success") return;

      // Parse the auth code Supabase returns in the redirect URL
      const code = result.url.split("code=")[1]?.split("&")[0];
      if (!code) throw new Error("No auth code in redirect");

      const { data: authData, error: authError } =
        await supabase.auth.exchangeCodeForSession(decodeURIComponent(code));
      if (authError || !authData.session?.provider_token)
        throw authError ?? new Error("No provider token");

      await saveConfig(authData.session.provider_token);
      await refreshIntegrations();
    } catch (e: any) {
      Alert.alert("Connection failed", e?.message ?? "Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  const connectGoogleCalendar = () =>
    connectIntegration(
      "google",
      "google_calendar",
      "https://www.googleapis.com/auth/calendar email openid profile",
      setGcalConnecting,
      async (token) => {
        const calendarId = await getGoogleCalendarId(token);
        await supabase.from("integrations_v2").upsert({
          user_id: user!.id,
          service: "google_calendar",
          config: { access_token: token, calendar_id: calendarId },
          enabled: true,
        });
      }
    );

  const connectGmail = () =>
    connectIntegration(
      "google",
      "gmail",
      "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify email openid profile",
      setGmailConnecting,
      async (token) => {
        const email = await getGoogleEmail(token);
        await supabase.from("integrations_v2").upsert({
          user_id: user!.id,
          service: "gmail",
          config: { access_token: token, email },
          enabled: true,
        });
      }
    );

  const connectOutlook = () =>
    connectIntegration(
      "azure",
      "outlook_calendar",
      "Calendars.ReadWrite offline_access User.Read",
      setOutlookConnecting,
      async (token) => {
        const calendarName = await getMicrosoftCalendarName(token);
        await supabase.from("integrations_v2").upsert({
          user_id: user!.id,
          service: "outlook_calendar",
          config: { access_token: token, calendar_name: calendarName },
          enabled: true,
        });
      }
    );


  const disconnectIntegration = (service: string, displayName: string) => {
    if (!user?.id) return;
    Alert.alert(`Disconnect ${displayName}?`, "You can reconnect at any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          await supabase
            .from("integrations_v2")
            .delete()
            .eq("user_id", user.id)
            .eq("service", service);
          setIntegrations((prev) => {
            const next = { ...prev };
            delete next[service];
            return next;
          });
        },
      },
    ]);
  };

  const syncGoogleCalendar = async () => {
    if (!user?.id) return;
    if (!WEB_URL) {
      Alert.alert("Setup required", "Add EXPO_PUBLIC_WEB_URL to your .env to sync.");
      return;
    }
    setGcalSyncing(true);
    setGcalSyncMsg(null);
    try {
      const res = await fetch(`${WEB_URL}/api/integrations/google-calendar/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      setGcalSyncMsg(
        res.ok
          ? `Synced ${data.synced} task${data.synced !== 1 ? "s" : ""}`
          : `Sync failed: ${data.error}`
      );
    } catch {
      setGcalSyncMsg("Sync failed — check your connection");
    }
    setGcalSyncing(false);
  };

  const [pushNotifications, setPushNotifications] = useState(true);
  const [dueReminders, setDueReminders] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);
  const [smartNudges, setSmartNudges] = useState(true);
  const [reminderTime, setReminderTime] = useState("8:00 AM");

  const [defaultPriority, setDefaultPriority] = useState<Priority>("Medium");
  const [defaultView, setDefaultView] = useState<DefaultView>("Dashboard");
  const [weekStart, setWeekStart] = useState<WeekStart>("Monday");

  const [theme, setTheme] = useState<ThemeOption>("System");
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  const [biometricLock, setBiometricLock] = useState(false);
  const [cloudSync, setCloudSync] = useState(true);

  const cycleReminderTime = () => {
    setReminderTime((prev) => {
      if (prev === "8:00 AM") return "9:00 AM";
      if (prev === "9:00 AM") return "6:00 PM";
      return "8:00 AM";
    });
  };

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

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.appName}>DO BEE</Text>
              <Text style={styles.title}>Settings</Text>
            </View>
            <View style={styles.iconBadge}>
              <Ionicons name="settings-outline" size={22} color={TEXT} />
            </View>
          </View>
          <Text style={styles.subtitle}>
            Tune notifications, defaults, privacy, and how Do Bee feels day to day.
          </Text>
        </View>

        <SettingsSection title="Integrations" icon="link-outline">
          <IntegrationCard
            emoji="📅"
            name="Google Calendar"
            description="Sync tasks with due dates to your calendar"
            connected={!!integrations.google_calendar}
            connecting={gcalConnecting}
            connectedDetail={integrations.google_calendar?.config?.calendar_id ?? "Primary calendar"}
            onConnect={connectGoogleCalendar}
            onDisconnect={() => disconnectIntegration("google_calendar", "Google Calendar")}
            onRefresh={refreshIntegrations}
            primaryAction={
              integrations.google_calendar
                ? {
                    label: gcalSyncing ? "Syncing…" : "Sync now",
                    disabled: gcalSyncing,
                    onPress: syncGoogleCalendar,
                  }
                : undefined
            }
            statusMessage={gcalSyncMsg}
          />
          <IntegrationCard
            emoji="🗓️"
            name="Outlook Calendar"
            description="Sync tasks with due dates to Microsoft Outlook"
            connected={!!integrations.outlook_calendar}
            connecting={outlookConnecting}
            connectedDetail={integrations.outlook_calendar?.config?.calendar_name ?? "Primary Outlook calendar"}
            onConnect={connectOutlook}
            onDisconnect={() => disconnectIntegration("outlook_calendar", "Outlook Calendar")}
            onRefresh={refreshIntegrations}
          />
          <IntegrationCard
            emoji="📧"
            name="Gmail"
            description="Turn emails into tasks"
            connected={!!integrations.gmail}
            connecting={gmailConnecting}
            onConnect={connectGmail}
            onDisconnect={() => disconnectIntegration("gmail", "Gmail")}
            onRefresh={refreshIntegrations}
          />
        </SettingsSection>

        <SettingsSection title="Account" icon="person-circle-outline">
          <SettingsRow
            label="Profile"
            description="Name, avatar, and school or work details"
            value="Manage"
            icon="person-outline"
            onPress={() => router.push("/profile")}
          />
          <SettingsRow
            label="Connected email"
            description="Used for sync, reminders, and recovery"
            value="View"
            icon="mail-outline"
            onPress={() => Alert.alert("Account", "Email management is coming soon.")}
          />
        </SettingsSection>

        <SettingsSection title="Notifications" icon="notifications-outline">
          <SwitchRow
            label="Push notifications"
            description="Allow task alerts and schedule reminders"
            value={pushNotifications}
            onValueChange={setPushNotifications}
          />
          <SwitchRow
            label="Due date reminders"
            description="Get a heads up before tasks are due"
            value={dueReminders}
            onValueChange={setDueReminders}
            disabled={!pushNotifications}
          />
          <SwitchRow
            label="Daily digest"
            description="Start your day with a quick task summary"
            value={dailyDigest}
            onValueChange={setDailyDigest}
            disabled={!pushNotifications}
          />
          <SwitchRow
            label="Smart nudges"
            description="Gentle reminders for overdue or unscheduled tasks"
            value={smartNudges}
            onValueChange={setSmartNudges}
            disabled={!pushNotifications}
          />
          <SettingsRow
            label="Reminder time"
            description="Default time for daily reminders"
            value={reminderTime}
            icon="time-outline"
            onPress={cycleReminderTime}
            disabled={!pushNotifications}
          />
        </SettingsSection>

        <SettingsSection title="Task Preferences" icon="checkbox-outline">
          <ChoiceRow
            label="Default priority"
            options={["Low", "Medium", "High"]}
            value={defaultPriority}
            onChange={(next) => setDefaultPriority(next as Priority)}
          />
          <ChoiceRow
            label="Default start screen"
            options={["Dashboard", "Calendar", "The Hive"]}
            value={defaultView}
            onChange={(next) => setDefaultView(next as DefaultView)}
          />
          <ChoiceRow
            label="Week starts on"
            options={["Sunday", "Monday"]}
            value={weekStart}
            onChange={(next) => setWeekStart(next as WeekStart)}
          />
        </SettingsSection>

        <SettingsSection title="Appearance" icon="color-palette-outline">
          <ChoiceRow
            label="Theme"
            options={["System", "Light", "Dark"]}
            value={theme}
            onChange={(next) => setTheme(next as ThemeOption)}
          />
          <SwitchRow
            label="Haptic feedback"
            description="Subtle vibration when completing actions"
            value={hapticsEnabled}
            onValueChange={setHapticsEnabled}
          />
          <SwitchRow
            label="Compact task lists"
            description="Show more tasks on screen at once"
            value={compactMode}
            onValueChange={setCompactMode}
          />
        </SettingsSection>

        <SettingsSection title="Privacy and Data" icon="shield-checkmark-outline">
          <SwitchRow
            label="App lock"
            description="Require Face ID, Touch ID, or device passcode"
            value={biometricLock}
            onValueChange={setBiometricLock}
          />
          <SwitchRow
            label="Cloud sync"
            description="Keep tasks, notes, and schedules backed up"
            value={cloudSync}
            onValueChange={setCloudSync}
          />
          <SettingsRow
            label="Export my data"
            description="Download a copy of tasks, projects, and notes"
            value="Export"
            icon="download-outline"
            onPress={() => Alert.alert("Export", "Data export is coming soon.")}
          />
        </SettingsSection>

        <SettingsSection title="Support" icon="help-buoy-outline">
          <SettingsRow
            label="Help center"
            description="Guides for tasks, projects, notes, and time blocking"
            value="Open"
            icon="book-outline"
            onPress={() => Alert.alert("Help Center", "Help articles are coming soon.")}
          />
          <SettingsRow
            label="Send feedback"
            description="Share bugs, ideas, or feature requests"
            value="Write"
            icon="chatbubble-ellipses-outline"
            onPress={() => Alert.alert("Feedback", "Feedback form is coming soon.")}
          />
        </SettingsSection>

        <SettingsSection title="Advanced" icon="construct-outline">
          <SettingsRow
            label="Clear local cache"
            description="Refresh local app data without deleting your account"
            value="Clear"
            icon="refresh-outline"
            onPress={() => Alert.alert("Cache", "Cache clearing is coming soon.")}
          />
          <SettingsRow
            label="Reset all data"
            description="Permanently remove tasks, projects, schedules, and notes"
            value="Reset"
            icon="trash-outline"
            danger
            onPress={() =>
              Alert.alert(
                "Reset all data?",
                "This is a permanent action. We will add confirmation before enabling it."
              )
            }
          />
        </SettingsSection>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Do Bee</Text>
          <Text style={styles.aboutText}>Version 1.0.0</Text>
          <Text style={styles.aboutText}>Built to help busy students plan with less friction.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function IntegrationCard({
  emoji,
  name,
  description,
  connected,
  connecting = false,
  connectedDetail,
  onConnect,
  onDisconnect,
  onRefresh,
  primaryAction,
  statusMessage,
}: {
  emoji: string;
  name: string;
  description: string;
  connected: boolean;
  connecting?: boolean;
  connectedDetail?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  primaryAction?: { label: string; disabled?: boolean; onPress: () => void };
  statusMessage?: string | null;
}) {
  return (
    <View style={styles.integrationCard}>
      <View style={styles.integrationTop}>
        <View style={styles.integrationIconBadge}>
          <Text style={styles.integrationEmoji}>{emoji}</Text>
        </View>
        <View style={styles.integrationInfo}>
          <Text style={styles.integrationName}>{name}</Text>
          <Text style={styles.integrationDesc}>{description}</Text>
        </View>
        <View style={[styles.statusPill, connected && styles.statusPillConnected]}>
          <Text style={[styles.statusPillText, connected && styles.statusPillTextConnected]}>
            {connected ? "● On" : "Off"}
          </Text>
        </View>
      </View>

      {connected && connectedDetail ? (
        <Text style={styles.integrationDetail}>{connectedDetail}</Text>
      ) : null}

      {statusMessage ? (
        <Text style={[
          styles.integrationDetail,
          { color: statusMessage.startsWith("Sync") ? "#16a34a" : DANGER },
        ]}>
          {statusMessage}
        </Text>
      ) : null}

      <View style={styles.integrationActions}>
        {connected ? (
          <>
            {primaryAction && (
              <TouchableOpacity
                style={[styles.integrationBtn, styles.integrationBtnPrimary, primaryAction.disabled && { opacity: 0.6 }]}
                onPress={primaryAction.onPress}
                disabled={primaryAction.disabled}
              >
                <Text style={styles.integrationBtnPrimaryText}>{primaryAction.label}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.integrationBtn}
              onPress={onRefresh}
            >
              <Ionicons name="refresh-outline" size={14} color={TEXT} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.integrationBtn, styles.integrationBtnDanger]}
              onPress={onDisconnect}
            >
              <Text style={styles.integrationBtnDangerText}>Disconnect</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.integrationBtn, styles.integrationBtnConnect, connecting && { opacity: 0.6 }]}
            onPress={onConnect}
            disabled={connecting}
          >
            <Text style={styles.integrationBtnConnectText}>
              {connecting ? "Connecting…" : "Connect"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function SettingsSection({
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

function SettingsRow({
  label,
  description,
  value,
  icon,
  danger,
  disabled,
  onPress,
}: {
  label: string;
  description: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, disabled && styles.disabledRow]}
      activeOpacity={0.75}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.rowIcon, danger && styles.dangerIcon]}>
        <Ionicons name={icon} size={17} color={danger ? DANGER : TEXT} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={[styles.rowLabel, danger && styles.dangerText]}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <View style={styles.valuePill}>
        <Text style={[styles.valueText, danger && styles.dangerText]}>{value}</Text>
        <Ionicons name="chevron-forward" size={14} color={danger ? DANGER : MUTED} />
      </View>
    </TouchableOpacity>
  );
}

function SwitchRow({
  label,
  description,
  value,
  disabled,
  onValueChange,
}: {
  label: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={[styles.row, disabled && styles.disabledRow]}>
      <View style={styles.rowCopyNoIcon}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: "#D7D7DE", true: "#F6D968" }}
        thumbColor={value ? HONEY : "#FFFFFF"}
        ios_backgroundColor="#D7D7DE"
      />
    </View>
  );
}

function ChoiceRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.choiceBlock}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.segmentedControl}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.segment, selected && styles.segmentActive]}
              onPress={() => onChange(option)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
    marginBottom: 16,
  },
  backText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  appName: {
    fontSize: 13,
    fontWeight: "800",
    color: MUTED,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: TEXT,
    marginTop: 2,
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  iconBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: HONEY,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: TEXT,
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 66,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0ECE6",
  },
  disabledRow: {
    opacity: 0.45,
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
  rowCopyNoIcon: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT,
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
  choiceBlock: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0ECE6",
  },
  segmentedControl: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  segment: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#F7F7FA",
    borderWidth: 1,
    borderColor: "#ECECF0",
  },
  segmentActive: {
    backgroundColor: HONEY,
    borderColor: TEXT,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "800",
    color: MUTED,
  },
  segmentTextActive: {
    color: TEXT,
  },
  integrationCard: {
    borderTopWidth: 1,
    borderTopColor: "#F0ECE6",
    paddingTop: 14,
    paddingBottom: 6,
    gap: 8,
  },
  integrationTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  integrationIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: HONEY_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  integrationEmoji: {
    fontSize: 20,
  },
  integrationInfo: {
    flex: 1,
  },
  integrationName: {
    fontSize: 14,
    fontWeight: "800",
    color: TEXT,
  },
  integrationDesc: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F0ECE6",
  },
  statusPillConnected: {
    backgroundColor: "#dcfce7",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: MUTED,
  },
  statusPillTextConnected: {
    color: "#16a34a",
  },
  integrationDetail: {
    fontSize: 12,
    color: MUTED,
    marginLeft: 50,
  },
  integrationActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 50,
    flexWrap: "wrap",
  },
  integrationBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F7F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  integrationBtnPrimary: {
    backgroundColor: HONEY,
    flex: 1,
  },
  integrationBtnPrimaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: TEXT,
  },
  integrationBtnDanger: {
    backgroundColor: "#FEE2E2",
  },
  integrationBtnDangerText: {
    fontSize: 13,
    fontWeight: "700",
    color: DANGER,
  },
  integrationBtnConnect: {
    backgroundColor: TEXT,
    flex: 1,
  },
  integrationBtnConnectText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
  },
  aboutCard: {
    backgroundColor: "#23243B",
    borderRadius: 24,
    padding: 18,
    marginTop: 2,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: CARD,
    marginBottom: 5,
  },
  aboutText: {
    fontSize: 13,
    color: "#D8D8E0",
    lineHeight: 20,
  },
});
