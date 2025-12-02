import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useTasks, TaskPriority, TaskAttachment } from "../app/context/tasks";
import { useProjects } from "../app/context/projects";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

function normalizeDateInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  // already ISO: yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  // mm/dd[/yyyy] or mm-dd[-yyyy]
  const mdMatch = value.match(
    /^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/
  );
  if (mdMatch) {
    const month = parseInt(mdMatch[1], 10);
    const day = parseInt(mdMatch[2], 10);
    let year: number;

    if (mdMatch[3]) {
      const y = mdMatch[3];
      year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    } else {
      year = new Date().getFullYear();
    }

    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
  }

  // fallback: return trimmed value (better than nothing)
  return value;
}

function normalizeTimeInput(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;
  // For now just trim; you can add richer parsing later
  return value;
}

export default function AddTaskModal() {
  const { addTask } = useTasks();
  const { projects, activeProjectId } = useProjects();

  const [visible, setVisible] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(""); // user-facing input
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("low");
  const [category, setCategory] = useState("School");
  const [projectId, setProjectId] = useState<string | null>(activeProjectId);

  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setDueTime("");
    setPriority("low");
    setCategory("School");
    setProjectId(activeProjectId ?? null);
    setAttachments([]);
  };

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    const normalizedDueDate = normalizeDateInput(dueDate);
    const normalizedDueTime = normalizeTimeInput(dueTime);

    addTask({
      title: trimmedTitle,
      description: description.trim() || undefined,
      dueDate: normalizedDueDate,
      dueTime: normalizedDueTime,
      priority,
      category: category.trim() || null,
      projectId,
      attachments,
    });

    reset();
    setVisible(false);
  };

  // SMART DATE-TIME PARSING:
  // If user types "11/30 5pm" into the Due date field,
  // we automatically split to dueDate="11/30" and dueTime="5pm".
  const handleDueDateChange = (text: string) => {
    // Look for "date time" structure: "mm/dd ...time..."
    const match = text.match(
      /(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\s+(.+)/
    );

    if (match) {
      const [, datePart, timePart] = match;
      setDueDate(datePart);
      if (!dueTime) {
        setDueTime(timePart.trim());
      }
    } else {
      setDueDate(text);
    }
  };

  const handleDueTimeChange = (text: string) => {
    setDueTime(text);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          id: asset.assetId ?? asset.uri,
          uri: asset.uri,
          type: "image",
          name: asset.fileName,
        },
      ]);
    }
  };

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({});
    if (!result.canceled) {
      const file = result.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          id: file.uri,
          uri: file.uri,
          type: "file",
          name: file.name,
        },
      ]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <>
      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setVisible(true)}>
        <Text style={{ color: "#fff", fontSize: 26, marginTop: -2 }}>+</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOuter}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              reset();
              setVisible(false);
            }}
          />

          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Task</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <TextInput
                placeholder="Task name"
                value={title}
                onChangeText={setTitle}
                style={styles.input}
                autoFocus
              />

              <TextInput
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
                style={[styles.input, { height: 72 }]}
                multiline
              />

              {/* Deadlines */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Due date</Text>
                  <TextInput
                    placeholder="mm/dd or mm/dd/yyyy"
                    value={dueDate}
                    onChangeText={handleDueDateChange}
                    style={styles.input}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Time (deadline)</Text>
                  <TextInput
                    placeholder="e.g. 5:00 PM"
                    value={dueTime}
                    onChangeText={handleDueTimeChange}
                    style={styles.input}
                  />
                </View>
              </View>

              {/* Priority */}
              <Text style={[styles.label, { marginTop: 14 }]}>Priority</Text>
              <View style={styles.segmentRow}>
                {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.segment,
                      priority === p && styles.segmentActive,
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        priority === p && styles.segmentTextActive,
                      ]}
                    >
                      {p === "low"
                        ? "Low"
                        : p === "medium"
                          ? "Medium"
                          : "High"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category */}
              <Text style={[styles.label, { marginTop: 14 }]}>Category</Text>
              <TextInput
                placeholder="e.g. School"
                value={category}
                onChangeText={setCategory}
                style={styles.input}
              />

              {/* Project selector */}
              <Text style={[styles.label, { marginTop: 14 }]}>Project</Text>
              <ScrollView
                horizontal
                contentContainerStyle={{ marginTop: 8, paddingRight: 4 }}
                showsHorizontalScrollIndicator={false}
              >
                <TouchableOpacity
                  style={[
                    styles.projectChip,
                    projectId === null && styles.projectChipActive,
                  ]}
                  onPress={() => setProjectId(null)}
                >
                  <Text
                    style={[
                      styles.projectChipText,
                      projectId === null && styles.projectChipTextActive,
                    ]}
                  >
                    No project
                  </Text>
                </TouchableOpacity>

                {projects.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.projectChip,
                      projectId === p.id && styles.projectChipActive,
                    ]}
                    onPress={() => setProjectId(p.id)}
                  >
                    <View
                      style={[
                        styles.projectDot,
                        { backgroundColor: p.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.projectChipText,
                        projectId === p.id && styles.projectChipTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Attachments */}
              <Text style={[styles.label, { marginTop: 14 }]}>Attachments</Text>
              <View style={styles.attachRow}>
                <TouchableOpacity
                  style={styles.attachButton}
                  onPress={handlePickImage}
                >
                  <Text style={styles.attachText}>🖼️ Image</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.attachButton}
                  onPress={handlePickFile}
                >
                  <Text style={styles.attachText}>📎 File</Text>
                </TouchableOpacity>
              </View>

              {attachments.length > 0 && (
                <View style={{ marginTop: 10 }}>
                  {attachments.map((a) => (
                    <View key={a.id} style={styles.attachmentItem}>
                      <Text style={{ fontSize: 12 }}>
                        {a.type === "image" ? "🖼️" : "📎"}{" "}
                        {a.name ?? a.uri.split("/").pop()}
                      </Text>
                      <TouchableOpacity onPress={() => removeAttachment(a.id)}>
                        <Text style={{ fontSize: 12, color: "#999" }}>
                          Remove
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Buttons */}
              <View className="buttonRow" style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    reset();
                    setVisible(false);
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.addButton} onPress={handleSave}>
                  <Text style={styles.addText}>Add</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 26,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  modalOuter: {
    flex: 1,
    backgroundColor: "rgba(15,15,20,0.35)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 18,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 8,
    backgroundColor: "#fafafa",
    fontSize: 14,
  },
  label: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    marginTop: 4,
  },
  segmentRow: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
    flexWrap: "wrap",
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  segmentActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  segmentText: {
    fontSize: 13,
    color: "#555",
  },
  segmentTextActive: {
    color: "#fff",
  },
  projectChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: "#fafafa",
  },
  projectChipActive: {
    backgroundColor: "#111",
    borderColor: "#111",
  },
  projectChipText: {
    fontSize: 12,
    color: "#555",
  },
  projectChipTextActive: {
    color: "#fff",
  },
  projectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  attachRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  attachButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
    backgroundColor: "#fafafa",
  },
  attachText: {
    fontSize: 13,
  },
  attachmentItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f3f5",
  },
  cancelText: {
    fontSize: 14,
    color: "#555",
  },
  addButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f1c84c",
  },
  addText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
