import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AddPlant from "./pages/AddPlant";
import RecycleBin from "./pages/RecycleBin";
import BuyerDashboard from "./pages/BuyerDashboard";
import HistoryPage from "./pages/History";
import SeedPassport from "./pages/SeedPassport";
import Install from "./pages/Install";
import Scanner from "./pages/Scanner";
import Tracking from "./pages/Tracking";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import Tutorial from "./pages/Tutorial";
import FAQ from "./pages/FAQ";

const queryClient = new QueryClient();

// ── Route Guards ────────────────────────────────────────

function ProtectedRoute({
  children,
  requireRole,
}: {
  children: React.ReactNode;
  requireRole?: "collector" | "buyer" | "admin";
}) {
  const { user, isLoading, isCollector, isBuyer, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (requireRole === "collector" && !isCollector && !isAdmin)
    return <Navigate to="/buyer" replace />;
  if (requireRole === "buyer" && !isBuyer && !isAdmin)
    return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/install" element={<Install />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/passport/:seedId" element={<SeedPassport />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/tutorial" element={<Tutorial />} />
              <Route path="/faq" element={<FAQ />} />

              {/* Collector routes */}
              <Route path="/dashboard" element={<ProtectedRoute requireRole="collector"><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/add" element={<ProtectedRoute requireRole="collector"><AddPlant /></ProtectedRoute>} />
              <Route path="/dashboard/bin" element={<ProtectedRoute requireRole="collector"><RecycleBin /></ProtectedRoute>} />
              <Route path="/dashboard/history" element={<ProtectedRoute requireRole="collector"><HistoryPage /></ProtectedRoute>} />
              <Route path="/dashboard/tracking" element={<ProtectedRoute requireRole="collector"><Tracking /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute requireRole="collector"><Settings /></ProtectedRoute>} />

              {/* Buyer routes */}
              <Route path="/buyer" element={<ProtectedRoute requireRole="buyer"><BuyerDashboard /></ProtectedRoute>} />
              <Route path="/buyer/tracking" element={<ProtectedRoute requireRole="buyer"><Tracking /></ProtectedRoute>} />
              <Route path="/buyer/settings" element={<ProtectedRoute requireRole="buyer"><Settings /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
