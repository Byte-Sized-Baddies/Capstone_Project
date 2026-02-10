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
import type { Task } from "../context/tasks";
import { SafeAreaView } from "react-native-safe-area-context";

import TaskList from "../../components/TaskList";
import AddTaskModal from "../../components/AddTaskModal";
import EditTaskModal from "../../components/EditTaskModal";
import HoneyCombTracker from "../../components/HoneyCombTracker"; // 👈 Import new component

type SortOption = "added" | "priority" | "dueDate";

export default function DashboardScreen() {
  const router = useRouter();
  const { tasks, updateTask, toggleTask } = useTasks();

  const [sortOption, setSortOption] = useState<SortOption>("added");
  const [showTodayOnly, setShowTodayOnly] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const todayKey = new Date().toISOString().slice(0, 10);

  // --- Sorting & Filtering Logic ---
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
    // Simple date match for today's filter
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

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Header --- */}
        <View style={styles.headerWrapper}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.appName}>DO BEE</Text>
              <Text style={styles.screenTitle}>Dashboard</Text>
            </View>

            {/* Profile Avatar */}
            <TouchableOpacity
              style={styles.initialCircle}
              activeOpacity={0.8}
              onPress={() => setProfileMenuOpen(!profileMenuOpen)}
            >
              <Text style={styles.avatarText}>M</Text>
            </TouchableOpacity>
          </View>

          {/* 👇 ADD THIS DROPDOWN BLOCK 👇 */}
          {profileMenuOpen && (
            <View style={styles.profileMenu}>
              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={() => {
                  setProfileMenuOpen(false);
                  router.push("/stats" as any); // Navigate to Stats
                }}
              >
                <Text style={styles.profileMenuText}>My Stats 📊</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={() => {
                  setProfileMenuOpen(false);
                  // router.push("/profile"); // Add route if you have one
                }}
              >
                <Text style={styles.profileMenuText}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={() => {
                  setProfileMenuOpen(false);
                  // router.push("/settings"); // Add route if you have one
                }}
              >
                <Text style={styles.profileMenuText}>Settings</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* --- 1. NEW: HoneyComb Tracker --- */}
        <HoneyCombTracker />

        {/* --- 2. Controls Row (Sort & Filter) --- */}
        <View style={styles.controlsRow}>
          {/* Sort Dropdown */}
          <View style={{ zIndex: 10 }}>
            <TouchableOpacity
              style={styles.pillButton}
              onPress={() => setSortMenuOpen(!sortMenuOpen)}
            >
              <Text style={styles.pillLabel}>Sort:</Text>
              <Text style={styles.pillValue}>{sortLabel}</Text>
              <Text style={styles.chevron}>{sortMenuOpen ? "▲" : "▼"}</Text>
            </TouchableOpacity>

            {sortMenuOpen && (
              <View style={styles.dropdownMenu}>
                {(["added", "priority", "dueDate"] as SortOption[]).map(
                  (opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.dropdownItem,
                        sortOption === opt && styles.dropdownItemActive,
                      ]}
                      onPress={() => handleSelectSort(opt)}
                    >
                      <Text
                        style={[
                          styles.dropdownText,
                          sortOption === opt && styles.dropdownTextActive,
                        ]}
                      >
                        {opt === "added"
                          ? "Added"
                          : opt === "priority"
                            ? "Priority"
                            : "Due Date"}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}
          </View>

          {/* Today Toggle */}
          <TouchableOpacity
            style={[
              styles.pillButton,
              showTodayOnly && styles.pillButtonActive,
            ]}
            onPress={() => setShowTodayOnly(!showTodayOnly)}
          >
            <Text
              style={[
                styles.pillValue,
                showTodayOnly && styles.pillTextActive,
              ]}
            >
              {showTodayOnly ? "Show All" : "Today’s Tasks"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- 3. Your Tasks List --- */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Your Tasks</Text>
          {displayTasks.length === 0 ? (
            <Text style={styles.emptyStateText}>
              No tasks found. Time to relax or add a new one!
            </Text>
          ) : (
            <TaskList
              tasks={displayTasks}
              onToggleTask={toggleTask}
              onPressTask={(task) => setEditingTask(task)}
            />
          )}
        </View>
      </ScrollView>

      {/* Floating Modal for Editing */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSave={(updates) => {
            updateTask(editingTask.id, updates);
            setEditingTask(null);
          }}
        />
      )}

      {/* Add Task Button (FAB) */}
      <AddTaskModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB", // Very light gray background
  },
  headerWrapper: {
    marginTop: 60,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  appName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  screenTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
  },
  initialCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 16,
  },

  // Controls Row (Sort/Filter)
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
    zIndex: 10, // Ensure dropdown floats above list
  },
  pillButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  pillLabel: {
    fontSize: 13,
    color: "#6B7280",
    marginRight: 4,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  chevron: {
    fontSize: 10,
    color: "#9CA3AF",
    marginLeft: 6,
  },

  // Dropdown
  dropdownMenu: {
    position: "absolute",
    top: 40,
    left: 0,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
    minWidth: 120,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  dropdownItemActive: {
    backgroundColor: "#F3F4F6",
  },
  dropdownText: {
    fontSize: 14,
    color: "#374151",
  },
  dropdownTextActive: {
    fontWeight: "600",
    color: "#111827",
  },
  // ... existing styles ...

  profileMenu: {
    position: "absolute",
    top: 50, // pushes it below the avatar
    right: 0,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    zIndex: 50,
  },
  profileMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  profileMenuText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },

  // Tasks Section
  tasksSection: {
    flex: 1,
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  emptyStateText: {
    textAlign: "center",
    marginTop: 40,
    color: "#9CA3AF",
    fontSize: 14,
    fontStyle: "italic",
  },
});