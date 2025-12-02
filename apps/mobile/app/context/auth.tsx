// apps/mobile/app/context/auth.tsx
import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
} from "react";

export type User = {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
    createdAt: string;
};

type AuthContextType = {
    user: User | null;
    loading: boolean;
    signUp: (data: { name: string; email: string; password: string }) => Promise<void>;
    login: (data: { email: string; password: string }) => Promise<void>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AVATAR_COLORS = ["#6366F1", "#EC4899", "#F59E0B", "#10B981", "#3B82F6"];

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    const signUp: AuthContextType["signUp"] = async ({ name, email }) => {
        setLoading(true);
        try {
            // 🔒 in a real app, call Supabase / backend here
            const color =
                AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
            const newUser: User = {
                id: Math.random().toString(36).slice(2),
                name: name.trim(),
                email: email.toLowerCase(),
                avatarColor: color,
                createdAt: new Date().toISOString(),
            };
            setUser(newUser);
        } finally {
            setLoading(false);
        }
    };

    const login: AuthContextType["login"] = async ({ email }) => {
        setLoading(true);
        try {
            // 🔒 real app = check credentials with backend
            // For now we just "fake login" with minimal data so UI works
            setUser((prev) => {
                if (prev && prev.email === email.toLowerCase()) return prev;
                return {
                    id: Math.random().toString(36).slice(2),
                    name: prev?.name ?? "Do Bee User",
                    email: email.toLowerCase(),
                    avatarColor: prev?.avatarColor ?? AVATAR_COLORS[0],
                    createdAt: prev?.createdAt ?? new Date().toISOString(),
                };
            });
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signUp, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
