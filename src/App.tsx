import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Detail from "./pages/Detail";
import Profile from "./pages/Profile";
import Genre from "./pages/Genre";
import NotFound from "./pages/NotFound";

import { ThemeProvider } from "@/components/theme-provider";
import { ShowProvider } from "@/contexts/ShowContext";

const queryClient = new QueryClient();

// Component wrapper untuk initialize notifications di background
const AppContent = () => {
  // Initialize notification system (push notifications only, no UI)
  useNotifications();

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/search" element={<Index />} />
          <Route path="/watchlist" element={<Index />} />
          <Route path="/watching" element={<Index />} />
          <Route path="/upcoming" element={<Index />} />
          <Route path="/watched" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/genre" element={<Genre />} />
          <Route path="/show/:id" element={<Detail />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider>
        <ShowProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </ShowProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
