import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  authApi,
  clearToken,
  isSupabaseConfigured,
  setToken,
  type KhangUser,
} from "../lib/api";

export interface User {
  name: string;
  email: string;
  phone?: string;
  role?: "user" | "admin";
  joinedAt: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthOpen: boolean;
  authMode: "login" | "signup";
  openAuth: (mode?: "login" | "signup") => void;
  closeAuth: () => void;
  setAuthMode: (mode: "login" | "signup") => void;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    name: string,
    email: string,
    password: string,
    phone?: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "khang_user";

function fromSupabaseUser(user: KhangUser): User {
  return {
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    joinedAt: user.createdAt || new Date().toISOString(),
  };
}

function demoUser(name: string, email: string, phone?: string): User {
  return {
    name,
    email,
    phone,
    role: email.toLowerCase() === "admin@khang.com" ? "admin" : "user",
    joinedAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  const persist = (value: User | null) => {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
  };

  // Supabase owns production session recovery. The local visual-demo fallback
  // is used only when no public Supabase project variables were supplied.
  useEffect(() => {
    let active = true;

    const restore = async () => {
      if (!isSupabaseConfigured) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw && active) setUser(JSON.parse(raw));
        } catch {
          // Ignore an invalid old demo value.
        }
        return;
      }

      try {
        const { user: sessionUser } = await authApi.me();
        if (!active) return;
        const restored = fromSupabaseUser(sessionUser);
        setUser(restored);
        persist(restored);
      } catch {
        // An expired session must never be treated as an authenticated demo user
        // once a real Supabase project is configured.
        clearToken();
        if (active) {
          setUser(null);
          persist(null);
        }
      }
    };

    void restore();
    return () => {
      active = false;
    };
  }, []);

  const openAuth = useCallback((mode: "login" | "signup" = "login") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

  const login = useCallback(async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      const { token, user: authenticatedUser } = await authApi.login({ email, password });
      setToken(token);
      const nextUser = fromSupabaseUser(authenticatedUser);
      setUser(nextUser);
      persist(nextUser);
      setIsAuthOpen(false);
      return;
    }

    // Keep the unauthenticated design preview usable before a developer adds
    // VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. This branch is never used
    // for a configured application.
    await new Promise((resolve) => setTimeout(resolve, 350));
    const displayName = email.split("@")[0].replace(/[._-]/g, " ");
    const nextUser = demoUser(
      displayName.charAt(0).toUpperCase() + displayName.slice(1),
      email,
    );
    setUser(nextUser);
    persist(nextUser);
    setIsAuthOpen(false);
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      if (isSupabaseConfigured) {
        const { token, user: authenticatedUser } = await authApi.signup({
          name,
          email,
          password,
          phone,
        });
        setToken(token);
        const nextUser = fromSupabaseUser(authenticatedUser);
        setUser(nextUser);
        persist(nextUser);
        setIsAuthOpen(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 350));
      const nextUser = demoUser(name, email, phone);
      setUser(nextUser);
      persist(nextUser);
      setIsAuthOpen(false);
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    persist(null);
    clearToken();
    if (isSupabaseConfigured) {
      void authApi.logout().catch(() => {
        // Local UI state is already safely cleared if the network is offline.
      });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthOpen,
        authMode,
        openAuth,
        closeAuth,
        setAuthMode,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
