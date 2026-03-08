import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/useProfile";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DiscoverPage from "./pages/DiscoverPage";
import MatchesPage from "./pages/MatchesPage";
import ChatsPage from "./pages/ChatsPage";
import ChatConversationPage from "./pages/ChatConversationPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import SettingsPage from "./pages/SettingsPage";
import VerifyProfilePage from "./pages/VerifyProfilePage";
import ViewProfilePage from "./pages/ViewProfilePage";
import FriendRequestsPage from "./pages/FriendRequestsPage";
import TermsPage from "./pages/TermsPage";
import SearchPage from "./pages/SearchPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import WalletPage from "./pages/WalletPage";
import NotificationsPage from "./pages/NotificationsPage";
import MyGalleryPage from "./pages/MyGalleryPage";
import UserGalleryPage from "./pages/UserGalleryPage";
import NotFound from "./pages/NotFound";
import { Sparkles } from "lucide-react";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  useOnlineStatus();

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  if (user && profile && !profile.profile_complete) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/discover" replace />} />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/matches" element={<MatchesPage />} />
      <Route path="/chats" element={<ChatsPage />} />
      <Route path="/chat/:userId" element={<ChatConversationPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/edit-profile" element={<EditProfilePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/verify" element={<VerifyProfilePage />} />
      <Route path="/user/:userId" element={<ViewProfilePage />} />
      <Route path="/friend-requests" element={<FriendRequestsPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/wallet" element={<WalletPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="/my-gallery" element={<MyGalleryPage />} />
      <Route path="/gallery/:userId" element={<UserGalleryPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="max-w-lg mx-auto min-h-screen relative">
              <AppRoutes />
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
