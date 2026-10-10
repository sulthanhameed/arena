import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { supabase, isSupabaseConfigured, errorMessage } from "../lib/supabase";
import { authApi } from "../lib/api";

export interface User {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role?: "user" | "admin";
  joinedAt: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
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

/** Only used when VITE_SUPABASE_URL is absent (offline demo mode). */
const DEMO_KEY = "khang_demo_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const mounted = useRef(true);

  // ── Load the profile behind the current Supabase session ──
  const syncProfile = useCallback(async () => {
    try {
      const profile = await authApi.profile();
      if (!mounted.current) return;

      setUser(
        profile
          ? {
              id: profile.id,
              name: profile.name,
              email: profile.email ?? "",
              phone: profile.phone ?? undefined,
              role: profile.role,
              joinedAt: new Date().toISOString(),
            }
          : null,
      );
    } catch {
      if (mounted.current) setUser(null);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // Offline demo mode — no Supabase project configured
    if (!isSupabaseConfigured) {
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch {
        /* ignore */
      }
      setLoading(false);
      return () => {
        mounted.current = false;
      };
    }

    // Restore the session that supabase-js persisted, then keep it in sync.
    void (async () => {
      await syncProfile();
      if (mounted.current) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        void syncProfile();
      }
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [syncProfile]);

  const persistDemo = (u: User | null) => {
    if (u) localStorage.setItem(DEMO_KEY, JSON.stringify(u));
    else localStorage.removeItem(DEMO_KEY);
  };

  const openAuth = useCallback((mode: "login" | "signup" = "login") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (isSupabaseConfigured) {
        try {
          await authApi.login({ email, password });
          await syncProfile();
          setIsAuthOpen(false);
          return;
        } catch (err) {
          throw new Error(errorMessage(err, "Invalid email or password"));
        }
      }

      // ── Offline demo fallback ──
      await new Promise((r) => setTimeout(r, 400));
      const name = email.split("@")[0].replace(/[._-]/g, " ");
      const u: User = {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
        role: email.toLowerCase() === "admin@khang.com" ? "admin" : "user",
        joinedAt: new Date().toISOString(),
      };
      setUser(u);
      persistDemo(u);
      setIsAuthOpen(false);
    },
    [syncProfile],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      if (isSupabaseConfigured) {
        try {
          const data = await authApi.signup({ name, email, password, phone });

          // Email confirmations ON → no session yet, tell the user to check mail
          if (!data.session) {
            throw new Error(
              "Almost there — check your inbox to confirm your email, then sign in.",
            );
          }
          await syncProfile();
          setIsAuthOpen(false);
          return;
        } catch (err) {
          throw new Error(errorMessage(err, "Could not create the account"));
        }
      }

      // ── Offline demo fallback ──
      await new Promise((r) => setTimeout(r, 500));
      const u: User = { name, email, phone, joinedAt: new Date().toISOString() };
      setUser(u);
      persistDemo(u);
      setIsAuthOpen(false);
    },
    [syncProfile],
  );

  const logout = useCallback(() => {
    setUser(null);
    persistDemo(null);
    if (isSupabaseConfigured) void authApi.logout().catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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
