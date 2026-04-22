import React, { useEffect, useMemo, useState } from "react";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
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
  Pressable,
  Keyboard,
} from "react-native";
import { useTasks, TaskPriority, TaskAttachment } from "../context/tasks";
import { useProjects } from "../context/projects";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

const parseDateOnly = (dateString?: string | null) => {
  if (!dateString) return new Date();

  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const createDefaultTime = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const WEEKDAY_OPTIONS = [
  { label: "Sun", value: "sunday" },
  { label: "Mon", value: "monday" },
  { label: "Tue", value: "tuesday" },
  { label: "Wed", value: "wednesday" },
  { label: "Thu", value: "thursday" },
  { label: "Fri", value: "friday" },
  { label: "Sat", value: "saturday" },
];

export default function AddTaskModal() {
  const { addTask } = useTasks();
  const { projects, activeProjectId } = useProjects();

  const [visible, setVisible] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("low");
  const [category, setCategory] = useState("");
  const [projectId, setProjectId] = useState<string | null>(activeProjectId);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [pickerDate, setPickerDate] = useState<Date>(() => new Date());
  const [pickerTime, setPickerTime] = useState<Date>(() => createDefaultTime());
  const [draftDate, setDraftDate] = useState<Date>(() => new Date());
  const [draftTime, setDraftTime] = useState<Date>(() => createDefaultTime());

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] =
    useState<RecurringFrequency | null>(null);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);

  const canShowWeeklyDays = useMemo(
    () => isRecurring && recurringFrequency === "weekly",
    [isRecurring, recurringFrequency]
  );

  useEffect(() => {
    if (visible) {
      setProjectId(activeProjectId ?? null);
    }
  }, [activeProjectId, visible]);

  const toggleRecurringDay = (day: string) => {
    setRecurringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const reset = () => {
    setTitle("");
    setDescription("");
    setDueDate("");
    setDueTime("");
    setPriority("low");
    setCategory("");
    setProjectId(activeProjectId ?? null);
    setAttachments([]);
    setIsRecurring(false);
    setRecurringFrequency(null);
    setRecurringDays([]);
    setShowMoreOptions(false);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setPickerDate(new Date());
    setPickerTime(createDefaultTime());
    setDraftDate(new Date());
    setDraftTime(createDefaultTime());
  };

  const closeModal = () => {
    reset();
    Keyboard.dismiss(); // Make sure keyboard collapses when closing modal
    setVisible(false);
  };

  const openModal = () => {
    setProjectId(activeProjectId ?? null);
    setVisible(true);
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    if (isRecurring && !recurringFrequency) return;

    if (
      isRecurring &&
      recurringFrequency === "weekly" &&
      recurringDays.length === 0
    ) {
      return;
    }

    await addTask({
      title: trimmedTitle,
      description: description.trim() || undefined,
      dueDate: dueDate || null,
      dueTime: dueTime || null,
      priority,
      category: category.trim() || null,
      projectId: projectId ?? activeProjectId ?? null,
      attachments,
      isRecurring,
      recurringFrequency: isRecurring ? recurringFrequency : null,
      recurringDays:
        isRecurring && recurringFrequency === "weekly" ? recurringDays : [],
    });

    closeModal();
  };

  const openDatePicker = () => {
    const nextDate = dueDate ? parseDateOnly(dueDate) : pickerDate;
    setDraftDate(nextDate);
    setShowTimePicker(false);
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    setDraftTime(pickerTime);
    setShowDatePicker(false);
    setShowTimePicker(true);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }

    if (selectedDate) {
      setDraftDate(selectedDate);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === "dismissed") {
      setShowTimePicker(false);
      return;
    }

    if (selectedDate) {
      setDraftTime(selectedDate);
    }
  };

  const handleDateDone = () => {
    setPickerDate(draftDate);
    setDueDate(draftDate.toISOString().split("T")[0]);
    setShowDatePicker(false);
  };

  const handleTimeDone = () => {
    setPickerTime(draftTime);
    setDueTime(formatTime(draftTime));
    setShowTimePicker(false);
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
      <TouchableOpacity style={styles.fab} onPress={openModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* MODAL CONFIGURATION CHANGED */}
      <Modal
        visible={visible}
        transparent={false} // Key change: remove backdrop transparency issues
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.container} // New top-level container style
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          {/* We now place the header Row here, so it's always visible above the keyboard */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.headerAction}>Cancel</Text>
            </TouchableOpacity>

            <Text style={styles.title}>New task</Text>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                !title.trim() && styles.primaryButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!title.trim()}
            >
              <Text style={styles.primaryButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* The main content sheet */}
          <View style={styles.sheet}>
            <View style={styles.handle} />

            {/* Tap outside inputs to dismiss keyboard */}
            <Pressable style={styles.dismissArea} onPress={Keyboard.dismiss} />

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.section}>
                <TextInput
                  placeholder="What needs to get done?"
                  placeholderTextColor="#9ca3af"
                  value={title}
                  onChangeText={setTitle}
                  style={styles.titleInput}
                />

                <TextInput
                  placeholder="Add notes"
                  placeholderTextColor="#9ca3af"
                  value={description}
                  onChangeText={setDescription}
                  style={styles.noteInput}
                  multiline
                />
              </View>

              {/* SCHEDULE, PRIORITY, REPEAT CARDS (Exist unchanged) */}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Schedule</Text>

                <View style={styles.row}>
                  <TouchableOpacity
                    style={styles.pillField}
                    onPress={openDatePicker}
                  >
                    <Text style={styles.pillLabel}>Date</Text>
                    <Text style={styles.pillValue}>
                      {dueDate
                        ? parseDateOnly(dueDate).toLocaleDateString()
                        : "Select"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pillField}
                    onPress={openTimePicker}
                  >
                    <Text style={styles.pillLabel}>Time</Text>
                    <Text style={styles.pillValue}>{dueTime || "Any time"}</Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <View style={styles.pickerCard}>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerTitle}>Choose a date</Text>
                      <TouchableOpacity
                        style={styles.pickerDoneButton}
                        onPress={handleDateDone}
                      >
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>

                    <DateTimePicker
                      value={draftDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onDateChange}
                    />
                  </View>
                )}

                {showTimePicker && (
                  <View style={styles.pickerCard}>
                    <View style={styles.pickerHeader}>
                      <Text style={styles.pickerTitle}>Choose a time</Text>
                      <TouchableOpacity
                        style={styles.pickerDoneButton}
                        onPress={handleTimeDone}
                      >
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>

                    <DateTimePicker
                      value={draftTime}
                      mode="time"
                      is24Hour={false}
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={onTimeChange}
                    />
                  </View>
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Priority</Text>
                <View style={styles.chipRow}>
                  {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.chip, priority === p && styles.chipActive]}
                      onPress={() => setPriority(p)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          priority === p && styles.chipTextActive,
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
              </View>

              <View style={styles.card}>
                <View style={styles.inlineHeader}>
                  <Text style={styles.sectionTitle}>Repeat</Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (isRecurring) {
                        setIsRecurring(false);
                        setRecurringFrequency(null);
                        setRecurringDays([]);
                      } else {
                        setIsRecurring(true);
                        setRecurringFrequency("daily");
                      }
                    }}
                    style={[styles.toggle, isRecurring && styles.toggleOn]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        isRecurring && styles.toggleThumbOn,
                      ]}
                    />
                  </TouchableOpacity>
                </View>

                {isRecurring && (
                  <>
                    <View style={styles.chipRow}>
                      {(
                        ["daily", "weekly", "monthly", "yearly"] as RecurringFrequency[]
                      ).map((freq) => (
                        <TouchableOpacity
                          key={freq}
                          style={[
                            styles.chip,
                            recurringFrequency === freq && styles.chipActive,
                          ]}
                          onPress={() => {
                            setRecurringFrequency(freq);
                            if (freq !== "weekly") setRecurringDays([]);
                          }}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              recurringFrequency === freq &&
                              styles.chipTextActive,
                            ]}
                          >
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {canShowWeeklyDays && (
                      <View style={styles.dayRow}>
                        {WEEKDAY_OPTIONS.map((day) => {
                          const selected = recurringDays.includes(day.value);
                          return (
                            <TouchableOpacity
                              key={day.value}
                              style={[
                                styles.dayChip,
                                selected && styles.dayChipActive,
                              ]}
                              onPress={() => toggleRecurringDay(day.value)}
                            >
                              <Text
                                style={[
                                  styles.dayChipText,
                                  selected && styles.dayChipTextActive,
                                ]}
                              >
                                {day.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* MORE OPTIONS AND DETAILS CARDS (Exist unchanged) */}
              <TouchableOpacity
                style={styles.expandRow}
                onPress={() => setShowMoreOptions((prev) => !prev)}
              >
                <Text style={styles.expandText}>
                  {showMoreOptions ? "Hide details" : "More options"}
                </Text>
                <Text style={styles.expandChevron}>
                  {showMoreOptions ? "−" : "+"}
                </Text>
              </TouchableOpacity>

              {showMoreOptions && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Details</Text>

                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    placeholder="e.g. School"
                    placeholderTextColor="#9ca3af"
                    value={category}
                    onChangeText={setCategory}
                    style={styles.input}
                  />

                  <Text style={styles.label}>Project</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalList}
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
                            { backgroundColor: p.color || "#f1c84c" },
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

                  <Text style={styles.label}>Attachments</Text>
                  <View style={styles.attachRow}>
                    <TouchableOpacity
                      style={styles.attachButton}
                      onPress={handlePickImage}
                    >
                      <Text style={styles.attachText}>Add image</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachButton}
                      onPress={handlePickFile}
                    >
                      <Text style={styles.attachText}>Add file</Text>
                    </TouchableOpacity>
                  </View>

                  {attachments.length > 0 && (
                    <View style={styles.attachmentList}>
                      {attachments.map((a) => (
                        <View key={a.id} style={styles.attachmentItem}>
                          <Text style={styles.attachmentName} numberOfLines={1}>
                            {a.type === "image" ? "🖼️" : "📎"}{" "}
                            {a.name ?? a.uri.split("/").pop()}
                          </Text>
                          <TouchableOpacity onPress={() => removeAttachment(a.id)}>
                            <Text style={styles.removeText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Critical bottom padding */}
              <View style={styles.iosSafeAreaPadding} />
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
    right: 24,
    bottom: 30,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#111827",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    zIndex: 100, // Make sure it sits on top of everything
  },
  fabText: {
    color: "#fff",
    fontSize: 28,
    marginTop: -2,
  },
  // NEW CONTAINER STYLE
  container: {
    flex: 1,
    backgroundColor: "#f8fafc", // Same as sheet background, replaces backdrop
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Manual safe area handling
  },
  // Backdrop is removed, so overlay style is also removed.

  // SHEET MODIFICATIONS
  sheet: {
    backgroundColor: "#f8fafc",
    flex: 1, // Let it fill the rest of the container
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // Removed maxHeight and width properties
  },
  // NEW DISMISS AREA
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1, // Sits behind the scroll content
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#d1d5db",
    marginBottom: 10,
    marginTop: 10, // Added margin for spacing inside container
  },
  headerRow: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f8fafc", // Ensure header has solid background
    zIndex: 10, // Sits above scroll content
  },
  headerAction: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "500",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  primaryButton: {
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 16,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    paddingVertical: 8,
    paddingHorizontal: 2, // Minor refinement
  },
  noteInput: {
    marginTop: 8,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 92,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  // NEW PADDING
  iosSafeAreaPadding: {
    height: Platform.OS === 'ios' ? 120 : 60, // Ensure content isn't covered by keyboard
  },

  // (Remaining card and chip styles exist unchanged)
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#edf2f7",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  pillField: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pillLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  pillValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  pickerCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f8fafc",
    overflow: "hidden",
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  pickerDoneButton: {
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pickerDoneText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  chipText: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#fff",
  },
  inlineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggle: {
    width: 48,
    height: 30,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  toggleOn: {
    backgroundColor: "#111827",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  dayChip: {
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  dayChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  dayChipTextActive: {
    color: "#fff",
  },
  expandRow: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#edf2f7",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  expandText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  expandChevron: {
    fontSize: 20,
    color: "#6b7280",
    marginTop: -2,
  },
  label: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  horizontalList: {
    paddingVertical: 4,
    paddingRight: 4,
  },
  projectChip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#f8fafc",
  },
  projectChipActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  projectChipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
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
    marginTop: 4,
  },
  attachButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 12,
    alignItems: "center",
  },
  attachText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  attachmentList: {
    marginTop: 10,
    gap: 8,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  attachmentName: {
    flex: 1,
    marginRight: 12,
    fontSize: 12,
    color: "#374151",
  },
  removeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ef4444",
  },
});
