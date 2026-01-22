import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ModeToggle } from '@/components/ModeToggle';
import SEO from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isValidSession, setIsValidSession] = useState(false);

    const { toast } = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        // Check if there's a valid recovery session
        const checkSession = async () => {
            const { data } = await supabase.auth.getSession();
            if (data.session) {
                setIsValidSession(true);
            } else {
                toast({
                    title: 'Link Tidak Valid',
                    description: 'Link reset password sudah kadaluarsa atau tidak valid',
                    variant: 'destructive',
                });
                setTimeout(() => navigate('/auth'), 2000);
            }
        };

        checkSession();
    }, [navigate, toast]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (password.length < 6) {
            setError('Password minimal 6 karakter');
            return;
        }

        if (password !== confirmPassword) {
            setError('Password tidak cocok');
            return;
        }

        setIsLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            toast({
                title: 'Berhasil',
                description: 'Password berhasil diubah. Silakan login dengan password baru',
            });

            setTimeout(() => navigate('/auth'), 2000);
        } catch (err) {
            const error = err as Error;
            toast({
                title: 'Gagal Reset Password',
                description: error.message || 'Terjadi kesalahan',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isValidSession) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <SEO
                    title="Reset Password"
                    description="Reset password akun WatchMe.log"
                />
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
            <SEO
                title="Reset Password"
                description="Reset password akun WatchMe.log"
            />
            <div className="absolute top-4 right-4">
                <ModeToggle />
            </div>
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <h1 className="text-2xl font-bold text-gradient">WatchMe.log</h1>
                    <p className="text-muted-foreground text-sm mt-2">
                        Reset Password
                    </p>
                </div>

                {/* Reset Password Card */}
                <div className="glass-card rounded-xl p-6">
                    <h2 className="text-xl font-semibold mb-2">Buat Password Baru</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                        Masukkan password baru untuk akun Anda
                    </p>

                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder="Password Baru (min 6 karakter)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 bg-secondary border-border"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="password"
                                    placeholder="Konfirmasi Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-10 bg-secondary border-border"
                                    disabled={isLoading}
                                    required
                                />
                            </div>
                            {error && (
                                <p className="text-xs text-destructive">{error}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Reset Password'
                            )}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/auth')}
                            className="w-full"
                            disabled={isLoading}
                        >
                            Kembali ke Login
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
