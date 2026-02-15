// apps/mobile/components/EditTaskModal.tsx
import React, { useEffect, useState } from "react";
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
} from "../app/context/tasks";
import { useProjects } from "../app/context/projects";

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
    }) => void;
};

export default function EditTaskModal({
    task,
    onClose,
    onSave,
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

    // Sync when task changes
    useEffect(() => {
        setTitle(task.title);
        setDescription(task.description ?? "");
        setDueDate(task.dueDate ?? null);
        setDueTime(task.dueTime ?? null);
        setPriority(task.priority);
        setAttachments(task.attachments ?? []);
        setProjectId(task.projectId ?? null);
    }, [task.id]);

    const handleSave = () => {
        onSave({
            title: title.trim(),
            description: description.trim(),
            dueDate: dueDate || null,
            dueTime: dueTime || null,
            priority,
            attachments,
            projectId,
        });
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

                        {/* Due date */}
                        <Text style={styles.label}>Due date</Text>
                        <TextInput
                            value={dueDate ?? ""}
                            onChangeText={setDueDate}
                            style={styles.input}
                            placeholder="YYYY-MM-DD"
                        />

                        {/* Due time */}
                        <Text style={styles.label}>Due time</Text>
                        <TextInput
                            value={dueTime ?? ""}
                            onChangeText={setDueTime}
                            style={styles.input}
                            placeholder="HH:MM"
                        />

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
});
