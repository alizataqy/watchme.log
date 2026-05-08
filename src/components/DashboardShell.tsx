"use client";

import { ReactNode, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Clock, Eye, Search as SearchIcon, CheckCircle, Calendar, Bell } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';
import { useShowStorage } from '@/hooks/useShowStorage';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from "@/contexts/LanguageContext/LanguageContext";
import { useUpcomingShows } from '@/hooks/useUpcomingShows';
import SEO from '@/components/SEO';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Onboarding } from "@/components/Onboarding";
import { useAuth } from '@/hooks/useAuth';

interface DashboardShellProps {
  children: ReactNode;
  activeTab: 'search' | 'watching' | 'watched' | 'watchlist' | 'upcoming';
  headerProps?: any;
}

export function DashboardShell({ 
  children, 
  activeTab, 
  headerProps = {},
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const { watching, watchlist, watched, shows, isLoading } = useShowStorage();
  const { upcomingShows } = useUpcomingShows();
  const { user, isLoading: authLoading } = useAuth();
  
  const [showDesktopModal, setShowDesktopModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (user && !authLoading && !isMobile) {
      const hasShownModal = sessionStorage.getItem('desktop-experience-modal-shown');
      if (!hasShownModal) {
        setShowDesktopModal(true);
      }
    }

    if (user && !authLoading && !isLoading) {
      const hasOnboarded = user.user_metadata?.has_onboarded || localStorage.getItem('has_onboarded') === 'true';
      if (!hasOnboarded && shows.length === 0) {
        setShowOnboarding(true);
      }
    }
  }, [user, authLoading, isMobile, isLoading, shows.length]);

  const setActiveTab = (tab: string) => {
    if (tab === 'search') {
      router.push('/search/all');
    } else {
      router.push(tab === 'watching' ? '/watching' : `/${tab}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={t('nav.' + activeTab)}
        description={t('index.description')}
      />
      
      <Header
        activeTab={activeTab}
        isLocalTab={activeTab !== 'search'}
        {...headerProps}
      />

      <main className={`container py-4 ${(mounted && isMobile) ? 'pb-20' : ''}`}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {(mounted && isMobile) ? (
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
          ) : (
            <TabsList className="w-full grid grid-cols-5 mb-8">
              <TabsTrigger value="search" className="flex items-center gap-1.5">
                <SearchIcon className="h-4 w-4" />
                <span>{t('nav.search')}</span>
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{t('nav.watchlist')}</span>
                {watchlist.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {watchlist.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="watching" className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span>{t('nav.watching')}</span>
                {watching.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {watching.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{t('nav.upcoming')}</span>
                {upcomingShows.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {upcomingShows.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="watched" className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                <span>{t('nav.watched')}</span>
                {watched.length > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-1.5 rounded-full">
                    {watched.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          )}

          <div className="mt-0 animate-in fade-in duration-500">
            {children}
          </div>
        </Tabs>

        {/* Modals */}
        {!isMobile && (
          <Dialog open={showDesktopModal} onOpenChange={(open) => {
            setShowDesktopModal(open);
            if (!open) sessionStorage.setItem('desktop-experience-modal-shown', 'true');
          }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="mt-1 flex w-full mx-auto justify-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Notification
                  </div>
                </DialogTitle>
                <DialogDescription className="pt-2 text-base">
                  You'll get a <span className="text-primary font-bold italic"> better experience</span> if you open this app on your <span className="font-semibold text-foreground">mobile phone</span>.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button className="w-full" onClick={() => {
                  setShowDesktopModal(false);
                  sessionStorage.setItem('desktop-experience-modal-shown', 'true');
                }}>
                  Lanjutkan di Desktop
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        <Onboarding open={showOnboarding} onOpenChange={setShowOnboarding} />
      </main>
    </div>
  );
}
