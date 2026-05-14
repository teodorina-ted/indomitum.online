import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import BuyerOrders from "./pages/BuyerOrders";
import BuyerBin from "./pages/BuyerBin";
import CollectorOrders from "./pages/CollectorOrders";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/install" element={<Install />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/add" element={<AddPlant />} />
              <Route path="/dashboard/bin" element={<RecycleBin />} />
              <Route path="/dashboard/history" element={<HistoryPage />} />
              <Route path="/dashboard/tracking" element={<Tracking />} />
              <Route path="/dashboard/settings" element={<Settings />} />
              <Route path="/dashboard/orders" element={<CollectorOrders />} />
              <Route path="/buyer" element={<BuyerDashboard />} />
              <Route path="/buyer/tracking" element={<Tracking />} />
              <Route path="/buyer/settings" element={<Settings />} />
              <Route path="/passport/:seedId" element={<SeedPassport />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/cookies" element={<CookiePolicy />} />
              <Route path="/tutorial" element={<Tutorial />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/buyer/orders" element={<BuyerOrders />} />
              <Route path="/buyer/bin" element={<BuyerBin />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
