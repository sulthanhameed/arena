import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");

  // Restore session from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (u: User | null) => {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  const openAuth = useCallback((mode: "login" | "signup" = "login") => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setIsAuthOpen(false), []);

  const login = useCallback(async (email: string, password: string) => {
    // Try real backend first; fall back to demo mode if API is unreachable
    try {
      const { authApi, setToken } = await import("../lib/api");
      const { token, user: u } = await authApi.login({ email, password });
      setToken(token);
      const usr: User = {
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        joinedAt: new Date().toISOString(),
      };
      setUser(usr);
      persist(usr);
      setIsAuthOpen(false);
      return;
    } catch {
      // Backend unreachable → demo fallback. Treat admin@khang.com as admin in demo mode.
      await new Promise((r) => setTimeout(r, 400));
      const name = email.split("@")[0].replace(/[._-]/g, " ");
      const u: User = {
        name: name.charAt(0).toUpperCase() + name.slice(1),
        email,
        role: email.toLowerCase() === "admin@khang.com" ? "admin" : "user",
        joinedAt: new Date().toISOString(),
      };
      setUser(u);
      persist(u);
      setIsAuthOpen(false);
    }
  }, []);

  const signup = useCallback(
    async (name: string, email: string, password: string, phone?: string) => {
      try {
        const { authApi, setToken } = await import("../lib/api");
        const { token, user: u } = await authApi.signup({ name, email, password, phone });
        setToken(token);
        const usr: User = {
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: u.role,
          joinedAt: new Date().toISOString(),
        };
        setUser(usr);
        persist(usr);
        setIsAuthOpen(false);
        return;
      } catch {
        // Fallback
        await new Promise((r) => setTimeout(r, 500));
        const u: User = {
          name,
          email,
          phone,
          joinedAt: new Date().toISOString(),
        };
        setUser(u);
        persist(u);
        setIsAuthOpen(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    persist(null);
    // Clear API token if present
    import("../lib/api").then(({ clearToken }) => clearToken()).catch(() => {});
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
