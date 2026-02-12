// apps/mobile/app/context/auth.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient"; // Ensure this path is correct
import { Session, User as SupabaseUser } from "@supabase/supabase-js";

export type User = {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
};

type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (data: { name: string; email: string; password: string }) => Promise<void>;
    login: (data: { email: string; password: string }) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Check for active sessions on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) {
                mapSupabaseUserToLocal(session.user);
            }
            setLoading(false);
        });

        // 2. Listen for auth state changes (login, logout, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) {
                mapSupabaseUserToLocal(session.user);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const mapSupabaseUserToLocal = (supabaseUser: SupabaseUser) => {
        setUser({
            id: supabaseUser.id,
            email: supabaseUser.email || "",
            // We use user_metadata to store the name we gathered at sign-up
            name: supabaseUser.user_metadata?.full_name || "Do Bee User",
            avatarColor: "#6366F1",
        });
    };

    const signUp: AuthContextType["signUp"] = async ({ name, email, password }) => {
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name }, // Stores name in Supabase auth metadata
            },
        });
        if (error) {
            setLoading(false);
            throw error;
        }
    };

    const login: AuthContextType["login"] = async ({ email, password }) => {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            setLoading(false);
            throw error;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, signUp, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}