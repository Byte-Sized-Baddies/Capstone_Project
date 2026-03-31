import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./auth";

export type Project = {
    id: string;
    name: string;
    color: string;
    icon: string;
    createdAt: string;
};

type ProjectsContextType = {
    projects: Project[];
    activeProjectId: string | null;
    loading: boolean;
    createProject: (name: string, color: string, icon: string) => Promise<void>;
    updateProject: (id: string, updates: { name?: string; color?: string; icon?: string }) => Promise<void>;
    setActiveProject: (id: string | null) => void;
    deleteProject: (id: string) => Promise<void>;
};

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export function ProjectsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. Fetch Projects from Supabase
    const fetchProjects = useCallback(async () => {
        if (!user) {
            setProjects([]);
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching projects:", error.message);
        } else if (data) {
            // Map snake_case from DB to your camelCase type
            const mapped = data.map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                icon: p.icon,
                createdAt: p.created_at
            }));
            setProjects(mapped);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchProjects();

        const subscription = supabase
            .channel('public:projects')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
                fetchProjects(); // Refresh the list whenever a change happens
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [fetchProjects]);

    // 2. Create Project (Supabase)
    const createProject = async (name: string, color: string, icon: string) => {
        if (!user || !name.trim()) return;

        const { data, error } = await supabase
            .from('projects')
            .insert([{
                name: name.trim(),
                color: color || '#D1D5DB', // Use passed color or light gray
                icon: icon || 'folder',
                user_id: user.id
            }])
            .select();

        if (data && data.length > 0) {
            const p = data[0];
            const newProj: Project = {
                id: p.id,
                name: p.name,
                color: p.color,
                icon: p.icon,
                createdAt: p.created_at
            };
            setProjects((prev) => [...prev, newProj]);
            setActiveProjectId(newProj.id);
        }
    };

    // 3. Update Project (Supabase)
    const updateProject = async (id: string, updates: { name?: string; color?: string; icon?: string }) => {
        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error("Error updating project:", error.message);
        } else {
            setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
        }
    };

    // 4. Delete Project (Supabase)
    const deleteProject = async (id: string) => {
        const { error } = await supabase.from('projects').delete().eq('id', id);
        if (error) {
            console.error("Error deleting project:", error.message);
        } else {
            setProjects((prev) => prev.filter((p) => p.id !== id));
            setActiveProjectId((current) => (current === id ? null : current));
        }
    };

    const setActiveProject = (id: string | null) => setActiveProjectId(id);

    return (
        <ProjectsContext.Provider value={{
            projects,
            activeProjectId,
            loading,
            createProject,
            updateProject,
            setActiveProject,
            deleteProject,
        }}>
            {children}
        </ProjectsContext.Provider>
    );
}

export function useProjects() {
    const ctx = useContext(ProjectsContext);
    if (!ctx) throw new Error("useProjects must be used inside ProjectsProvider");
    return ctx;
}