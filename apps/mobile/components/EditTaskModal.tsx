// apps/mobile/components/EditTaskModal.tsx
import React, { useEffect, useState } from "react";
import { Platform, Alert } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Image,
} from "react-native";
import {
    Task,
    TaskAttachment,
    TaskPriority,
} from "../context/tasks";
import { useProjects } from "../context/projects";

const parseDateOnly = (dateString?: string | null) => {
    if (!dateString) return new Date();

    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
};

const formatDateOnly = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

const parseTimeValue = (timeString?: string | null) => {
    const fallback = createDefaultTime();
    if (!timeString) return fallback;

    const match = timeString
        .trim()
        .match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);

    if (!match) return fallback;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3]?.toLowerCase();

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback;

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
};

type ProjectLike = {
    id: string;
    name: string;
    color?: string | null;
    icon?: string | null;
};

type EditTaskModalProps = {
    task: Task;
    onClose: () => void;
    onSave: (updates: {
        title?: string;
        description?: string;
        dueDate?: string | null;
        dueTime?: string | null;
        priority?: TaskPriority;
        attachments?: TaskAttachment[];
        projectId?: string | null;
        isRecurring?: boolean;
        recurringFrequency?: "daily" | "weekly" | "monthly" | "yearly" | null;
        recurringDays?: string[];
    }) => void;
    onDelete: (taskId: string) => Promise<void> | void;

};


export default function EditTaskModal({
    task,
    onClose,
    onSave,
    onDelete,
}: EditTaskModalProps) {
    const { projects } = useProjects() as { projects: ProjectLike[] };

    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description ?? "");
    const [dueDate, setDueDate] = useState<string | null>(task.dueDate ?? null);
    const [dueTime, setDueTime] = useState<string | null>(task.dueTime ?? null);
    const [priority, setPriority] = useState<TaskPriority>(task.priority);
    const [attachments, setAttachments] = useState<TaskAttachment[]>(
        task.attachments ?? []
    );
    const [projectId, setProjectId] = useState<string | null>(
        task.projectId ?? null
    );

    type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

    const WEEKDAY_OPTIONS = [
        { label: "Sun", value: "sunday" },
        { label: "Mon", value: "monday" },
        { label: "Tue", value: "tuesday" },
        { label: "Wed", value: "wednesday" },
        { label: "Thu", value: "thursday" },
        { label: "Fri", value: "friday" },
        { label: "Sat", value: "saturday" },
    ];

    const [isRecurring, setIsRecurring] = useState(task.isRecurring ?? false);
    const [recurringFrequency, setRecurringFrequency] =
        useState<RecurringFrequency | null>(task.recurringFrequency ?? null);
    const [recurringDays, setRecurringDays] = useState<string[]>(
        task.recurringDays ?? []
    );

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [pickerDate, setPickerDate] = useState<Date>(() =>
        task.dueDate ? parseDateOnly(task.dueDate) : new Date()
    );
    const [pickerTime, setPickerTime] = useState<Date>(() =>
        parseTimeValue(task.dueTime)
    );
    const [draftDate, setDraftDate] = useState<Date>(() =>
        task.dueDate ? parseDateOnly(task.dueDate) : new Date()
    );
    const [draftTime, setDraftTime] = useState<Date>(() =>
        parseTimeValue(task.dueTime)
    );

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

    const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
        if (event.type === "dismissed") {
            setShowTimePicker(false);
            return;
        }

        if (selectedTime) {
            setDraftTime(selectedTime);
        }
    };

    const handleDateDone = () => {
        setPickerDate(draftDate);
        setDueDate(formatDateOnly(draftDate));
        setShowDatePicker(false);
    };

    const handleTimeDone = () => {
        setPickerTime(draftTime);
        setDueTime(formatTime(draftTime));
        setShowTimePicker(false);
    };

    const toggleRecurringDay = (day: string) => {
        setRecurringDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    };
    // Sync when task changes
    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description ?? "");
        setDueDate(task.dueDate ?? null);
        setDueTime(task.dueTime ?? null);
        setPriority(task.priority);
        setAttachments(task.attachments ?? []);
        setProjectId(task.projectId ?? null);
        setIsRecurring(task.isRecurring ?? false);
        setRecurringFrequency(task.recurringFrequency ?? null);
        setRecurringDays(task.recurringDays ?? []);
        setShowDatePicker(false);
        setShowTimePicker(false);
        setPickerDate(task.dueDate ? parseDateOnly(task.dueDate) : new Date());
        setDraftDate(task.dueDate ? parseDateOnly(task.dueDate) : new Date());
        setPickerTime(parseTimeValue(task.dueTime));
        setDraftTime(parseTimeValue(task.dueTime));
    }, [task]);

    const handleSave = () => {
        if (isRecurring && !recurringFrequency) {
            Alert.alert("Missing repeat frequency", "Please choose a repeat frequency.");
            return;
        }

        if (
            isRecurring &&
            recurringFrequency === "weekly" &&
            recurringDays.length === 0
        ) {
            Alert.alert("Missing repeat days", "Please choose at least one weekday.");
            return;
        }

        onSave({
            title: title.trim(),
            description: description.trim(),
            dueDate: dueDate || null,
            dueTime: dueTime || null,
            priority,
            attachments,
            projectId,
            isRecurring,
            recurringFrequency: isRecurring ? recurringFrequency : null,
            recurringDays:
                isRecurring && recurringFrequency === "weekly" ? recurringDays : [],
        });
    };

    const handleDelete = () => {
        Alert.alert(
            "Delete task?",
            "This can’t be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await onDelete(String(task.id));
                            onClose();
                        } catch (e) {
                            console.error("Delete failed:", e);
                            Alert.alert("Error", "Could not delete the task. Please try again.");
                        }
                    },
                },
            ]
        );
    };

    const handleRemoveAttachment = (id: string) => {
        setAttachments((prev) => prev.filter((a) => a.id !== id));
    };

    return (
        <Modal
            visible
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Edit task</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        contentContainerStyle={{ paddingBottom: 24 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Title */}
                        <Text style={styles.label}>Title</Text>
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            style={styles.input}
                            placeholder="Task title"
                        />

                        {/* Description */}
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            value={description}
                            onChangeText={setDescription}
                            style={[styles.input, styles.multiline]}
                            placeholder="Describe this task..."
                            multiline
                            textAlignVertical="top"
                        />
                        {/* Due Date Section */}
                        <Text style={styles.label}>Due Date</Text>
                        <TouchableOpacity
                            style={styles.input}
                            onPress={openDatePicker}
                        >
                            <Text style={{ color: dueDate ? "#111" : "#999" }}>
                                {dueDate ? parseDateOnly(dueDate).toLocaleDateString() : "Select Date"}
                            </Text>
                        </TouchableOpacity>

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
                        {/* Due Time Section */}
                        <Text style={styles.label}>Due Time</Text>
                        <TouchableOpacity
                            style={styles.input}
                            onPress={openTimePicker}
                        >
                            <Text style={{ color: dueTime ? "#111" : "#999" }}>
                                {dueTime || "Select Time"}
                            </Text>
                        </TouchableOpacity>

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

                        {/* Priority */}
                        <Text style={styles.label}>Priority</Text>
                        <View style={styles.priorityRow}>
                            {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                                <TouchableOpacity
                                    key={p}
                                    onPress={() => setPriority(p)}
                                    style={[
                                        styles.priorityChip,
                                        priority === p && styles.priorityChipActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.priorityChipText,
                                            priority === p && styles.priorityChipTextActive,
                                        ]}
                                    >
                                        {p.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Project selector */}
                        <Text style={styles.label}>Project</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingVertical: 4 }}
                        >
                            {/* No project chip */}
                            <TouchableOpacity
                                key="none"
                                onPress={() => setProjectId(null)}
                                style={[
                                    styles.projectChip,
                                    projectId === null && styles.projectChipActive,
                                ]}
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

                            {projects?.map((project) => {
                                const isActive = projectId === project.id;
                                const color = project.color ?? "#6366f1";
                                const bg = color + "1A";

                                return (
                                    <TouchableOpacity
                                        key={project.id}
                                        onPress={() => setProjectId(project.id)}
                                        style={[
                                            styles.projectChip,
                                            {
                                                backgroundColor: isActive ? color : bg,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.projectChipIcon,
                                                { color: isActive ? "#fff" : color },
                                            ]}
                                        >
                                            {project.icon || "📁"}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.projectChipText,
                                                { color: isActive ? "#fff" : color },
                                            ]}
                                            numberOfLines={1}
                                        >
                                            {project.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Recurring Task */}
                        <Text style={styles.label}>Repeat</Text>

                        <View style={styles.priorityRow}>
                            <TouchableOpacity
                                onPress={() => {
                                    setIsRecurring(false);
                                    setRecurringFrequency(null);
                                    setRecurringDays([]);
                                }}
                                style={[
                                    styles.priorityChip,
                                    !isRecurring && styles.priorityChipActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.priorityChipText,
                                        !isRecurring && styles.priorityChipTextActive,
                                    ]}
                                >
                                    NONE
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    setIsRecurring(true);
                                    if (!recurringFrequency) {
                                        setRecurringFrequency("daily");
                                    }
                                }}
                                style={[
                                    styles.priorityChip,
                                    isRecurring && styles.priorityChipActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.priorityChipText,
                                        isRecurring && styles.priorityChipTextActive,
                                    ]}
                                >
                                    RECURRING
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {isRecurring && (
                            <>
                                <Text style={styles.label}>Frequency</Text>
                                <View style={styles.priorityRow}>
                                    {(
                                        ["daily", "weekly", "monthly", "yearly"] as RecurringFrequency[]
                                    ).map((freq) => (
                                        <TouchableOpacity
                                            key={freq}
                                            onPress={() => {
                                                setRecurringFrequency(freq);
                                                if (freq !== "weekly") {
                                                    setRecurringDays([]);
                                                }
                                            }}
                                            style={[
                                                styles.priorityChip,
                                                recurringFrequency === freq &&
                                                styles.priorityChipActive,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.priorityChipText,
                                                    recurringFrequency === freq &&
                                                    styles.priorityChipTextActive,
                                                ]}
                                            >
                                                {freq.toUpperCase()}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        {isRecurring && recurringFrequency === "weekly" && (
                            <>
                                <Text style={styles.label}>Repeat on</Text>
                                <View style={styles.priorityRow}>
                                    {WEEKDAY_OPTIONS.map((day) => {
                                        const selected = recurringDays.includes(day.value);

                                        return (
                                            <TouchableOpacity
                                                key={day.value}
                                                onPress={() => toggleRecurringDay(day.value)}
                                                style={[
                                                    styles.dayChip,
                                                    selected && styles.dayChipActive,
                                                ]}
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
                            </>
                        )}

                        {/* Attachments */}
                        <Text style={styles.label}>Attachments</Text>
                        {attachments.length === 0 && (
                            <Text style={styles.emptyAttachments}>
                                No attachments for this task
                            </Text>
                        )}
                        {attachments.map((att) => (
                            <View key={att.id} style={styles.attachmentRow}>
                                {att.type === "image" ? (
                                    <Image source={{ uri: att.uri }} style={styles.image} />
                                ) : (
                                    <Text style={styles.attachmentText}>
                                        📎 {att.name ?? "File"}
                                    </Text>
                                )}
                                <TouchableOpacity
                                    onPress={() => handleRemoveAttachment(att.id)}
                                >
                                    <Text style={styles.removeAttachment}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        ))}

                        {/* Save */}
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>Save changes</Text>
                        </TouchableOpacity>
                        {/* Delete */}
                        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                            <Text style={styles.deleteButtonText}>Delete task</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.35)",
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: "white",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 18,
        paddingTop: 14,
        maxHeight: "80%",
    },
    sheetHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    closeText: {
        fontSize: 18,
    },
    label: {
        fontSize: 13,
        fontWeight: "600",
        marginTop: 12,
        marginBottom: 4,
    },
    input: {
        backgroundColor: "#f2f2f4",
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
    },
    pickerCard: {
        marginTop: 10,
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
    multiline: {
        minHeight: 80,
    },
    priorityRow: {
        flexDirection: "row",
        gap: 8,
    },
    priorityChip: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#d4d4d8",
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    priorityChipActive: {
        backgroundColor: "#111827",
        borderColor: "#111827",
    },
    dayChip: {
        minWidth: 44,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#d4d4d8",
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
    },
    dayChipActive: {
        backgroundColor: "#111827",
        borderColor: "#111827",
    },
    dayChipText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#374151",
    },
    dayChipTextActive: {
        color: "#fff",
    },
    priorityChipText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#374151",
    },
    priorityChipTextActive: {
        color: "#fff",
    },

    // Projects
    projectChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#e5e7eb",
        marginRight: 8,
    },
    projectChipActive: {
        backgroundColor: "#111827",
    },
    projectChipIcon: {
        fontSize: 13,
        marginRight: 4,
    },
    projectChipText: {
        fontSize: 12,
        fontWeight: "500",
        color: "#374151",
    },
    projectChipTextActive: {
        color: "#fff",
    },

    emptyAttachments: {
        fontSize: 12,
        color: "#777",
    },
    attachmentRow: {
        marginTop: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    attachmentText: {
        fontSize: 13,
    },
    image: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    removeAttachment: {
        fontSize: 12,
        color: "#ef4444",
    },
    saveButton: {
        marginTop: 20,
        marginBottom: 10,
        backgroundColor: "#111827",
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: "center",
    },
    saveButtonText: {
        color: "white",
        fontWeight: "600",
    },
    deleteButton: {
        marginTop: 14,
        backgroundColor: "#fee2e2",
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#fecaca",
    },
    deleteButtonText: {
        color: "#b91c1c",
        fontWeight: "700",
    },
});
