// apps/mobile/components/TaskList.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Task } from "../app/context/tasks";
import { useProjects } from "../app/context/projects";

// Minimal project shape we care about
type ProjectLike = {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
};

type TaskListProps = {
  tasks: Task[];
  onToggleTask?: (id: string) => void;
  onPressTask?: (task: Task) => void;
};

export default function TaskList({
  tasks,
  onToggleTask,
  onPressTask,
}: TaskListProps) {
  const { projects } = useProjects() as { projects: ProjectLike[] };

  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectLike>();
    projects?.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyWrapper}>
        <Text style={styles.emptyText}>No tasks yet. Add your first one!</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {tasks.map((item) => {
        const priorityLabel = item.priority.toUpperCase();
        const priorityColor =
          item.priority === "high"
            ? "#ef4444" // red
            : item.priority === "medium"
              ? "#f59e0b" // amber
              : "#22c55e"; // green

        const priorityBg = priorityColor + "1A";

        const project = item.projectId
          ? projectMap.get(item.projectId)
          : undefined;
        const projectColor = project?.color ?? "#6366f1";
        const projectBg = projectColor + "1A";

        return (
          <View key={item.id} style={styles.card}>
            {/* LEFT: toggle circle */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onToggleTask?.(item.id)}
              style={[
                styles.checkbox,
                item.done && [
                  styles.checkboxDone,
                  { borderColor: priorityColor },
                ],
                !item.done && { borderColor: "#d4d4d8" },
              ]}
            >
              {item.done && <Text style={styles.checkboxCheck}>✓</Text>}
            </TouchableOpacity>

            {/* MIDDLE: main content tap opens edit modal */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.content}
              onPress={() => onPressTask?.(item)}
            >
              <Text
                style={[styles.title, item.done && styles.titleDone]}
                numberOfLines={1}
              >
                {item.title}
              </Text>

              {/* metadata row */}
              {(item.dueDate ||
                item.attachments.length > 0 ||
                project ||
                item.priority) && (
                  <View style={styles.metaRow}>
                    {/* priority pill */}
                    <View
                      style={[styles.priorityPill, { backgroundColor: priorityBg }]}
                    >
                      <View
                        style={[
                          styles.priorityDot,
                          { backgroundColor: priorityColor },
                        ]}
                      />
                      <Text
                        style={[
                          styles.priorityText,
                          { color: priorityColor },
                        ]}
                      >
                        {priorityLabel}
                      </Text>
                    </View>

                    {/* due date */}
                    {item.dueDate && (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaEmoji}>📅</Text>
                        <Text style={styles.metaText}>{item.dueDate}</Text>
                      </View>
                    )}

                    {/* attachments */}
                    {item.attachments.length > 0 && (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaEmoji}>📎</Text>
                        <Text style={styles.metaText}>
                          {item.attachments.length}
                        </Text>
                      </View>
                    )}

                    {/* project pill */}
                    {project && (
                      <View
                        style={[
                          styles.metaChip,
                          { backgroundColor: projectBg, maxWidth: "55%" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.metaEmoji,
                            { color: projectColor, marginRight: 4 },
                          ]}
                        >
                          {project.icon || "📁"}
                        </Text>
                        <Text
                          style={[
                            styles.metaText,
                            { color: projectColor },
                          ]}
                          numberOfLines={1}
                        >
                          {project.name}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

              {/* optional short description under metadata */}
              {item.description && (
                <Text style={styles.description} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },

  emptyWrapper: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: "#9ca3af",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#f4f4f8",
    marginBottom: 10,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    backgroundColor: "#fff",
  },
  checkboxDone: {
    backgroundColor: "#111827",
  },
  checkboxCheck: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  content: {
    flex: 1,
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  titleDone: {
    color: "#9ca3af",
    textDecorationLine: "line-through",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
    flexWrap: "wrap",
  },

  priorityPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 5,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "600",
  },

  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },
  metaEmoji: {
    fontSize: 11,
    marginRight: 2,
  },
  metaText: {
    fontSize: 11,
    color: "#4b5563",
    fontWeight: "500",
  },

  description: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
});
