import { useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from './AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const queryClient = useQueryClient();

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setIsLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string) => {
        const redirectUrl = `${window.location.origin}/?tab=watching`;
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: redirectUrl,
            },
        });
        return { error };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        // Optional: clear session storage as well
        sessionStorage.clear();
        queryClient.clear();
    };

    const updateProfile = async (data: { full_name?: string; avatar_url?: string; has_onboarded?: boolean }) => {
        const { error } = await supabase.auth.updateUser({
            data: data
        });
        return { error };
    };

    const updateEmail = async (email: string) => {
        const { error } = await supabase.auth.updateUser({
            email: email
        });
        return { error };
    };

    const updatePassword = async (password: string) => {
        const { error } = await supabase.auth.updateUser({
            password: password
        });
        return { error };
    };

    const uploadAvatar = async (file: File) => {
        try {
            if (!user) throw new Error('User not authenticated');

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            return { url: publicUrl, error: null };
        } catch (error) {
            return { url: null, error: error as Error };
        }
    };

    const signInWithOAuth = async (provider: 'google') => {
        const siteUrl = window.location.origin.endsWith('/?tab=watching')
            ? window.location.origin
            : `${window.location.origin}/?tab=watching`;

        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: siteUrl,
            },
        });
        return { error };
    };

    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        return { error };
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signUp, signIn, signOut, updateEmail, updateProfile, updatePassword, uploadAvatar, signInWithOAuth, resetPassword }}>
            {children}
        </AuthContext.Provider>
    );
}
