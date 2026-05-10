import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { api, setToken, clearToken } from "@/lib/api";

type AppRole = "admin" | "collector" | "buyer";

interface UserInfo {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: UserInfo | null;
  session: null; // kept for compat, always null in JWT mode
  profile: Profile | null;
  roles: AppRole[];
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string, role: AppRole, organizationName?: string, organizationId?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isCollector: boolean;
  isBuyer: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check for existing token
  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await api.me();
      if (error || !data) {
        clearToken();
        setIsLoading(false);
        return;
      }

      setUser(data.user);
      setProfile(data.profile);
      setRoles((data.roles as AppRole[]) || []);
      setIsLoading(false);
    };

    init();
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string, role: AppRole, organizationName?: string, organizationId?: string) => {
    try {
      // Clear any existing session first
      clearToken();
      setUser(null);
      setProfile(null);
      setRoles([]);

      const { data, error } = await api.signup(email, password, fullName, role, organizationName, organizationId);
      if (error || !data) throw new Error(error || "Signup failed");

      setToken(data.token);
      setUser(data.user);
      setProfile(data.profile || null);
      setRoles((data.roles as AppRole[]) || [role]);

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await api.login(email, password);
      if (error || !data) throw new Error(error || "Login failed");

      setToken(data.token);
      setUser(data.user);
      setProfile(data.profile || null);
      setRoles((data.roles as AppRole[]) || []);

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    clearToken();
    setUser(null);
    setProfile(null);
    setRoles([]);
  }, []);

  const value: AuthContextType = {
    user,
    session: null,
    profile,
    roles,
    isLoading,
    signUp,
    signIn,
    signOut,
    isCollector: roles.includes("collector") || roles.includes("admin"),
    isBuyer: roles.includes("buyer") || roles.includes("admin"),
    isAdmin: roles.includes("admin"),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
