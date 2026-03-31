import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
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
    const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

    const loadProjects = useCallback(async () => {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return;
        const { data, error: fetchError } = await supabase
            .from("folders")
            .select("id, name, color, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
        if (fetchError || !data) return;
        setProjects(data.map(row => ({
            id: row.id,
            name: row.name,
            color: row.color ?? DEFAULT_COLORS[0],
            icon: "📁",
            createdAt: row.created_at ?? new Date().toISOString(),
        })));
    }, []);

    useEffect(() => {
        let channel: ReturnType<typeof supabase.channel>;
        loadProjects().then(() => {
            supabase.auth.getUser().then(({ data }) => {
                const user = data?.user;
                if (!user) return;
                channel = supabase.channel("mobile-folders-realtime")
                    .on("postgres_changes", { event: "*", schema: "public", table: "folders", filter: `user_id=eq.${user.id}` }, () => loadProjects())
                    .subscribe();
            });
        });
        return () => { if (channel) supabase.removeChannel(channel); };
    }, [loadProjects]);

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

        const { data, error } = await supabase
            .from("folders")
            .insert(payload)
            .select("id, name, color, created_at")
            .single();

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
        setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
        const dbUpdates: Record<string, string> = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.color) dbUpdates.color = updates.color;
        if (Object.keys(dbUpdates).length > 0) {
            supabase.from("folders").update(dbUpdates).eq("id", id).then(({ error }) => {
                if (error) console.error("Failed to update folder:", error);
            });
        }
    };

    const deleteProject = (id: number) => {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setActiveProjectId((current) => (current === id ? null : current));
        supabase.from("folders").delete().eq("id", id).then(({ error }) => {
            if (error) console.error("Failed to delete folder:", error);
        });
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
