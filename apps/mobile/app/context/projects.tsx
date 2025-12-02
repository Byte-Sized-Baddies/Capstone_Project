import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
} from "react";

export type Project = {
    id: string;
    name: string;
    color: string; // hex
    icon: string;  // emoji or glyph
    createdAt: string;
};

type ProjectsContextType = {
    projects: Project[];
    activeProjectId: string | null; // null = show projects grid
    createProject: (name: string, color: string, icon: string) => void;
    updateProject: (
        id: string,
        updates: { name?: string; color?: string; icon?: string }
    ) => void;
    setActiveProject: (id: string | null) => void;
    deleteProject: (id: string) => void;
};

const ProjectsContext = createContext<ProjectsContextType | undefined>(
    undefined
);

const DEFAULT_COLORS = ["#FACC15", "#4ADE80", "#60A5FA", "#FB7185", "#A855F7"];

export function ProjectsProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([
        {
            id: "inbox",
            name: "Inbox",
            color: DEFAULT_COLORS[0],
            icon: "📥",
            createdAt: new Date().toISOString(),
        },
        {
            id: "school",
            name: "School",
            color: DEFAULT_COLORS[2],
            icon: "📚",
            createdAt: new Date().toISOString(),
        },
    ]);

    // Start with grid view (no project selected)
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

    const createProject = (name: string, color: string, icon: string) => {
        if (!name.trim()) return;

        const id = `${name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`;

        const project: Project = {
            id,
            name: name.trim(),
            color,
            icon,
            createdAt: new Date().toISOString(),
        };

        setProjects((prev) => [...prev, project]);
        setActiveProjectId(project.id); // jump into new project view
    };

    const updateProject = (
        id: string,
        updates: { name?: string; color?: string; icon?: string }
    ) => {
        setProjects((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
        );
    };

    const deleteProject = (id: string) => {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setActiveProjectId((current) => (current === id ? null : current));
    };

    const setActiveProject = (id: string | null) => {
        setActiveProjectId(id);
    };

    return (
        <ProjectsContext.Provider
            value={{
                projects,
                activeProjectId,
                createProject,
                updateProject,
                setActiveProject,
                deleteProject,
            }}
        >
            {children}
        </ProjectsContext.Provider>
    );
}

export function useProjects() {
    const ctx = useContext(ProjectsContext);
    if (!ctx) throw new Error("useProjects must be used inside ProjectsProvider");
    return ctx;
}
