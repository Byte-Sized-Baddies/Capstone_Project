import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
} from "react";
import { supabase } from "../../lib/supabaseClient";

export type Project = {
    id: number;
    name: string;
    color: string; // hex
    icon: string;  // emoji or glyph
    createdAt: string;
};

type ProjectsContextType = {
    projects: Project[];
    activeProjectId: number | null; // null = show projects grid
    createProject: (name: string, color: string, icon: string) => Promise<boolean>;
    updateProject: (
        id: number,
        updates: { name?: string; color?: string; icon?: string }
    ) => void;
    setActiveProject: (id: number | null) => void;
    deleteProject: (id: number) => void;
};

const ProjectsContext = createContext<ProjectsContextType | undefined>(
    undefined
);

const DEFAULT_COLORS = ["#FACC15", "#4ADE80", "#60A5FA", "#FB7185", "#A855F7"];

export function ProjectsProvider({ children }: { children: ReactNode }) {
    const [projects, setProjects] = useState<Project[]>([]);

    // Start with grid view (no project selected)
    const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

    const createProject: ProjectsContextType["createProject"] = async (
        name,
        color,
        icon
    ) => {
        const trimmedName = name.trim();
        if (!trimmedName) return false;

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error("Unable to create folder: no authenticated user.", userError);
            return false;
        }

        const payload = {
            user_id: user.id,
            name: trimmedName,
            color,
        };

        let { data, error } = await supabase
            .from("folder")
            .insert(payload)
            .select("id, name, color, created_at")
            .single();

        if (error?.code === "42P01") {
            const fallbackResult = await supabase
                .from("folders")
                .insert(payload)
                .select("id, name, color, created_at")
                .single();

            data = fallbackResult.data;
            error = fallbackResult.error;
        }

        if (error || !data) {
            console.error("Failed to create folder in Supabase:", error);
            return false;
        }

        const project: Project = {
            id: data.id,
            name: data.name,
            color: data.color ?? color,
            icon,
            createdAt: data.created_at ?? new Date().toISOString(),
        };

        setProjects((prev) => [...prev, project]);
        setActiveProjectId(project.id);
        return true;
    };

    const updateProject = (
        id: number,
        updates: { name?: string; color?: string; icon?: string }
    ) => {
        setProjects((prev) =>
            prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
        );
    };

    const deleteProject = (id: number) => {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setActiveProjectId((current) => (current === id ? null : current));
    };

    const setActiveProject = (id: number | null) => {
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
