import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Leaf, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

type UserRole = "collector" | "buyer";
type ViewMode = "login" | "signup" | "forgot" | "reset";

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user, isLoading: authLoading, isCollector } = useAuth();
  
  const initialRole = (searchParams.get("role") as UserRole) || "collector";
  const resetToken = searchParams.get("type") === "recovery";
  
  const [role, setRole] = useState<UserRole>(initialRole);
  const [viewMode, setViewMode] = useState<ViewMode>(resetToken ? "reset" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: ""
  });

  // Redirect if already logged in - route based on role
  useEffect(() => {
    if (user && !authLoading) {
      if (isCollector) {
        navigate("/dashboard");
      } else {
        navigate("/buyer");
      }
    }
  }, [user, authLoading, isCollector, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await api.resetPassword(formData.email);

      if (error) {
        toast.error(error);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setViewMode("login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await api.updatePassword(formData.password);

      if (error) {
        toast.error(error);
      } else {
        toast.success("Password updated successfully!");
        setViewMode("login");
        navigate("/login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (viewMode === "signup" && formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (viewMode === "signup" && formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      if (viewMode === "signup") {
        const { error } = await signUp(
          formData.email,
          formData.password,
          formData.name,
          role
        );
        
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Account created! Welcome to Indomitum.");
          localStorage.setItem("indomitum_new_user", "true");
          navigate(role === "collector" ? "/dashboard" : "/buyer");
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);
        
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Welcome back!");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12">
        <div className="max-w-md w-full mx-auto">
          {/* Back Link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">Indomitum</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {viewMode === "signup" && "Create your account"}
            {viewMode === "login" && "Welcome back"}
            {viewMode === "forgot" && "Reset your password"}
            {viewMode === "reset" && "Set new password"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {viewMode === "signup" && "Start managing your seed collection today"}
            {viewMode === "login" && "Sign in to access your dashboard"}
            {viewMode === "forgot" && "Enter your email and we'll send you a reset link"}
            {viewMode === "reset" && "Enter your new password below"}
          </p>

          {/* Role Toggle - Only show for login/signup */}
          {(viewMode === "login" || viewMode === "signup") && (
            <div className="flex p-1 bg-muted rounded-lg mb-8">
              <button
                type="button"
                onClick={() => setRole("collector")}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  role === "collector"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Collector
              </button>
              <button
                type="button"
                onClick={() => setRole("buyer")}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  role === "buyer"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Buyer
              </button>
            </div>
          )}

          {/* Forgot Password Form */}
          {viewMode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              <button
                type="button"
                onClick={() => setViewMode("login")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            </form>
          )}

          {/* Reset Password Form */}
          {viewMode === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          )}

          {/* Login/Signup Form */}
          {(viewMode === "login" || viewMode === "signup") && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {viewMode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Name
                  </label>
                  <Input
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {viewMode === "signup" && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              )}

              {/* Remember Me & Forgot Password - Login only */}
              {viewMode === "login" && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <label 
                      htmlFor="remember" 
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      Keep me signed in
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode("forgot")}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {viewMode === "signup" ? "Creating Account..." : "Signing In..."}
                  </>
                ) : (
                  viewMode === "signup" ? "Create Account" : "Sign In"
                )}
              </Button>
            </form>
          )}

          {/* Toggle - Only show for login/signup */}
          {(viewMode === "login" || viewMode === "signup") && (
            <p className="mt-8 text-center text-muted-foreground">
              {viewMode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => setViewMode(viewMode === "signup" ? "login" : "signup")}
                className="text-primary font-medium hover:underline"
              >
                {viewMode === "signup" ? "Sign in" : "Sign up"}
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary/80" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 border border-primary-foreground/20 rounded-full" />
          <div className="absolute bottom-20 right-20 w-64 h-64 border border-primary-foreground/20 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-primary-foreground/10 rounded-full" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center px-12 text-center h-full">
          <div className="w-20 h-20 rounded-2xl bg-primary-foreground/10 backdrop-blur flex items-center justify-center mb-8">
            <Leaf className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            {role === "collector" 
              ? "Track Your Collections" 
              : "Discover Seed Origins"
            }
          </h2>
          <p className="text-primary-foreground/80 max-w-md text-lg">
            {role === "collector"
              ? "Scan, photograph, and geolocate every seed in your collection. Create digital passports with complete provenance."
              : "Scan any seed package to instantly access its complete history, origin, and collection details."
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
