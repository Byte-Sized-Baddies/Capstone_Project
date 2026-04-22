import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    ScrollView,
    Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useProjects } from "../../context/projects";
import { useTasks } from "../../context/tasks";
import type { Task } from "../../context/tasks";
import TaskList from "../../components/TaskList";
import AddTaskModal from "../../components/AddTaskModal";
import EditTaskModal from "../../components/EditTaskModal";

const COLOR_CHOICES = ["#FACC15", "#4ADE80", "#60A5FA", "#FB7185", "#A855F7", "#F97316"];
const ICON_CHOICES = ["📂", "📁", "📚", "📘", "📝", "💼", "🧪", "🏫", "🏋️‍♀️", "💡"];

const isEmojiIcon = (value?: string | null) => {
    if (!value) return false;
    return /[\u2190-\u2BFF\u{1F000}-\u{1FAFF}]/u.test(value);
};

function FolderVisual({
    color,
    icon,
}: {
    color: string;
    icon?: string | null;
}) {
    return (
        <View style={[styles.folderIcon, { backgroundColor: `${color}22` }]}>
            <View style={[styles.folderTab, { backgroundColor: color }]} />
            <View style={[styles.folderBody, { backgroundColor: color }]} />
            {isEmojiIcon(icon) ? (
                <Text style={styles.folderEmoji}>{icon}</Text>
            ) : (
                <MaterialCommunityIcons
                    name="folder"
                    size={22}
                    color="#ffffff"
                    style={styles.folderGlyph}
                />
            )}
        </View>
    );
}

function InlineProjectIcon({
    color,
    icon,
}: {
    color: string;
    icon?: string | null;
}) {
    if (isEmojiIcon(icon)) {
        return <Text style={styles.projectHeaderChipEmoji}>{icon}</Text>;
    }

    return (
        <Ionicons
            name="folder"
            size={18}
            color={color || "#111827"}
            style={styles.inlineFolderGlyph}
        />
    );
}

export default function ProjectsScreen() {
    const {
        projects,
        activeProjectId,
        setActiveProject,
        createProject,
        updateProject,
        deleteProject,
        getFolderMembers,
        shareProjectByEmail,
        removeFolderMember,
        updateFolderMemberRole,

    } = useProjects();

    const { tasks, toggleTask, updateTask, deleteTask } = useTasks();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [selectedColor, setSelectedColor] = useState(COLOR_CHOICES[0]);
    const [selectedIcon, setSelectedIcon] = useState(ICON_CHOICES[0]);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState(COLOR_CHOICES[0]);
    const [editIcon, setEditIcon] = useState(ICON_CHOICES[0]);

    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    const [showShareModal, setShowShareModal] = useState(false);
    const [shareEmail, setShareEmail] = useState("");
    const [shareRole, setShareRole] = useState<"member" | "viewer">("member");
    const [members, setMembers] = useState<
        { userId: string; email: string; fullName?: string | null; role: string }[]
    >([]);

    const activeProject = useMemo(
        () => projects.find((p) => p.id === activeProjectId) ?? null,
        [projects, activeProjectId]
    );

    const activeTasks = useMemo(() => {
        if (!activeProject) return [];
        return tasks.filter((t) => t.projectId === activeProject.id);
    }, [tasks, activeProject]);

    const handleCreate = async () => {
        if (!projectName.trim()) return;
        await createProject(projectName.trim(), selectedColor, selectedIcon);
        setProjectName("");
        setSelectedColor(COLOR_CHOICES[0]);
        setSelectedIcon(ICON_CHOICES[0]);
        setShowCreateModal(false);
    };

    const openEditForActive = () => {
        if (!activeProject) return;
        setShowActionsMenu(false);
        setEditingProjectId(activeProject.id);
        setEditName(activeProject.name);
        setEditColor(activeProject.color);
        setEditIcon(activeProject.icon || ICON_CHOICES[0]);
        setShowEditModal(true);
    };

    const handleEditSave = async () => {
        if (!editingProjectId) return;
        await updateProject(editingProjectId, {
            name: editName.trim() || undefined,
            color: editColor,
            icon: editIcon,
        });
        setShowEditModal(false);
    };

    const handleDeleteProject = () => {
        if (!editingProjectId) return;

        Alert.alert(
            "Delete project?",
            "This will remove the folder/project. This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await deleteProject(editingProjectId);
                        setShowEditModal(false);
                        setActiveProject(null);
                    },
                },
            ]
        );
    };

    const openShareForActive = async () => {
        if (!activeProject) return;
        setShowActionsMenu(false);
        const nextMembers = await getFolderMembers(activeProject.id);
        setMembers(nextMembers);
        setShareEmail("");
        setShareRole("member");
        setShowShareModal(true);
    };

    const handleShare = async () => {
        if (!activeProject) return;

        const result = await shareProjectByEmail(
            activeProject.id,
            shareEmail,
            shareRole
        );

        if (!result.success) {
            alert(result.message || "Could not share folder.");
            return;
        }

        // --- NEW CODE: Refresh the local members list ---
        const nextMembers = await getFolderMembers(activeProject.id);
        setMembers(nextMembers);

        // Clear the input field after successful share
        setShareEmail("");
    };

    const handleRemoveMember = async (userId: string) => {
        if (!activeProject) return;
        await removeFolderMember(activeProject.id, userId);
        const nextMembers = await getFolderMembers(activeProject.id);
        setMembers(nextMembers);
    };

    const handleToggleMemberRole = async (userId: string, currentRole: string) => {
        if (!activeProject) return;

        const nextRole = currentRole === "viewer" ? "member" : "viewer";
        await updateFolderMemberRole(activeProject.id, userId, nextRole);

        const nextMembers = await getFolderMembers(activeProject.id);
        setMembers(nextMembers);
    };

    const goBackToGrid = () => setActiveProject(null);
    const isGridView = !activeProject;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                {isGridView ? (
                    <>
                        <View>
                            <Text style={styles.screenTitle}>Projects</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => setShowCreateModal(true)}
                        >
                            <Text style={styles.primaryButtonText}>+ New Project</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        {/* 1. New Back Button Layout */}
                        <TouchableOpacity
                            style={styles.headerBackButton}
                            onPress={goBackToGrid}
                        >
                            <Ionicons name="arrow-back" size={26} color="#111827" />
                        </TouchableOpacity>

                        {/* 2. Centered Title */}
                        <View style={styles.headerCenter}>
                            <View style={styles.projectHeaderChip}>
                                <InlineProjectIcon
                                    color={activeProject?.color || "#111827"}
                                    icon={activeProject?.icon}
                                />
                                <Text style={styles.projectHeaderChipText} numberOfLines={1}>
                                    {activeProject?.name}
                                </Text>
                            </View>
                        </View>

                        {/* 3. Right Aligned Menu Button */}
                        <TouchableOpacity
                            style={styles.menuPill}
                            onPress={() => setShowActionsMenu(true)}
                        >
                            <Text style={styles.menuPillText}>•••</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {isGridView ? (
                <ScrollView
                    contentContainerStyle={styles.gridContent}
                    showsVerticalScrollIndicator={false}
                >
                    {projects.length === 0 && (
                        <Text style={styles.emptyText}>
                            No projects yet. Tap "New Project" to get started.
                        </Text>
                    )}
                    <View style={styles.grid}>
                        {projects.map((project) => {
                            const count = tasks.filter((t) => t.projectId === project.id).length;
                            const completed = tasks.filter(
                                (t) => t.projectId === project.id && t.done
                            ).length;
                            const pct = count === 0 ? 0 : Math.round((completed / count) * 100);

                            return (
                                <TouchableOpacity
                                    key={project.id}
                                    style={styles.projectCard}
                                    onPress={() => setActiveProject(project.id)}
                                    activeOpacity={0.9}
                                >
                                    <FolderVisual color={project.color} icon={project.icon} />
                                    <Text style={styles.projectTitle}>{project.name}</Text>
                                    <Text style={styles.projectMeta}>
                                        {count} tasks · {pct}% done
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            ) : (
                <View style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={{ paddingBottom: 120 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.tasksCard}>
                            <Text style={styles.tasksCardTitle}>Tasks</Text>
                            <TaskList
                                tasks={activeTasks}
                                onToggleTask={toggleTask}
                                onPressTask={(task) => setEditingTask(task)}
                            />
                        </View>
                    </ScrollView>
                    {editingTask && (
                        <EditTaskModal
                            task={editingTask}
                            onClose={() => setEditingTask(null)}
                            onSave={(updates) => {
                                updateTask(editingTask.id, updates);
                                setEditingTask(null);
                            }}
                            onDelete={(taskId) => deleteTask(taskId)}
                        />
                    )}
                    <AddTaskModal />
                </View>
            )}

            {/* ACTIONS MENU (Popover Style) */}
            <Modal transparent visible={showActionsMenu} animationType="fade">
                <TouchableOpacity
                    style={styles.popoverBackdrop}
                    activeOpacity={1}
                    onPress={() => setShowActionsMenu(false)}
                >
                    <View style={styles.popoverCard}>
                        <TouchableOpacity
                            style={styles.actionRow}
                            onPress={openShareForActive}
                        >
                            <Text style={styles.actionRowText}>Share</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionRow}
                            onPress={openEditForActive}
                        >
                            <Text style={styles.actionRowText}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* CREATE MODAL */}
            <Modal transparent visible={showCreateModal} animationType="fade">
                <View style={styles.modalOuter}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowCreateModal(false)}
                    />
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>New Project</Text>
                        <TextInput
                            placeholder="Project name"
                            value={projectName}
                            onChangeText={setProjectName}
                            style={styles.input}
                        />
                        <Text style={styles.label}>Color</Text>
                        <View style={styles.colorRow}>
                            {COLOR_CHOICES.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => setSelectedColor(color)}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: color },
                                        selectedColor === color && styles.colorCircleActive,
                                    ]}
                                />
                            ))}
                        </View>
                        <Text style={styles.label}>Icon</Text>
                        <View style={styles.iconRow}>
                            {ICON_CHOICES.map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    onPress={() => setSelectedIcon(icon)}
                                    style={[
                                        styles.iconChoice,
                                        selectedIcon === icon && styles.iconChoiceActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.iconChoiceText,
                                            selectedIcon === icon && styles.iconChoiceTextActive,
                                        ]}
                                    >
                                        {icon}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowCreateModal(false)}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleCreate}>
                                <Text style={styles.confirmText}>Create</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* EDIT MODAL */}
            <Modal transparent visible={showEditModal} animationType="fade">
                <View style={styles.modalOuter}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowEditModal(false)}
                    />
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Edit Project</Text>
                        <TextInput
                            placeholder="Project name"
                            value={editName}
                            onChangeText={setEditName}
                            style={styles.input}
                        />
                        <Text style={styles.label}>Color</Text>
                        <View style={styles.colorRow}>
                            {COLOR_CHOICES.map((color) => (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => setEditColor(color)}
                                    style={[
                                        styles.colorCircle,
                                        { backgroundColor: color },
                                        editColor === color && styles.colorCircleActive,
                                    ]}
                                />
                            ))}
                        </View>
                        <Text style={styles.label}>Icon</Text>
                        <View style={styles.iconRow}>
                            {ICON_CHOICES.map((icon) => (
                                <TouchableOpacity
                                    key={icon}
                                    onPress={() => setEditIcon(icon)}
                                    style={[
                                        styles.iconChoice,
                                        editIcon === icon && styles.iconChoiceActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.iconChoiceText,
                                            editIcon === icon && styles.iconChoiceTextActive,
                                        ]}
                                    >
                                        {icon}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={handleDeleteProject}
                            >
                                <Text style={styles.deleteButtonText}>Delete</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleEditSave}
                            >
                                <Text style={styles.confirmText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* SHARE MODAL */}
            <Modal transparent visible={showShareModal} animationType="fade">
                <View style={styles.modalOuter}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowShareModal(false)}
                    />
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Share Folder</Text>

                        <TextInput
                            placeholder="Enter existing user email"
                            value={shareEmail}
                            onChangeText={setShareEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={styles.input}
                        />

                        <Text style={styles.label}>Access</Text>
                        <View style={styles.iconRow}>
                            {(["member", "viewer"] as const).map((role) => (
                                <TouchableOpacity
                                    key={role}
                                    onPress={() => setShareRole(role)}
                                    style={[
                                        styles.iconChoice,
                                        shareRole === role && styles.iconChoiceActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.iconChoiceText,
                                            shareRole === role && styles.iconChoiceTextActive,
                                        ]}
                                    >
                                        {role}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowShareModal(false)}
                            >
                                <Text style={styles.cancelText}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={handleShare}
                            >
                                <Text style={styles.confirmText}>Add</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Collaborators</Text>
                        <ScrollView style={{ maxHeight: 220 }}>
                            {members.length === 0 ? (
                                <Text style={styles.emptyText}>No collaborators yet.</Text>
                            ) : (
                                members.map((member) => (
                                    <View key={member.userId} style={styles.memberRow}>
                                        <View style={{ flex: 1, marginRight: 10 }}>
                                            <Text style={styles.memberName}>
                                                {member.fullName || member.email}
                                            </Text>
                                            <Text style={styles.memberMeta}>
                                                {member.email}
                                            </Text>
                                        </View>

                                        <View style={styles.memberActions}>
                                            {member.role !== "owner" && (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.rolePill,
                                                        member.role === "member" && styles.rolePillActive,
                                                    ]}
                                                    onPress={() => handleToggleMemberRole(member.userId, member.role)}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.rolePillText,
                                                            member.role === "member" && styles.rolePillTextActive,
                                                        ]}
                                                    >
                                                        {member.role}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}

                                            {member.role !== "owner" && (
                                                <TouchableOpacity onPress={() => handleRemoveMember(member.userId)}>
                                                    <Text style={styles.removeMemberText}>Remove</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const CARD_RADIUS = 22;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f4f4f7",
        paddingHorizontal: 20,
        paddingTop: 52,
    },
    headerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 18,
    },

    // NEW HEADER STYLES
    headerBackButton: {
        width: 44,
        height: 44,
        justifyContent: "center",
        alignItems: "flex-start",
    },
    headerCenter: {
        flex: 1,
        alignItems: "center",
        paddingHorizontal: 8,
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
    primaryButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#111",
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "500",
    },
    menuPill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#111",
        minWidth: 52,
        alignItems: "center",
    },
    menuPillText: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "700",
        marginTop: -2,
    },
    gridContent: {
        paddingBottom: 120,
    },
    emptyText: {
        fontSize: 13,
        color: "#888",
        marginTop: 12,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 14,
        marginTop: 8,
    },
    projectCard: {
        width: "47%",
        backgroundColor: "#fff",
        borderRadius: CARD_RADIUS,
        padding: 12,
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    folderIcon: {
        width: "70%",
        height: 60,
        borderRadius: 18,
        marginBottom: 12,
        alignSelf: "center",
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },
    folderTab: {
        position: "absolute",
        top: 6,
        left: 0,
        height: 25,
        width: 46,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        opacity: 0.95,
    },
    folderBody: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 48,
        borderRadius: 12,
    },
    folderEmoji: {
        color: "#fff",
        zIndex: 2,
        fontSize: 24,
    },
    folderGlyph: {
        zIndex: 2,
    },
    inlineFolderGlyph: {
        marginRight: 6,
    },
    projectTitle: {
        fontSize: 15,
        fontWeight: "600",
    },
    projectMeta: {
        fontSize: 12,
        color: "#777",
        marginTop: 2,
    },
    tasksCard: {
        backgroundColor: "#fff",
        borderRadius: CARD_RADIUS,
        padding: 18,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    tasksCardTitle: {
        fontSize: 17,
        fontWeight: "600",
        marginBottom: 8,
    },
    modalOuter: {
        flex: 1,
        backgroundColor: "rgba(15,15,20,0.35)",
        justifyContent: "center",
        paddingHorizontal: 24,
    },

    // NEW POPOVER STYLES
    popoverBackdrop: {
        flex: 1,
    },
    popoverCard: {
        position: "absolute",
        top: 100, // Adjusts the menu to sit under the 3 dots
        right: 20, // Matches container padding
        width: 160,
        backgroundColor: "#fff",
        borderRadius: 16,
        paddingVertical: 8,
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
    },

    modalCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 18,
    },
    actionRow: {
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    actionRowText: {
        fontSize: 15,
        fontWeight: "600",
        color: "#111",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "600",
        marginBottom: 8,
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
        marginTop: 14,
    },
    colorRow: {
        flexDirection: "row",
        marginTop: 8,
        gap: 8,
        flexWrap: "wrap",
    },
    colorCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
    },
    colorCircleActive: {
        borderWidth: 2,
        borderColor: "#111",
    },
    iconRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    iconChoice: {
        minWidth: 36,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "#ddd",
        alignItems: "center",
        backgroundColor: "#fafafa",
    },
    iconChoiceActive: {
        backgroundColor: "#111",
        borderColor: "#111",
    },
    iconChoiceText: {
        fontSize: 16,
    },
    iconChoiceTextActive: {
        color: "#fff",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 18,
        gap: 10,
        flexWrap: "wrap",
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
    confirmButton: {
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#FACC15",
    },
    confirmText: {
        fontSize: 14,
        fontWeight: "600",
    },
    deleteButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#fee2e2",
    },
    deleteButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#b91c1c",
    },
    projectHeaderChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#ffffff",
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
        maxWidth: "100%",
    },
    projectHeaderChipEmoji: {
        fontSize: 18,
        marginRight: 6,
    },
    projectHeaderChipText: {
        fontSize: 14,
        fontWeight: "600",
    },
    memberRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    memberName: {
        fontSize: 14,
        fontWeight: "600",
    },
    memberMeta: {
        fontSize: 12,
        color: "#777",
    },
    removeMemberText: {
        color: "#ef4444",
        fontWeight: "600",
    },
    memberActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    rolePill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#f3f4f6",
        borderWidth: 1,
        borderColor: "#e5e7eb",
    },
    rolePillActive: {
        backgroundColor: "#111827",
        borderColor: "#111827",
    },
    rolePillText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151",
    },
    rolePillTextActive: {
        color: "#fff",
    },
});
