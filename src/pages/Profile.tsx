import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, User as UserIcon, Lock, ArrowLeft, Bell } from "lucide-react";
import SEO from "@/components/SEO";
import { MobileNav } from "@/components/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useShowStorage } from '@/hooks/useShowStorage';
import { Show } from "@/types/show";
import { useUpcomingShows } from "@/hooks/useUpcomingShows";
import { showBrowserNotification } from "@/services/browserNotification";
import { saveNotification } from "@/services/notificationDb";


const Profile = () => {
    const { user, updateProfile, updatePassword, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [activeTab, setActiveTabState] = useState('profile');

    const { upcomingShows } = useUpcomingShows();

    const setActiveTab = (tab: string) => {
        navigate(`/?tab=${tab}`);
    };
    const {
        watchlist,
        watching,
        watched,
    } = useShowStorage();



    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/auth");
        } else if (user) {
            setFullName(user.user_metadata?.full_name || "");
        }
    }, [user, authLoading, navigate]);


    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingProfile(true);
        const { error } = await updateProfile({ full_name: fullName });
        setIsUpdatingProfile(false);

        if (error) {
            toast({
                title: "Gagal memperbarui profile",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Profile diperbarui",
                description: "Informasi profile Anda telah berhasil diperbarui.",
            });
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({
                title: "Password tidak cocok",
                description: "Konfirmasi password harus sama dengan password baru.",
                variant: "destructive",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: "Password terlalu pendek",
                description: "Password minimal 6 karakter.",
                variant: "destructive",
            });
            return;
        }

        setIsUpdatingPassword(true);
        const { error } = await updatePassword(password);
        setIsUpdatingPassword(false);

        if (error) {
            toast({
                title: "Gagal memperbarui password",
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Password diperbarui",
                description: "Password Anda telah berhasil diperbarui.",
            });
            setPassword("");
            setConfirmPassword("");
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-background">
            <SEO title="Edit Profil" description="Atur profile WatchMe.log Anda." />

            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="container py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold text-gradient">Edit Profile</h1>
                </div>
            </header>

            <main className={`container py-8 max-w-2xl ${isMobile ? 'pb-24' : ''}`}>
                <div className="space-y-8">
                    {/* Profile Info Section */}
                    <Card className="glass-card border-none shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-primary" />
                                Informasi Dasar
                            </CardTitle>
                            <CardDescription>
                                Perbarui nama tampilan Anda.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpdateProfile}>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Nama Lengkap</Label>
                                        <Input
                                            id="fullName"
                                            placeholder="Masukkan nama lengkap"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="bg-secondary/50 border-white/10"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" className="w-full sm:w-auto ml-auto" disabled={isUpdatingProfile}>
                                    {isUpdatingProfile ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Simpan Perubahan"
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    {/* Password Section */}
                    <Card className="glass-card border-none shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Lock className="h-5 w-5 text-primary" />
                                Keamanan
                            </CardTitle>
                            <CardDescription>
                                Perbarui password akun Anda.
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpdatePassword}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password Baru</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Min. 6 karakter"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-secondary/50 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="Ulangi password baru"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="bg-secondary/50 border-white/10"
                                    />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button type="submit" variant="secondary" className="w-full sm:w-auto ml-auto" disabled={isUpdatingPassword}>
                                    {isUpdatingPassword ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Memperbarui...
                                        </>
                                    ) : (
                                        "Perbarui Password"
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </main>

            {isMobile && (
                <MobileNav
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    counts={{
                        watching: watching.length,
                        watchlist: watchlist.length,
                        upcoming: upcomingShows.length,
                        watched: watched.length
                    }}
                />
            )}
        </div>
    );
};

export default Profile;
