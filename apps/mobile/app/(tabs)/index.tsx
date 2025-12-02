import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useTasks } from "../context/tasks";
import TaskList from "../../components/TaskList";
import AddTaskModal from "../../components/AddTaskModal";

type SortOption = "added" | "priority" | "dueDate";

export default function DashboardScreen() {
  const router = useRouter();
  const { tasks } = useTasks();

  const [sortOption, setSortOption] = useState<SortOption>("added");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const todayKey = new Date().toISOString().slice(0, 10);

  const completed = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const progress = total === 0 ? 0 : completed / total;

  const sortedTasks = useMemo(() => {
    const list = [...tasks];

    if (sortOption === "priority") {
      const weight: Record<string, number> = { high: 0, medium: 1, low: 2 };
      list.sort(
        (a, b) => (weight[a.priority] ?? 3) - (weight[b.priority] ?? 3)
      );
    } else if (sortOption === "dueDate") {
      const DEFAULT_KEY = "9999-12-31";
      list.sort((a, b) => {
        const aKey = a.dueDate ?? DEFAULT_KEY;
        const bKey = b.dueDate ?? DEFAULT_KEY;
        return aKey.localeCompare(bKey);
      });
    } else {
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return list;
  }, [tasks, sortOption]);

  const displayTasks = useMemo(() => {
    if (!showTodayOnly) return sortedTasks;
    return sortedTasks.filter((t) => t.dueDate === todayKey);
  }, [sortedTasks, showTodayOnly, todayKey]);

  const sortLabel =
    sortOption === "added"
      ? "Added"
      : sortOption === "priority"
        ? "Priority"
        : "Due date";

  const handleSelectSort = (opt: SortOption) => {
    setSortOption(opt);
    setSortMenuOpen(false);
  };

  const handleOpenProfile = () => {
    setProfileMenuOpen(false);
    router.push("/profile");
  };

  const handleOpenSettings = () => {
    setProfileMenuOpen(false);
    router.push("/settings");
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header + profile dropdown wrapper */}
        <View style={styles.headerWrapper}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.appName}>Do Bee</Text>
              <Text style={styles.screenTitle}>Dashboard</Text>
            </View>

            {/* Profile avatar */}
            <TouchableOpacity
              style={styles.initialCircle}
              activeOpacity={0.8}
              onPress={() => {
                setProfileMenuOpen((prev) => !prev);
                setSortMenuOpen(false);
              }}
            >
              <Text style={{ fontWeight: "600", color: "#fff" }}>N</Text>
            </TouchableOpacity>
          </View>

          {/* Profile dropdown */}
          {profileMenuOpen && (
            <View style={styles.profileMenu}>
              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={handleOpenProfile}
              >
                <Text style={styles.profileMenuText}>Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={handleOpenSettings}
              >
                <Text style={styles.profileMenuText}>Settings</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Overview card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Overview</Text>
            <Text style={styles.cardSubtitle}>
              {completed} of {total} tasks completed —{" "}
              {Math.round(progress * 100)}%
            </Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { flex: progress > 0 ? progress : 0.02 },
              ]}
            />
            <View
              style={{
                flex: 1 - (progress > 0 ? progress : 0.02),
              }}
            />
          </View>

          {/* Sort + Today pills on same line */}
          <View style={styles.actionsRow}>
            {/* Left: Sort pill + dropdown */}
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={styles.sortPill}
                onPress={() => {
                  setSortMenuOpen((prev) => !prev);
                  setProfileMenuOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.sortPillLabel}>Sort</Text>
                <Text style={styles.sortPillValue}>{sortLabel}</Text>
                <Text style={styles.sortPillChevron}>
                  {sortMenuOpen ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {sortMenuOpen && (
                <View style={styles.sortDropdown}>
                  {(["added", "priority", "dueDate"] as SortOption[]).map(
                    (opt) => {
                      const label =
                        opt === "added"
                          ? "Added"
                          : opt === "priority"
                            ? "Priority"
                            : "Due date";
                      const isActive = opt === sortOption;

                      return (
                        <TouchableOpacity
                          key={opt}
                          style={[
                            styles.sortOptionRow,
                            isActive && styles.sortOptionRowActive,
                          ]}
                          onPress={() => handleSelectSort(opt)}
                        >
                          <Text
                            style={[
                              styles.sortOptionText,
                              isActive && styles.sortOptionTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              )}
            </View>

            {/* Right: Today's Tasks pill */}
            <TouchableOpacity
              style={[
                styles.todayButton,
                showTodayOnly && styles.todayButtonActive,
              ]}
              onPress={() => {
                setShowTodayOnly((prev) => !prev);
                setSortMenuOpen(false);
                setProfileMenuOpen(false);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.todayButtonText,
                  showTodayOnly && styles.todayButtonTextActive,
                ]}
              >
                {showTodayOnly ? "Show all tasks" : "Today’s Tasks"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Your Tasks card */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.cardTitle}>Your Tasks</Text>
          <TaskList tasks={displayTasks} />
        </View>
      </ScrollView>

      {/* Floating FAB + modal */}
      <AddTaskModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f7",
  },

  headerWrapper: {
    position: "relative",
    marginTop: 52,
    marginBottom: 20,
    zIndex: 30,       // ⬅️ ensure header (and its dropdown) sit above cards
    elevation: 8,     // Android
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  appName: {
    fontSize: 14,
    color: "#888",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: 4,
  },
  initialCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },

  profileMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    borderRadius: 16,
    backgroundColor: "#fff",
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,   // ⬅️ higher than card elevation
    zIndex: 40,      // ⬅️ very high so it floats above everything
  },
  profileMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  profileMenuText: {
    fontSize: 14,
    color: "#333",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,   // lower than dropdown
  },
  cardHeaderRow: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
  },
  progressTrack: {
    flexDirection: "row",
    height: 10,
    borderRadius: 999,
    backgroundColor: "#eee",
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 16,
  },
  progressFill: {
    backgroundColor: "#f1c84c",
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  // Sort pill
  sortPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f0f0f3",
  },
  sortPillLabel: {
    fontSize: 12,
    color: "#777",
    marginRight: 4,
  },
  sortPillValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#222",
    marginRight: 6,
  },
  sortPillChevron: {
    fontSize: 10,
    color: "#777",
  },

  // Dropdown under sort pill
  sortDropdown: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    minWidth: 140,
  },
  sortOptionRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortOptionRowActive: {
    backgroundColor: "#f4f4f7",
  },
  sortOptionText: {
    fontSize: 13,
    color: "#444",
  },
  sortOptionTextActive: {
    fontWeight: "600",
  },

  // Today's Tasks pill
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f8e79f",
    alignSelf: "flex-start",
  },
  todayButtonActive: {
    backgroundColor: "#111",
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  todayButtonTextActive: {
    color: "#fff",
  },
});
