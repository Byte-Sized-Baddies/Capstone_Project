import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
// ✅ components and context are siblings, so use ../context/tasks
import { useTasks, Task } from "../app/context/tasks";

type Props = {
  tasks?: Task[];
  // optional callbacks for future edit screen or custom behavior
  onTaskPress?: (task: Task) => void;
  onTaskLongPress?: (task: Task) => void;
};

function getFriendlyDueLabel(dueDate?: string | null) {
  if (!dueDate) return null;

  // expects YYYY-MM-DD (what we normalized in AddTaskModal)
  const todayKey = new Date().toISOString().slice(0, 10);
  if (dueDate === todayKey) return "Today";

  const today = new Date(todayKey);
  const target = new Date(dueDate);

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / msPerDay
  );

  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays < 0) return `${Math.abs(diffDays)} day(s) ago`;

  // Fallback: basic date string
  return target.toLocaleDateString();
}

export default function TaskList({ tasks: override, onTaskPress, onTaskLongPress }: Props) {
  const { tasks, toggleTask } = useTasks();
  const data = override ?? tasks;

  if (data.length === 0) {
    return (
      <View style={{ paddingVertical: 12 }}>
        <Text style={{ color: "#888", fontSize: 13 }}>
          No tasks yet. Tap the + button to add your first one.
        </Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Task }) => {
    const priorityColor =
      item.priority === "high"
        ? "#f97373"
        : item.priority === "medium"
          ? "#facc6b"
          : "#86efac";

    const hasAttachments = item.attachments?.length > 0;
    const friendlyDue = getFriendlyDueLabel(item.dueDate);

    const handlePress = () => {
      if (onTaskPress) {
        onTaskPress(item);
      } else {
        // default behavior: toggle done
        toggleTask(item.id);
      }
    };

    const handleLongPress = () => {
      if (onTaskLongPress) {
        onTaskLongPress(item);
      }
      // otherwise, no-op for now (you can later hook this to open an edit modal)
    };

    return (
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={[styles.row, item.done && { opacity: 0.5 }]}
      >
        <View style={styles.checkbox}>
          {item.done && <Text style={{ fontSize: 12 }}>✓</Text>}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              item.done && { textDecorationLine: "line-through" },
            ]}
          >
            {item.title}
          </Text>

          {!!item.description && (
            <Text style={styles.description} numberOfLines={1}>
              {item.description}
            </Text>
          )}

          <View style={styles.metaRow}>
            {/* Priority */}
            <View
              style={[
                styles.pill,
                { backgroundColor: priorityColor + "33" },
              ]}
            >
              <View
                style={[
                  styles.pillDot,
                  { backgroundColor: priorityColor },
                ]}
              />
              <Text style={styles.pillText}>
                {item.priority.charAt(0).toUpperCase() +
                  item.priority.slice(1)}{" "}
                priority
              </Text>
            </View>

            {/* Category */}
            {item.category && (
              <View style={styles.pill}>
                <Text style={styles.pillText}>{item.category}</Text>
              </View>
            )}

            {/* Project */}
            {item.projectId && (
              <View style={styles.pill}>
                {/* later you can swap id -> name by passing project in */}
                <Text style={styles.pillText}>📂 {item.projectId}</Text>
              </View>
            )}
          </View>

          <View style={styles.metaRow}>
            {/* Deadlines */}
            {(item.dueDate || item.dueTime) && (
              <Text style={styles.dueText}>
                Due{" "}
                {friendlyDue
                  ? friendlyDue
                  : item.dueDate
                    ? item.dueDate
                    : ""}
                {item.dueTime ? ` · ${item.dueTime}` : ""}
              </Text>
            )}

            {/* Attachments */}
            {hasAttachments && (
              <Text style={styles.attachInfo}>
                📎 {item.attachments.length} attachment
                {item.attachments.length > 1 ? "s" : ""}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.2,
    borderColor: "#bbb",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
  },
  description: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#f3f3f5",
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  pillText: {
    fontSize: 11,
    color: "#555",
  },
  dueText: {
    fontSize: 11,
    color: "#999",
  },
  attachInfo: {
    fontSize: 11,
    color: "#666",
    marginLeft: 8,
  },
});
