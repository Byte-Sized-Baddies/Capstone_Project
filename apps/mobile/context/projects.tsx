import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    useCallback,
} from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./auth";

export type ProjectRole = "owner" | "admin" | "member" | "viewer";

export type Project = {
    id: string;
    name: string;
    color: string;
    icon: string;
    createdAt: string;
    isOwner?: boolean;
    role?: ProjectRole;
};

export type FolderMember = {
    userId: string;
    email: string;
    fullName?: string | null;
    role: ProjectRole;
};

type ProjectsContextType = {
    projects: Project[];
    activeProjectId: string | null;
    loading: boolean;
    createProject: (name: string, color: string, icon: string) => Promise<void>;
    updateProject: (
        id: string,
        updates: { name?: string; color?: string; icon?: string }
    ) => Promise<void>;
    setActiveProject: (id: string | null) => void;
    deleteProject: (id: string) => Promise<void>;
    getFolderMembers: (folderId: string) => Promise<FolderMember[]>;
    shareProjectByEmail: (
        folderId: string,
        email: string,
        role?: ProjectRole
    ) => Promise<{ success: boolean; message?: string }>;
    removeFolderMember: (folderId: string, userId: string) => Promise<void>;
    updateFolderMemberRole: (
        folderId: string,
        userId: string,
        role: ProjectRole
    ) => Promise<void>;
};

const ProjectsContext = createContext<ProjectsContextType | undefined>(
    undefined
);

export function ProjectsProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProjects = useCallback(async () => {
        if (!user) {
            setProjects([]);
            setActiveProjectId(null);
            setLoading(false);
            return;
        }

        setLoading(true);

        const { data: ownedFolders, error: ownedError } = await supabase
            .from("folders")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true });

        if (ownedError) {
            console.error("Error fetching owned folders:", ownedError.message);
        }

        const { data: memberships, error: membershipsError } = await supabase
            .from("folder_members")
            .select("folder_id, role")
            .eq("user_id", user.id);

        if (membershipsError) {
            console.error("Error fetching folder memberships:", membershipsError.message);
        }

        const sharedFolderIds =
            memberships
                ?.map((m) => m.folder_id)
                .filter((id): id is number => typeof id === "number") ?? [];

        let sharedFolders: any[] = [];

        if (sharedFolderIds.length > 0) {
            const { data: sharedData, error: sharedError } = await supabase
                .from("folders")
                .select("*")
                .in("id", sharedFolderIds)
                .order("created_at", { ascending: true });

            if (sharedError) {
                console.error("Error fetching shared folders:", sharedError.message);
            } else {
                sharedFolders = sharedData ?? [];
            }
        }

        const membershipRoleMap = new Map<number, ProjectRole>();
        for (const membership of memberships ?? []) {
            membershipRoleMap.set(membership.folder_id, membership.role as ProjectRole);
        }

        const ownedMapped: Project[] = (ownedFolders ?? []).map((folder) => ({
            id: String(folder.id),
            name: folder.name,
            color: folder.color || "#D1D5DB",
            icon: folder.icon || "folder",
            createdAt: folder.created_at,
            isOwner: true,
            role: "owner",
        }));
        const ownedIdSet = new Set(ownedMapped.map((p) => p.id));

        const sharedMapped: Project[] = sharedFolders
            .filter((folder) => !ownedIdSet.has(String(folder.id)))
            .map((folder) => ({
                id: String(folder.id),
                name: folder.name,
                color: folder.color || "#D1D5DB",
                icon: folder.icon || "folder",
                createdAt: folder.created_at,
                isOwner: false,
                role: membershipRoleMap.get(folder.id) ?? "viewer",
            }));

        const combined = [...ownedMapped, ...sharedMapped];
        setProjects(combined);

        setActiveProjectId((current) => {
            if (!current) return current;
            return combined.some((p) => p.id === current) ? current : null;
        });

        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchProjects();

        const foldersChannel = supabase
            .channel("folders-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "folders" },
                fetchProjects
            )
            .subscribe();

        const membersChannel = supabase
            .channel("folder-members-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "folder_members" },
                fetchProjects
            )
            .subscribe();

        return () => {
            supabase.removeChannel(foldersChannel);
            supabase.removeChannel(membersChannel);
        };
    }, [fetchProjects]);

    const createProject = async (name: string, color: string, icon: string) => {
        if (!user || !name.trim()) return;

        const { data, error } = await supabase
            .from("folders")
            .insert([
                {
                    name: name.trim(),
                    color: color || "#D1D5DB",
                    icon: icon || "folder",
                    user_id: user.id,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error("Error creating folder/project:", error.message);
            return;
        }

        const newProj: Project = {
            id: String(data.id),
            name: data.name,
            color: data.color || "#D1D5DB",
            icon: data.icon || "folder",
            createdAt: data.created_at,
            isOwner: true,
            role: "owner",
        };

        setProjects((prev) => [...prev, newProj]);
        setActiveProjectId(newProj.id);
    };

    const updateProject = async (
        id: string,
        updates: { name?: string; color?: string; icon?: string }
    ) => {
        const folderUpdates: { name?: string; color?: string; icon?: string } = {};

        if (updates.name !== undefined) folderUpdates.name = updates.name;
        if (updates.color !== undefined) folderUpdates.color = updates.color;
        if (updates.icon !== undefined) folderUpdates.icon = updates.icon;

        const { error } = await supabase
            .from("folders")
            .update(folderUpdates)
            .eq("id", Number(id));

        if (error) {
            console.error("Error updating folder/project:", error.message);
            return;
        }

        setProjects((prev) =>
            prev.map((p) =>
                p.id === id
                    ? {
                        ...p,
                        ...updates,
                        icon: updates.icon ?? p.icon,
                    }
                    : p
            )
        );
    };

    const getFolderMembers = async (folderId: string): Promise<FolderMember[]> => {
        const { data, error } = await supabase
            .from("folder_members")
            .select("user_id, role")
            .eq("folder_id", Number(folderId));
        if (error) {
            console.error("Error fetching folder members:", error.message);
            return [];
        }

        const userIds = (data ?? []).map((m) => m.user_id);
        if (userIds.length === 0) return [];

        const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", userIds);

        if (profilesError) {
            console.error("Error fetching member profiles:", profilesError.message);
            return [];
        }

        const profileMap = new Map(
            (profilesData ?? []).map((p) => [p.id, p])
        );

        return (data ?? []).map((member) => {
            const profile = profileMap.get(member.user_id);
            return {
                userId: member.user_id,
                email: profile?.email ?? "",
                fullName: profile?.full_name ?? null,
                role: member.role as ProjectRole,
            };
        });
    };

    const shareProjectByEmail = async (
        folderId: string,
        email: string,
        role: ProjectRole = "member"
    ): Promise<{ success: boolean; message?: string }> => {
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            return { success: false, message: "Email is required." };
        }

        const folder = projects.find((p) => p.id === folderId);
        if (!folder?.isOwner) {
            return { success: false, message: "Only the owner can share this folder." };
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .eq("email", normalizedEmail)
            .maybeSingle();

        if (profileError) {
            console.error("Error looking up profile by email:", profileError.message);
            return { success: false, message: "Could not look up that email." };
        }

        if (!profile) {
            return { success: false, message: "No existing user with that email was found." };
        }

        if (user && profile.id === user.id) {
            return { success: false, message: "You already own this folder." };
        }

        const { error } = await supabase
            .from("folder_members")
            .insert(
                [
                    {
                        folder_id: Number(folderId),
                        user_id: profile.id,
                        role,
                    },
                ],
                { onConflict: "folder_id,user_id" }
            );

        if (error) {
            console.error("Error sharing folder:", error.message);
            return { success: false, message: error.message };
        }

        await fetchProjects();
        return { success: true };
    };

    const removeFolderMember = async (folderId: string, userId: string) => {
        const { error } = await supabase
            .from("folder_members")
            .delete()
            .eq("folder_id", Number(folderId))
            .eq("user_id", userId);

        if (error) {
            console.error("Error removing folder member:", error.message);
            return;
        }

        await fetchProjects();
    };

    const updateFolderMemberRole = async (
        folderId: string,
        userId: string,
        role: ProjectRole
    ) => {
        const { error } = await supabase
            .from("folder_members")
            .update({ role })
            .eq("folder_id", Number(folderId))
            .eq("user_id", userId);

        if (error) {
            console.error("Error updating folder member role:", error.message);
            return;
        }

        await fetchProjects();
    };

    const deleteProject = async (id: string) => {
        const { error } = await supabase
            .from("folders")
            .delete()
            .eq("id", Number(id));

        if (error) {
            console.error("Error deleting folder/project:", error.message);
            return;
        }

        setProjects((prev) => prev.filter((p) => p.id !== id));
        setActiveProjectId((current) => (current === id ? null : current));
    };

    const setActiveProject = (id: string | null) => setActiveProjectId(id);

    return (
        <ProjectsContext.Provider
            value={{
                projects,
                activeProjectId,
                loading,
                createProject,
                updateProject,
                setActiveProject,
                deleteProject,
                getFolderMembers,
                shareProjectByEmail,
                removeFolderMember,
                updateFolderMemberRole
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