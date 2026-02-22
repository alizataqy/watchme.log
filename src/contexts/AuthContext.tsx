import { createContext } from 'react';
import { User, Session } from '@supabase/supabase-js';

export interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    updateProfile: (data: { full_name?: string; avatar_url?: string; has_onboarded?: boolean }) => Promise<{ error: Error | null }>;
    updatePassword: (password: string) => Promise<{ error: Error | null }>;
    updateEmail: (email: string) => Promise<{ error: Error | null }>;
    uploadAvatar: (file: File) => Promise<{ url: string | null; error: Error | null }>;
    signInWithOAuth: (provider: 'google') => Promise<{ error: Error | null }>;
    resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
