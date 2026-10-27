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
import { Loader2, User as UserIcon, Lock, ArrowLeft, Mail, Copy, Check, Tv, ExternalLink, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";
import { MobileNav } from "@/components/MobileNav";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useShowStorage } from '@/hooks/useShowStorage';
import { Show } from "@/types/show";
import { useUpcomingShows } from "@/hooks/useUpcomingShows";
import { showBrowserNotification } from "@/services/browserNotification";
import { saveNotification } from "@/services/notificationDb";
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";
import { supabase } from "@/integrations/supabase/client";


const Profile = () => {
    const { user, updateProfile, updatePassword, updateEmail, isLoading: authLoading } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const { t } = useLanguage();

    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [oldPassword, setOldPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [copiedUserId, setCopiedUserId] = useState(false);
    const [syncToken, setSyncToken] = useState("");
    const [activeTab, setActiveTabState] = useState('profile');

    const SYNC_SECRET = 'wml_secure_sync_vault_2026';

    const generateSecureSyncToken = async (payload: { at: string; rt: string; u: string }): Promise<string> => {
        try {
            const enc = new TextEncoder();
            const keyMaterial = await crypto.subtle.digest('SHA-256', enc.encode(SYNC_SECRET));
            const key = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['encrypt']);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const data = enc.encode(JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 3600 * 1000 }));
            const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), iv.length);

            let binary = '';
            for (let i = 0; i < combined.length; i++) {
                binary += String.fromCharCode(combined[i]);
            }
            return `wml_sec_${btoa(binary)}`;
        } catch (err) {
            console.error('Failed to encrypt sync token:', err);
            return '';
        }
    };

    useEffect(() => {
        if (user) {
            supabase.auth.getSession().then(async ({ data }) => {
                if (data.session) {
                    const token = await generateSecureSyncToken({
                        at: data.session.access_token,
                        rt: data.session.refresh_token,
                        u: user.id
                    });
                    setSyncToken(token);
                }
            });
        }
    }, [user]);

    const handleCopySyncToken = async () => {
        const { data } = await supabase.auth.getSession();
        let token = syncToken;
        if (data.session) {
            token = await generateSecureSyncToken({
                at: data.session.access_token,
                rt: data.session.refresh_token,
                u: user.id
            });
            setSyncToken(token);
        }
        if (!token) return;
        navigator.clipboard.writeText(token);
        setCopiedUserId(true);
        toast({
            title: t('profile.userIdCopied'),
            description: t('profile.userIdCopiedDesc'),
        });
        setTimeout(() => setCopiedUserId(false), 2500);
    };

    const { upcomingShows } = useUpcomingShows();

    const setActiveTab = (tab: string) => {
        navigate(tab === 'watching' ? '/' : `/${tab}`);
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
                title: t('profile.toast.updateError'),
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: t('profile.toast.updateSuccess'),
                description: t('profile.toast.updateSuccessDesc'),
            });
        }
    };


    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({
                title: t('profile.toast.passwordMismatch'),
                description: t('profile.toast.passwordMismatchDesc'),
                variant: "destructive",
            });
            return;
        }

        if (password.length < 6) {
            toast({
                title: t('profile.toast.passwordShort'),
                description: t('profile.toast.passwordShortDesc'),
                variant: "destructive",
            });
            return;
        }

        setIsUpdatingPassword(true);
        const { error } = await updatePassword(password);
        setIsUpdatingPassword(false);

        if (error) {
            toast({
                title: t('profile.toast.passwordError'),
                description: error.message,
                variant: "destructive",
            });
        } else {
            toast({
                title: t('profile.toast.passwordSuccess'),
                description: t('profile.toast.passwordSuccessDesc'),
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
            <SEO title={t('profile.title')} description="Atur profile WatchMe.log Anda." />

            <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
                <div className="container py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-bold text-gradient">{t('profile.header')}</h1>
                </div>
            </header>

            <main className={`container py-8 max-w-2xl ${isMobile ? 'pb-24' : ''}`}>
                <div className="space-y-8">
                    {/* Profile Info Section */}
                    <Card className="glass-card border-none shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <UserIcon className="h-5 w-5 text-primary" />
                                {t('profile.basicInfo')}
                            </CardTitle>
                            <CardDescription>
                                {t('profile.basicInfoDesc')}
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpdateProfile}>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">{t('profile.fullName')}</Label>
                                        <Input
                                            id="fullName"
                                            placeholder={t('profile.fullNamePlaceholder')}
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
                                            {t('profile.saving')}
                                        </>
                                    ) : (
                                        t('profile.save')
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    {/* Netflix Extension Auto-Sync Section */}
                    <Card className="glass-card border-none shadow-xl relative overflow-hidden bg-gradient-to-br from-purple-950/20 via-background to-pink-950/20 border border-purple-500/20">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Tv className="h-5 w-5 text-primary" />
                                    <span>{t('profile.syncSection')}</span>
                                </div>
                                <span className="text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-1 font-semibold">
                                    <Sparkles className="w-3 h-3" /> Auto Scrobbler
                                </span>
                            </CardTitle>
                            <CardDescription>
                                {t('profile.syncSectionDesc')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="userIdSync">{t('profile.userIdLabel')}</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="userIdSync"
                                        type="password"
                                        value={syncToken || user.id}
                                        readOnly
                                        className="font-mono text-xs bg-secondary/50 border-white/10 tracking-widest"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCopySyncToken}
                                        className="gap-2 shrink-0 border-primary/30 hover:bg-primary/10"
                                    >
                                        {copiedUserId ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                        <span className="hidden sm:inline">{t('profile.copySyncKey')}</span>
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="rounded-lg bg-black/20 p-3.5 border border-white/5 space-y-2 text-xs text-muted-foreground">
                                <p className="font-semibold text-foreground flex items-center gap-1.5">
                                    <span>💡</span> {t('profile.extensionGuide')}
                                </p>
                                <ol className="list-decimal list-inside space-y-1 pl-1">
                                    <li>Pasang ekstensi <b>WatchMe.log Scrobbler</b> di browser Anda (Chrome / Brave / Edge).</li>
                                    <li>Buka popup ekstensi lalu tempel <b>User ID</b> di atas.</li>
                                    <li>Tonton film/series di platform streaming favoritmu (Netflix, Disney+, Prime Video, Crunchyroll, Bstation, Vidio, Viu, YouTube, dll.) — status episode otomatis tercatat di WatchMe.log saat progres tontonan mencapai batas durasi (default 80%)!</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Email Section */}
                    <Card className="glass-card border-none shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Mail className="h-5 w-5 text-primary" />
                                {t('profile.email')}
                            </CardTitle>
                            <CardDescription>
                                {t('profile.emailDesc')}
                            </CardDescription>
                        </CardHeader>
                        <form>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">{t('profile.email')}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={t('profile.emailPlaceholder')}
                                        value={user.email}
                                        className="bg-secondary/50 border-white/10"
                                        disabled
                                    />
                                </div>
                            </CardContent>
                        </form>
                    </Card>

                    {/* Password Section */}
                    <Card className="glass-card border-none shadow-xl">
                        <CardHeader>
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Lock className="h-5 w-5 text-primary" />
                                {t('profile.security')}
                            </CardTitle>
                            <CardDescription>
                                {t('profile.securityDesc')}
                            </CardDescription>
                        </CardHeader>
                        <form onSubmit={handleUpdatePassword}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="password">{t('profile.newPassword')}</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder={t('profile.newPasswordPlaceholder')}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="bg-secondary/50 border-white/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">{t('profile.confirmPassword')}</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder={t('profile.confirmPasswordPlaceholder')}
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
                                            {t('profile.updating')}
                                        </>
                                    ) : (
                                        t('profile.updatePassword')
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
