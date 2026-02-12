import React, { useState } from "react";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

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
import { useTasks, TaskPriority, TaskAttachment } from "../context/tasks";
import { useProjects } from "../context/projects";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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

    addTask({
      title: trimmedTitle,
      description: description.trim() || undefined,
      dueDate: dueDate || null, // Already in YYYY-MM-DD format from picker
      dueTime: dueTime || null,
      priority,
      category: category.trim() || null,
      projectId,
      attachments,
    });

    reset();
    setVisible(false);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Android requires manual closing; iOS can stay open in a 'spinner'
    if (Platform.OS === 'android') setShowDatePicker(false);

    if (selectedDate) {
      // Formats to YYYY-MM-DD for database & teammate's web compatibility
      setDueDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);

    if (selectedTime) {
      const timeString = selectedTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      setDueTime(timeString);
    }
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

              {/* Due Date Section */}
              {/* Deadlines Section */}
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Due date</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={{ color: dueDate ? "#111" : "#999" }}>
                      {dueDate ? new Date(dueDate).toLocaleDateString() : "Select Date"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Time</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Text style={{ color: dueTime ? "#111" : "#999" }}>
                      {dueTime || "Select Time"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Picker Components */}
              {showDatePicker && (
                <DateTimePicker
                  value={dueDate ? new Date(dueDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
              )}

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
