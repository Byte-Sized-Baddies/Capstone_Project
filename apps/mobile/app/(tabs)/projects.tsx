import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    TextInput,
    ScrollView,
} from "react-native";
import { useProjects } from "../context/projects";
import { useTasks } from "../context/tasks";
import TaskList from "../../components/TaskList";
import AddTaskModal from "../../components/AddTaskModal";

const COLOR_CHOICES = [
    "#FACC15",
    "#4ADE80",
    "#60A5FA",
    "#FB7185",
    "#A855F7",
    "#F97316",
];

const ICON_CHOICES = [
    "📂",
    "📁",
    "📚",
    "📘",
    "📝",
    "💼",
    "🧪",
    "🏫",
    "🏋️‍♀️",
    "💡",
];

export default function ProjectsScreen() {
    const {
        projects,
        activeProjectId,
        setActiveProject,
        createProject,
        updateProject,
    } = useProjects();
    const { tasks } = useTasks();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [selectedColor, setSelectedColor] = useState(COLOR_CHOICES[0]);
    const [selectedIcon, setSelectedIcon] = useState(ICON_CHOICES[0]);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState(COLOR_CHOICES[0]);
    const [editIcon, setEditIcon] = useState(ICON_CHOICES[0]);

    const activeProject = useMemo(
        () => projects.find((p) => p.id === activeProjectId) ?? null,
        [projects, activeProjectId]
    );

    const activeTasks = useMemo(() => {
        if (!activeProject) return [];
        return tasks.filter((t) => t.projectId === activeProject.id);
    }, [tasks, activeProject]);

    const handleCreate = () => {
        if (!projectName.trim()) return;
        createProject(projectName, selectedColor, selectedIcon);
        setProjectName("");
        setSelectedColor(COLOR_CHOICES[0]);
        setSelectedIcon(ICON_CHOICES[0]);
        setShowCreateModal(false);
    };

    const openEditForActive = () => {
        if (!activeProject) return;
        setEditingProjectId(activeProject.id);
        setEditName(activeProject.name);
        setEditColor(activeProject.color);
        setEditIcon(activeProject.icon);
        setShowEditModal(true);
    };

    const handleEditSave = () => {
        if (!editingProjectId) return;
        updateProject(editingProjectId, {
            name: editName.trim() || undefined,
            color: editColor,
            icon: editIcon,
        });
        setShowEditModal(false);
    };

    const goBackToGrid = () => setActiveProject(null);

    const isGridView = !activeProject;

    // ---------- RENDER ----------
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.headerRow}>
                {isGridView ? (
                    <>
                        {/* GRID VIEW HEADER */}
                        <View>
                            <Text style={styles.appName}>DO BEE</Text>
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
                        {/* PROJECT DETAIL HEADER */}
                        <View style={styles.detailHeaderLeft}>

                            {/* pill with emoji + name under DO BEE */}
                            <View style={{ marginTop: 6 }}>
                                <View style={styles.projectHeaderChip}>
                                    <Text style={styles.projectHeaderChipEmoji}>
                                        {activeProject?.icon}
                                    </Text>
                                    <Text style={styles.projectHeaderChipText}>
                                        {activeProject?.name}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.detailHeaderButtonsRow}>
                            <TouchableOpacity style={styles.secondaryButton} onPress={goBackToGrid}>
                                <Text style={styles.secondaryButtonText}>← All Projects</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryButton} onPress={openEditForActive}>
                                <Text style={styles.primaryButtonText}>Edit</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </View>


            {/* GRID VIEW */}
            {isGridView ? (
                <ScrollView
                    contentContainerStyle={styles.gridContent}
                    showsVerticalScrollIndicator={false}
                >
                    {projects.length === 0 && (
                        <Text style={styles.emptyText}>
                            No projects yet. Tap &quot;New Project&quot; to get started.
                        </Text>
                    )}

                    <View style={styles.grid}>
                        {projects.map((project) => {
                            const count = tasks.filter((t) => t.projectId === project.id).length;
                            const completed = tasks.filter(
                                (t) => t.projectId === project.id && t.done
                            ).length;
                            const pct =
                                count === 0 ? 0 : Math.round((completed / count) * 100);

                            return (
                                <TouchableOpacity
                                    key={project.id}
                                    style={styles.projectCard}
                                    onPress={() => setActiveProject(project.id)}
                                    activeOpacity={0.9}
                                >
                                    {/* Folder icon with emoji */}
                                    <View
                                        style={[
                                            styles.folderIcon,
                                            { backgroundColor: project.color + "22" },
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.folderTab,
                                                { backgroundColor: project.color },
                                            ]}
                                        />
                                        <View
                                            style={[
                                                styles.folderBody,
                                                { backgroundColor: project.color },
                                            ]}
                                        />
                                        <Text style={styles.folderEmoji}>{project.icon}</Text>
                                    </View>

                                    <Text style={styles.projectTitle}>{project.name}</Text>
                                    <Text style={styles.projectMeta}>
                                        {count} task{count === 1 ? "" : "s"} · {pct}% done
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
            ) : (
                // PROJECT DETAIL VIEW
                <View style={{ flex: 1 }}>
                    <View style={{ flex: 1 }}>
                        <ScrollView
                            contentContainerStyle={{ paddingBottom: 120 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.tasksCard}>
                                <Text style={styles.tasksCardTitle}>Tasks</Text>
                                <TaskList tasks={activeTasks} />
                            </View>
                        </ScrollView>

                        {/* FAB for adding tasks inside project */}
                        <AddTaskModal />
                    </View>


                    {/* FAB for adding tasks inside project */}
                    <AddTaskModal />
                </View>
            )}

            {/* CREATE PROJECT MODAL */}
            <Modal transparent visible={showCreateModal} animationType="fade">
                <View style={styles.modalOuter}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowCreateModal(false)}
                        activeOpacity={1}
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

            {/* EDIT PROJECT MODAL */}
            <Modal transparent visible={showEditModal} animationType="fade">
                <View style={styles.modalOuter}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={() => setShowEditModal(false)}
                        activeOpacity={1}
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
                                style={styles.cancelButton}
                                onPress={() => setShowEditModal(false)}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleEditSave}>
                                <Text style={styles.confirmText}>Save</Text>
                            </TouchableOpacity>
                        </View>
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
    secondaryButton: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: "#e5e7eb",
    },
    secondaryButtonText: {
        fontSize: 13,
        color: "#111",
        fontWeight: "500",
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
        width: "70%",        // << SHRINKS THE FOLDER VISUALLY
        height: 60,
        borderRadius: 18,
        marginBottom: 12,
        alignSelf: "center", // << centers the folder horizontally
        overflow: "hidden",
        justifyContent: "center",
        alignItems: "center",
    },

    detailFolderIcon: {
        width: 140,          // << larger but symmetrical
        height: 90,
        borderRadius: 22,
        marginBottom: 16,
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
        fontSize: 26,
    },

    detailFolderEmoji: {
        fontSize: 32,
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
    projectHeaderCard: {
        backgroundColor: "#fff",
        borderRadius: CARD_RADIUS,
        padding: 18,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 3,
    },
    detailProjectName: {
        fontSize: 20,
        fontWeight: "700",
    },
    detailProjectMeta: {
        fontSize: 13,
        color: "#666",
        marginTop: 4,
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
    modalCard: {
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 18,
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
    detailHeaderLeft: {
        justifyContent: "center",
    },
    detailHeaderButtonsRow: {
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
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
    },
    projectHeaderChipEmoji: {
        fontSize: 18,
        marginRight: 6,
    },
    projectHeaderChipText: {
        fontSize: 14,
        fontWeight: "600",
    },

});
