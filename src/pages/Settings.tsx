import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Leaf, Moon, Sun, Bell, Shield, User, LogOut, Eye, EyeOff, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut, isLoading, isCollector } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const isBuyerSettings = location.pathname.includes('/buyer/');
  const backLink = isBuyerSettings ? "/buyer" : "/dashboard";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    const { error } = await api.updatePassword(newPassword);
    setChangingPassword(false);

    if (error) {
      toast({ title: "Failed to update password", description: error, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This will permanently delete all your data and cannot be undone."
    );
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "This is your last chance. All your seeds, history, and data will be permanently deleted. Continue?"
    );
    if (!doubleConfirm) return;

    setDeletingAccount(true);
    const { error } = await api.deleteAccount();
    setDeletingAccount(false);

    if (error) {
      toast({ title: "Failed to delete account", description: error, variant: "destructive" });
    } else {
      await signOut();
      navigate("/");
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link to={backLink}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="w-4 h-4 text-primary-foreground" />
              </div>
            </Link>
            <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Profile */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <User className="w-5 h-5" /> Profile
          </h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div>
              <Label className="text-muted-foreground text-sm">Name</Label>
              <p className="font-medium text-foreground">{profile?.full_name || "Not set"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Email</Label>
              <p className="font-medium text-foreground">{user?.email}</p>
            </div>
          </div>
        </section>

        <Separator />

        {/* Appearance */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            Appearance
          </h2>
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium text-foreground">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle dark theme</p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Security — Change Password */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5" /> Security
          </h2>
          <div className="bg-card rounded-xl border border-border p-4 space-y-4">
            {!showPasswordForm ? (
              <Button variant="outline" className="w-full" onClick={() => setShowPasswordForm(true)}>
                Change Password
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">New Password</Label>
                  <div className="relative">
                    <Input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowNew(!showNew)}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                  >
                    {changingPassword ? "Updating…" : "Update Password"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* Sign Out */}
        <section>
          <Button variant="destructive" className="w-full" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </section>

        <Separator />

        {/* Danger Zone - Delete Account */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Danger Zone
          </h2>
          <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deletingAccount ? "Deleting..." : "Delete Account"}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
