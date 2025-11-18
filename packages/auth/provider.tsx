// packages/auth/provider.tsx
import React, {
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react';
import { Session, createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- CONFIGURE THIS ---
// You should get these from your Supabase project dashboard
// and put them in a .env file (e.g., process.env.EXPO_PUBLIC_SUPABASE_URL)
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// 1. Initialize the client
// We tell Supabase to use AsyncStorage for persistence
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// 2. Define the context shape
interface AuthContextType {
    session: Session | null;
    user: any | null; // You can type this better
    loading: boolean;
    signInWithEmail: (email, password) => Promise<any>;
    signUpWithEmail: (email, password) => Promise<any>;
    signOut: () => Promise<void>;
}

// 3. Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 4. Create the provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get the initial session
        supabase.auth
            .getSession()
            .then(({ data: { session } }) => {
                setSession(session);
                setLoading(false);
            })
            .catch(() => setLoading(false));

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
            }
        );

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    // Helper functions
    const signInWithEmail = async (email, password) => {
        return supabase.auth.signInWithPassword({ email, password });
    };

    const signUpWithEmail = async (email, password) => {
        return supabase.auth.signUp({ email, password });
        // Add logic to handle email confirmation if enabled
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        session,
        user: session?.user ?? null,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 5. Create the custom hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}